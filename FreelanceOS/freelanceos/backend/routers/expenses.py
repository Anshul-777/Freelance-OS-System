from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, extract
from typing import List, Optional
from datetime import date, datetime
import json
from decimal import Decimal

from database import get_db
from models import User, Expense, ExpenseCategory, Workspace, AuditLog, RecurringExpenseConfig
from schemas import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, 
    RecurringExpenseCreate, RecurringExpenseResponse
)
from auth import get_current_user
from deps import get_current_workspace
from services.storage_service import storage_service
from services.currency_service import currency_service

router = APIRouter(prefix="/expenses", tags=["Expenses"])

def log_audit(db: Session, workspace_id: int, user_id: int, action: str, resource_type: str, resource_id: int, changes: dict = None):
    audit = AuditLog(
        workspace_id=workspace_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        changes=json.dumps(changes) if changes else None
    )
    db.add(audit)
    db.commit()

@router.get("", response_model=List[ExpenseResponse])
def list_expenses(
    category: Optional[ExpenseCategory] = None,
    project_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    vendor: Optional[str] = None,
    min_amount: Optional[Decimal] = None,
    max_amount: Optional[Decimal] = None,
    is_billable: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    query = db.query(Expense).options(
        joinedload(Expense.project)
    ).filter(
        Expense.workspace_id == workspace.id,
        Expense.deleted_at == None
    )

    if category:
        query = query.filter(Expense.category == category)
    if project_id:
        query = query.filter(Expense.project_id == project_id)
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    if vendor:
        query = query.filter(Expense.vendor.ilike(f"%{vendor}%"))
    if min_amount is not None:
        query = query.filter(Expense.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Expense.amount <= max_amount)
    if is_billable is not None:
        query = query.filter(Expense.is_billable == is_billable)
    if search:
        query = query.filter(or_(
            Expense.description.ilike(f"%{search}%"),
            Expense.vendor.ilike(f"%{search}%"),
            Expense.notes.ilike(f"%{search}%")
        ))

    return query.order_by(Expense.date.desc(), Expense.id.desc()).offset(skip).limit(limit).all()

@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    # Calculate converted amount if multi-currency
    converted_amount = None
    exchange_rate = None
    if expense_data.currency != current_user.currency:
        exchange_rate = await currency_service.get_rate(db, expense_data.currency, current_user.currency)
        converted_amount = (expense_data.amount * exchange_rate).quantize(Decimal("0.01"))
    else:
        converted_amount = expense_data.amount
        exchange_rate = Decimal("1.0")

    expense = Expense(
        user_id=current_user.id,
        workspace_id=workspace.id,
        converted_amount=converted_amount,
        exchange_rate=exchange_rate,
        **expense_data.model_dump()
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    log_audit(db, workspace.id, current_user.id, "CREATE", "EXPENSE", expense.id)
    
    return expense

@router.post("/upload", response_model=dict)
async def upload_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    # Validation: File size and type
    MAX_SIZE = 5 * 1024 * 1024 # 5MB
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    allowed_types = ["image/jpeg", "image/png", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, PNG, and PDF allowed.")

    # Upload to cloud
    import uuid
    file_ext = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    storage_path = f"workspace_{workspace.id}/user_{current_user.id}/receipts/{date.today().year}/{file_name}"
    
    from io import BytesIO
    result_path = await storage_service.upload_file(BytesIO(content), storage_path, file.content_type)
    
    return {"receipt_url": result_path}

@router.get("/summary")
def get_expense_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    # Default to current month
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        import calendar
        _, last_day = calendar.monthrange(date.today().year, date.today().month)
        end_date = date.today().replace(day=last_day)

    expenses = db.query(Expense).filter(
        Expense.workspace_id == workspace.id,
        Expense.date >= start_date,
        Expense.date <= end_date,
        Expense.deleted_at == None
    ).all()

    total = sum(e.amount for e in expenses)
    # Use converted amount for a unified total across currencies
    total_converted = sum(e.converted_amount for e in expenses if e.converted_amount) or total

    by_category = {}
    for e in expenses:
        cat = e.category.value
        by_category[cat] = by_category.get(cat, Decimal("0.0")) + e.amount

    return {
        "period": {"start": start_date, "end": end_date},
        "total": total,
        "total_converted": total_converted,
        "currency": current_user.currency,
        "by_category": [{"category": k, "amount": v} for k, v in by_category.items()],
        "count": len(expenses)
    }

@router.get("/export/csv")
def export_expenses_csv(
    category: Optional[ExpenseCategory] = None,
    project_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    from services.export_service import export_service
    from fastapi.responses import Response

    query = db.query(Expense).options(
        joinedload(Expense.project)
    ).filter(
        Expense.workspace_id == workspace.id,
        Expense.deleted_at == None
    )

    if category:
        query = query.filter(Expense.category == category)
    if project_id:
        query = query.filter(Expense.project_id == project_id)
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)

    expenses = query.order_by(Expense.date.desc()).all()
    csv_data = export_service.generate_expense_csv(expenses, workspace.name)
    
    filename = f"expenses_{date.today()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/pdf")
def export_expenses_pdf(
    category: Optional[ExpenseCategory] = None,
    project_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    from services.export_service import export_service
    from fastapi.responses import Response

    query = db.query(Expense).options(
        joinedload(Expense.project)
    ).filter(
        Expense.workspace_id == workspace.id,
        Expense.deleted_at == None
    )

    if category:
        query = query.filter(Expense.category == category)
    if project_id:
        query = query.filter(Expense.project_id == project_id)
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)

    expenses = query.order_by(Expense.date.desc()).all()
    pdf_data = export_service.generate_expense_pdf(expenses, current_user, workspace.name)
    
    filename = f"expenses_{date.today()}.pdf"
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    expense = db.query(Expense).options(
        joinedload(Expense.project)
    ).filter(
        Expense.id == expense_id,
        Expense.workspace_id == workspace.id,
        Expense.deleted_at == None
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Generate signed URL for receipt if it exists
    if expense.receipt_url:
        signed_url = await storage_service.get_signed_url(expense.receipt_url)
        # We temporarily inject this into the response but don't save to DB
        expense.receipt_url = signed_url

    return expense

@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    update_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.workspace_id == workspace.id,
        Expense.deleted_at == None
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Tracking changes for audit log
    old_data = {k: str(getattr(expense, k)) for k in update_data.model_dump(exclude_unset=True).keys()}
    
    # Recalculate converted amount if amount or currency changed
    if update_data.amount is not None or update_data.currency is not None:
        amount = update_data.amount if update_data.amount is not None else expense.amount
        currency = update_data.currency if update_data.currency is not None else expense.currency
        
        if currency != current_user.currency:
            expense.exchange_rate = await currency_service.get_rate(db, currency, current_user.currency)
            expense.converted_amount = (amount * expense.exchange_rate).quantize(Decimal("0.01"))
        else:
            expense.converted_amount = amount
            expense.exchange_rate = Decimal("1.0")

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)

    log_audit(db, workspace.id, current_user.id, "UPDATE", "EXPENSE", expense.id, old_data)
    
    return expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.workspace_id == workspace.id
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Soft delete
    expense.deleted_at = datetime.now()
    db.commit()

    log_audit(db, workspace.id, current_user.id, "DELETE", "EXPENSE", expense.id)
    return None
