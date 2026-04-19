from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from database import get_db
from models import (
    User, Project, Task, TimeEntry, ProjectStatus, TaskStatus, Workspace,
    Deliverable, ScopeChange, ProjectFile, Expense
)
from schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    DeliverableCreate, DeliverableResponse,
    ScopeChangeCreate, ScopeChangeResponse,
    ProjectFileCreate, ProjectFileResponse,
    ProjectDetailResponse
)
from auth import get_current_user
from deps import get_current_workspace

router = APIRouter(prefix="/projects", tags=["Projects"])


def calculate_project_health(project: Project, db: Session) -> dict:
    """Calculate comprehensive project health metrics including profit, risk, timeline."""
    # Total logged hours
    total_minutes = db.query(func.sum(TimeEntry.duration_minutes)).filter(
        TimeEntry.project_id == project.id
    ).scalar() or 0
    total_hours = Decimal(round(total_minutes / 60, 2))

    # Revenue calculation
    rate = project.hourly_rate or Decimal('95.0')
    total_earnings = Decimal(round(float(total_hours) * float(rate), 2))
    if project.budget and project.budget_type == "fixed":
        total_earnings = min(project.budget, total_earnings)

    # Expenses linked to project
    total_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.project_id == project.id
    ).scalar() or Decimal('0.0')
    total_expenses = Decimal(total_expenses)

    # Profit calculation
    profit = total_earnings - total_expenses

    # Task completion
    task_count = db.query(func.count(Task.id)).filter(
        Task.project_id == project.id
    ).scalar() or 0
    done_count = db.query(func.count(Task.id)).filter(
        Task.project_id == project.id,
        Task.status == TaskStatus.DONE
    ).scalar() or 0
    completion = Decimal(round((done_count / task_count) * 100, 1)) if task_count > 0 else Decimal('0.0')

    # Timeline metrics
    days_until_due = None
    is_overdue = False
    if project.due_date:
        today = date.today()
        days_until_due = (project.due_date - today).days
        is_overdue = days_until_due < 0

    # Risk calculation based on multiple factors
    risk_level = "low"
    if project.estimated_hours and total_hours > project.estimated_hours:
        risk_level = "high"  # Over estimated hours
    elif is_overdue:
        risk_level = "high"  # Overdue
    elif days_until_due and days_until_due <= 3 and completion < 50:
        risk_level = "high"  # Due soon with low completion
    elif days_until_due and days_until_due <= 7 and completion < 50:
        risk_level = "medium"  # Due in a week with low completion
    elif profit and profit < 0:
        risk_level = "high"  # Negative profit

    client_name = project.client.name if project.client else None

    return {
        "total_hours": float(total_hours),
        "total_earnings": float(total_earnings),
        "total_expenses": float(total_expenses),
        "profit_estimate": float(profit),
        "completion_percentage": float(completion),
        "task_count": task_count,
        "days_until_due": days_until_due,
        "is_overdue": is_overdue,
        "risk_level": risk_level,
        "client_name": client_name,
    }


def enrich_project(project: Project, db: Session) -> dict:
    """Calculate computed fields for a project (list view)."""
    health = calculate_project_health(project, db)
    return {
        "total_hours": health["total_hours"],
        "total_earnings": health["total_earnings"],
        "task_count": health["task_count"],
        "completion_percentage": health["completion_percentage"],
        "client_name": health["client_name"],
    }


