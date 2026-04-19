from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime

from database import get_db
from models import User, RecurringExpenseConfig, Workspace, RecurringSegment
from schemas import (
    RecurringExpenseCreate, RecurringExpenseUpdate, RecurringExpenseResponse
)
from auth import get_current_user
from deps import get_current_workspace

router = APIRouter(prefix="/recurring-expenses", tags=["Recurring Expenses"])

@router.get("", response_model=List[RecurringExpenseResponse])
def list_recurring_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    return db.query(RecurringExpenseConfig).filter(
        RecurringExpenseConfig.workspace_id == workspace.id
    ).order_by(RecurringExpenseConfig.created_at.desc()).all()

@router.post("", response_model=RecurringExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_expense(
    data: RecurringExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    # Calculate initial next_generation_date
    next_date = data.start_date
    
    config = RecurringExpenseConfig(
        user_id=current_user.id,
        workspace_id=workspace.id,
        next_generation_date=next_date,
        **data.model_dump()
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config

@router.put("/{config_id}", response_model=RecurringExpenseResponse)
def update_recurring_expense(
    config_id: int,
    data: RecurringExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    config = db.query(RecurringExpenseConfig).filter(
        RecurringExpenseConfig.id == config_id,
        RecurringExpenseConfig.workspace_id == workspace.id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Recurring expense config not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(config, field, value)

    db.commit()
    db.refresh(config)
    return config

@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_expense(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    config = db.query(RecurringExpenseConfig).filter(
        RecurringExpenseConfig.id == config_id,
        RecurringExpenseConfig.workspace_id == workspace.id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Recurring expense config not found")
    
    db.delete(config)
    db.commit()
    return None
