from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date
from decimal import Decimal
import traceback

from database import get_db
from models import (
    User, Invoice, Expense, TimeEntry, Project,
    Client, InvoiceStatus, ProjectStatus, Workspace
)
from schemas import AnalyticsResponse
from auth import get_current_user
from deps import get_current_workspace
import calendar

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def safe_float(value) -> float:
    """Safely convert any DB aggregate result (Decimal, int, float, None) to float."""
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    try:
        today = date.today()
        target_year = year or today.year

        year_start = date(target_year, 1, 1)
        year_end   = date(target_year, 12, 31)

        # ── Revenue by Month ──────────────────────────────────────────────────
        revenue_by_month = []
        for m in range(1, 13):
            m_start    = date(target_year, m, 1)
            m_end      = date(target_year, m, calendar.monthrange(target_year, m)[1])
            month_name = date(target_year, m, 1).strftime("%b")

            rev = safe_float(
                db.query(func.sum(Invoice.total)).filter(
                    Invoice.user_id == current_user.id,
                    Invoice.workspace_id == workspace.id,
                    Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE, InvoiceStatus.PAID]),
                    Invoice.issue_date >= m_start,
                    Invoice.issue_date <= m_end,
                ).scalar()
            )

            exp = safe_float(
                db.query(func.sum(Expense.amount)).filter(
                    Expense.user_id == current_user.id,
                    Expense.workspace_id == workspace.id,
                    Expense.date >= m_start,
                    Expense.date <= m_end,
                ).scalar()
            )

            hours_raw = db.query(func.sum(TimeEntry.duration_minutes)).filter(
                TimeEntry.user_id == current_user.id,
                TimeEntry.workspace_id == workspace.id,
                TimeEntry.date >= m_start,
                TimeEntry.date <= m_end,
            ).scalar() or 0

            revenue_by_month.append({
                "month":    month_name,
                "month_num": m,
                "revenue":  rev,
                "expenses": exp,
                "profit":   round(rev - exp, 2),
                "hours":    round(safe_float(hours_raw) / 60.0, 1),
            })

        # ── Revenue by Client ─────────────────────────────────────────────────
        clients = db.query(Client).filter(
            Client.user_id == current_user.id,
            Client.workspace_id == workspace.id
        ).all()

        revenue_by_client = []
        for c in clients:
            rev = safe_float(
                db.query(func.sum(Invoice.total)).filter(
                    Invoice.client_id == c.id,
                    Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE, InvoiceStatus.PAID]),
                    Invoice.issue_date >= year_start,
                    Invoice.issue_date <= year_end,
                ).scalar()
            )
            if rev > 0:
                revenue_by_client.append({
                    "client_id":   c.id,
                    "client_name": c.name,
                    "company":     c.company or "",
                    "revenue":     rev,
                })
        revenue_by_client.sort(key=lambda x: x["revenue"], reverse=True)

        # ── Time by Project ───────────────────────────────────────────────────
        projects = db.query(Project).filter(
            Project.user_id == current_user.id,
            Project.workspace_id == workspace.id
        ).all()

        time_by_project = []
        for p in projects:
            mins_raw = db.query(func.sum(TimeEntry.duration_minutes)).filter(
                TimeEntry.project_id == p.id,
                TimeEntry.date >= year_start,
                TimeEntry.date <= year_end,
            ).scalar() or 0
            mins = int(safe_float(mins_raw))
            if mins > 0:
                time_by_project.append({
                    "project_id":   p.id,
                    "project_name": p.name,
                    "color":        p.color or "#4F46E5",
                    "hours":        round(mins / 60.0, 1),
                    "minutes":      mins,
                })
        time_by_project.sort(key=lambda x: x["hours"], reverse=True)

        # ── Expenses by Category ──────────────────────────────────────────────
        from models import ExpenseCategory
        expenses_by_category = []
        for cat in ExpenseCategory:
            total = safe_float(
                db.query(func.sum(Expense.amount)).filter(
                    Expense.user_id == current_user.id,
                    Expense.workspace_id == workspace.id,
                    Expense.category == cat,
                    Expense.date >= year_start,
                    Expense.date <= year_end,
                ).scalar()
            )
            if total > 0:
                expenses_by_category.append({
                    "category": cat.value,
                    "label":    cat.value.replace("_", " ").title(),
                    "amount":   total,
                })
        expenses_by_category.sort(key=lambda x: x["amount"], reverse=True)

        # ── Invoice Status Breakdown ───────────────────────────────────────────
        invoice_status_breakdown = []
        status_colors = {
            "draft":     "#94A3B8",
            "sent":      "#3B82F6",
            "viewed":    "#8B5CF6",
            "paid":      "#10B981",
            "overdue":   "#EF4444",
            "cancelled": "#6B7280",
        }
        for inv_status in InvoiceStatus:
            count = db.query(func.count(Invoice.id)).filter(
                Invoice.user_id == current_user.id,
                Invoice.workspace_id == workspace.id,
                Invoice.status == inv_status,
                Invoice.issue_date >= year_start,
                Invoice.issue_date <= year_end,
            ).scalar() or 0

            total_amount = safe_float(
                db.query(func.sum(Invoice.total)).filter(
                    Invoice.user_id == current_user.id,
                    Invoice.workspace_id == workspace.id,
                    Invoice.status == inv_status,
                    Invoice.issue_date >= year_start,
                    Invoice.issue_date <= year_end,
                ).scalar()
            )
            if count > 0:
                invoice_status_breakdown.append({
                    "status": inv_status.value,
                    "label":  inv_status.value.title(),
                    "count":  int(count),
                    "total":  total_amount,
                    "color":  status_colors.get(inv_status.value, "#94A3B8"),
                })

        # ── KPI Calculations ───────────────────────────────────────────────────
        total_minutes = safe_float(
            db.query(func.sum(TimeEntry.duration_minutes)).filter(
                TimeEntry.user_id == current_user.id,
                TimeEntry.date >= year_start,
                TimeEntry.date <= year_end,
            ).scalar()
        )

        billable_minutes = safe_float(
            db.query(func.sum(TimeEntry.duration_minutes)).filter(
                TimeEntry.user_id == current_user.id,
                TimeEntry.date >= year_start,
                TimeEntry.date <= year_end,
                TimeEntry.is_billable == True,
            ).scalar()
        )

        utilization_rate = round((billable_minutes / total_minutes) * 100.0, 1) if total_minutes > 0 else 0.0

        # Average project value — FIX: total_project_revenue must be float throughout
        completed_projects = db.query(Project).filter(
            Project.user_id == current_user.id,
            Project.status == ProjectStatus.COMPLETED,
        ).all()

        avg_project_value = 0.0
        if completed_projects:
            total_project_revenue = 0.0
            for p in completed_projects:
                rev = safe_float(  # ← previously raised TypeError: float + Decimal
                    db.query(func.sum(Invoice.total)).filter(
                        Invoice.project_id == p.id,
                        Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE, InvoiceStatus.PAID]),
                    ).scalar()
                )
                total_project_revenue += rev
            avg_project_value = round(total_project_revenue / len(completed_projects), 2)

        # Average hourly rate
        avg_rate_result = safe_float(
            db.query(func.avg(TimeEntry.hourly_rate)).filter(
                TimeEntry.user_id == current_user.id,
                TimeEntry.is_billable == True,
                TimeEntry.hourly_rate > 0,
                TimeEntry.date >= year_start,
                TimeEntry.date <= year_end,
            ).scalar()
        )

        # YTD totals
        total_revenue_ytd = safe_float(
            db.query(func.sum(Invoice.total)).filter(
                Invoice.user_id == current_user.id,
                Invoice.workspace_id == workspace.id,
                Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE, InvoiceStatus.PAID]),
                Invoice.issue_date >= year_start,
                Invoice.issue_date <= year_end,
            ).scalar()
        )

        total_expenses_ytd = safe_float(
            db.query(func.sum(Expense.amount)).filter(
                Expense.user_id == current_user.id,
                Expense.workspace_id == workspace.id,
                Expense.date >= year_start,
                Expense.date <= year_end,
            ).scalar()
        )

        return AnalyticsResponse(
            revenue_by_month=revenue_by_month,
            revenue_by_client=revenue_by_client,
            time_by_project=time_by_project,
            expenses_by_category=expenses_by_category,
            invoice_status_breakdown=invoice_status_breakdown,
            utilization_rate=utilization_rate,
            avg_project_value=avg_project_value,
            avg_hourly_rate=round(avg_rate_result, 2),
            total_revenue_ytd=total_revenue_ytd,
            total_expenses_ytd=total_expenses_ytd,
            net_profit_ytd=round(float(total_revenue_ytd or 0) - float(total_expenses_ytd or 0), 2),
        )

    except Exception as exc:
        # Log the full traceback so the exact line is always visible in server logs
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Analytics query failed: {type(exc).__name__}: {exc}"
        )