@router.get("", response_model=List[ProjectListResponse])
def list_projects(
    status_filter: Optional[str] = None,
    client_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    query = db.query(Project).filter(
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).options(joinedload(Project.client))

    if status_filter:
        try:
            ps = ProjectStatus(status_filter)
            query = query.filter(Project.status == ps)
        except ValueError:
            pass

    if client_id:
        query = query.filter(Project.client_id == client_id)

    projects = query.order_by(Project.created_at.desc()).all()

    result = []
    for p in projects:
        enriched = enrich_project(p, db)
        p_dict = {
            "id": p.id,
            "user_id": p.user_id,
            "client_id": p.client_id,
            "name": p.name,
            "description": p.description,
            "status": p.status,
            "color": p.color,
            "budget": p.budget,
            "budget_type": p.budget_type,
            "hourly_rate": p.hourly_rate,
            "start_date": p.start_date,
            "due_date": p.due_date,
            "estimated_hours": p.estimated_hours,
            "is_billable": p.is_billable,
            "created_at": p.created_at,
            **enriched,
        }
        result.append(ProjectListResponse(**p_dict))

    return result


@router.post("", response_model=ProjectListResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    project = Project(
        user_id=current_user.id,
        workspace_id=workspace.id,
        **project_data.model_dump()
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    enriched = enrich_project(project, db)
    return ProjectListResponse(
        id=project.id,
        user_id=project.user_id,
        client_id=project.client_id,
        name=project.name,
        description=project.description,
        status=project.status,
        color=project.color,
        budget=project.budget,
        budget_type=project.budget_type,
        hourly_rate=project.hourly_rate,
        start_date=project.start_date,
        due_date=project.due_date,
        estimated_hours=project.estimated_hours,
        is_billable=project.is_billable,
        created_at=project.created_at,
        **enriched,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    project = db.query(Project).options(
        joinedload(Project.tasks),
        joinedload(Project.client)
    ).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    enriched = enrich_project(project, db)
    tasks = [TaskResponse.model_validate(t) for t in sorted(project.tasks, key=lambda x: x.position or 0)]

    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        client_id=project.client_id,
        name=project.name,
        description=project.description,
        status=project.status,
        color=project.color,
        budget=project.budget,
        budget_type=project.budget_type,
        hourly_rate=project.hourly_rate,
        start_date=project.start_date,
        due_date=project.due_date,
        estimated_hours=project.estimated_hours,
        is_billable=project.is_billable,
        created_at=project.created_at,
        tasks=tasks,
        **enriched,
    )


@router.put("/{project_id}", response_model=ProjectListResponse)
def update_project(
    project_id: int,
    update_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    enriched = enrich_project(project, db)

    return ProjectListResponse(
        id=project.id,
        user_id=project.user_id,
        client_id=project.client_id,
        name=project.name,
        description=project.description,
        status=project.status,
        color=project.color,
        budget=project.budget,
        budget_type=project.budget_type,
        hourly_rate=project.hourly_rate,
        start_date=project.start_date,
        due_date=project.due_date,
        estimated_hours=project.estimated_hours,
        is_billable=project.is_billable,
        created_at=project.created_at,
        **enriched,
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()


# ─── Task Routes ──────────────────────────────────────────────────────────────

@router.get("/{project_id}/tasks", response_model=List[TaskResponse])
def list_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = db.query(Task).filter(
        Task.project_id == project_id
    ).order_by(Task.position.asc(), Task.created_at.asc()).all()

    return [TaskResponse.model_validate(t) for t in tasks]


@router.post("/{project_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task_dict = task_data.model_dump()
    task_dict["project_id"] = project_id
    task_dict["workspace_id"] = workspace.id
    task = Task(**task_dict)
    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskResponse.model_validate(task)


@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    update_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).join(Project).filter(
        Task.id == task_id,
        Project.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return TaskResponse.model_validate(task)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).join(Project).filter(
        Task.id == task_id,
        Project.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


# ─── Project Detail Endpoint (Rich Data) ───────────────────────────────────

@router.get("/{project_id}/detail", response_model=ProjectDetailResponse)
def get_project_detail(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Get comprehensive project data with all relationships."""
    project = db.query(Project).options(
        joinedload(Project.tasks),
        joinedload(Project.deliverables),
        joinedload(Project.scope_changes),
        joinedload(Project.files),
        joinedload(Project.client)
    ).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    health = calculate_project_health(project, db)
    client_name = project.client.name if project.client else None

    tasks = [TaskResponse.model_validate(t) for t in sorted(project.tasks, key=lambda x: x.position or 0)]
    deliverables = [DeliverableResponse.model_validate(d) for d in project.deliverables]
    scope_changes = [ScopeChangeResponse.model_validate(s) for s in project.scope_changes]
    files = [ProjectFileResponse.model_validate(f) for f in project.files]

    return ProjectDetailResponse(
        id=project.id,
        user_id=project.user_id,
        workspace_id=project.workspace_id,
        client_id=project.client_id,
        client_name=client_name,
        name=project.name,
        description=project.description,
        status=project.status,
        color=project.color,
        budget=project.budget,
        budget_type=project.budget_type,
        hourly_rate=project.hourly_rate,
        start_date=project.start_date,
        due_date=project.due_date,
        estimated_hours=project.estimated_hours,
        is_billable=project.is_billable,
        created_at=project.created_at,
        updated_at=project.updated_at,
        tasks=tasks,
        deliverables=deliverables,
        scope_changes=scope_changes,
        files=files,
        total_hours=health["total_hours"],
        total_earnings=health["total_earnings"],
        total_expenses=health["total_expenses"],
        profit_estimate=health["profit_estimate"],
        completion_percentage=health["completion_percentage"],
        days_until_due=health["days_until_due"],
        is_overdue=health["is_overdue"],
        risk_level=health["risk_level"],
    )


# ─── Deliverables Management ───────────────────────────────────────────────

@router.post("/{project_id}/deliverables", response_model=DeliverableResponse, status_code=status.HTTP_201_CREATED)
def create_deliverable(
    project_id: int,
    deliverable_data: DeliverableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Create a new deliverable for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    deliverable = Deliverable(
        workspace_id=workspace.id,
        **deliverable_data.model_dump()
    )
    db.add(deliverable)
    db.commit()
    db.refresh(deliverable)
    return DeliverableResponse.model_validate(deliverable)


@router.put("/{project_id}/deliverables/{deliverable_id}", response_model=DeliverableResponse)
def update_deliverable(
    project_id: int,
    deliverable_id: int,
    update_data: DeliverableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Update a deliverable."""
    deliverable = db.query(Deliverable).join(Project).filter(
        Deliverable.id == deliverable_id,
        Deliverable.project_id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    for field, value in update_data.model_dump(exclude={"project_id"}).items():
        setattr(deliverable, field, value)
    db.commit()
    db.refresh(deliverable)
    return DeliverableResponse.model_validate(deliverable)


@router.delete("/{project_id}/deliverables/{deliverable_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deliverable(
    project_id: int,
    deliverable_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Delete a deliverable."""
    deliverable = db.query(Deliverable).join(Project).filter(
        Deliverable.id == deliverable_id,
        Deliverable.project_id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    db.delete(deliverable)
    db.commit()


# ─── Scope Changes Management ──────────────────────────────────────────────

@router.post("/{project_id}/scope-changes", response_model=ScopeChangeResponse, status_code=status.HTTP_201_CREATED)
def create_scope_change(
    project_id: int,
    scope_data: ScopeChangeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Log a scope change or revision for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    scope_change = ScopeChange(
        workspace_id=workspace.id,
        **scope_data.model_dump()
    )
    db.add(scope_change)
    db.commit()
    db.refresh(scope_change)
    return ScopeChangeResponse.model_validate(scope_change)


@router.put("/{project_id}/scope-changes/{change_id}", response_model=ScopeChangeResponse)
def update_scope_change(
    project_id: int,
    change_id: int,
    update_data: ScopeChangeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Update a scope change."""
    scope_change = db.query(ScopeChange).join(Project).filter(
        ScopeChange.id == change_id,
        ScopeChange.project_id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()
    if not scope_change:
        raise HTTPException(status_code=404, detail="Scope change not found")

    for field, value in update_data.model_dump(exclude={"project_id"}).items():
        setattr(scope_change, field, value)
    db.commit()
    db.refresh(scope_change)
    return ScopeChangeResponse.model_validate(scope_change)


@router.delete("/{project_id}/scope-changes/{change_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scope_change(
    project_id: int,
    change_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Delete a scope change."""
    scope_change = db.query(ScopeChange).join(Project).filter(
        ScopeChange.id == change_id,
        ScopeChange.project_id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()
    if not scope_change:
        raise HTTPException(status_code=404, detail="Scope change not found")
    db.delete(scope_change)
    db.commit()


# ─── Project Files Management ──────────────────────────────────────────────

@router.post("/{project_id}/files", response_model=ProjectFileResponse, status_code=status.HTTP_201_CREATED)
def upload_project_file(
    project_id: int,
    file_data: ProjectFileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Upload or attach a file to a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_file = ProjectFile(
        workspace_id=workspace.id,
        **file_data.model_dump()
    )
    db.add(project_file)
    db.commit()
    db.refresh(project_file)
    return ProjectFileResponse.model_validate(project_file)


@router.get("/{project_id}/files", response_model=List[ProjectFileResponse])
def list_project_files(
    project_id: int,
    file_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """List all files for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = db.query(ProjectFile).filter(ProjectFile.project_id == project_id)
    if file_type:
        query = query.filter(ProjectFile.file_type == file_type)

    files = query.order_by(ProjectFile.created_at.desc()).all()
    return [ProjectFileResponse.model_validate(f) for f in files]


@router.delete("/{project_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_file(
    project_id: int,
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Delete a project file."""
    project_file = db.query(ProjectFile).join(Project).filter(
        ProjectFile.id == file_id,
        ProjectFile.project_id == project_id,
        Project.user_id == current_user.id,
        Project.workspace_id == workspace.id
    ).first()
    if not project_file:
        raise HTTPException(status_code=404, detail="File not found")
    db.delete(project_file)
    db.commit()
