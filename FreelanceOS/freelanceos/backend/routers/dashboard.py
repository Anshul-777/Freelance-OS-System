from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from decimal import Decimal
import traceback
import calendar

from database import get_db
from models import (
    User, Project, TimeEntry, Invoice, Expense,
    Client, InvoiceStatus, Workspace
)
from schemas import (
    DashboardResponse, DashboardStats,
    RevenueDataPoint, ActivityItem
)
from auth import get_current_user
from deps import get_current_workspace

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def safe_float(value) -> float:
    """Safely convert any DB aggregate result (Decimal, int, float, None) to float."""
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def get_month_range(year: int, month: int):
    first_day = date(year, month, 1)
    last_day  = date(year, month, calendar.monthrange(year, month)[1])
    return first_day, last_day


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    try:
        today = date.today()
        this_month_start, this_month_end = get_month_range(today.year, today.month)

        # Last month range
        if today.month == 1:
            last_month_start, last_month_end = get_month_range(today.year - 1, 12)
        else:
            last_month_start, last_month_end = get_month_range(today.year, today.month - 1)

        # ── Revenue this month ──────────────────────────────────────────────
        paid_this_month = safe_float(
            db.query(func.sum(Invoice.total)).filter(
                Invoice.user_id == current_user.id,
                Invoice.workspace_id == workspace.id,
                Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE, InvoiceStatus.PAID]),
                Invoice.issue_date >= this_month_start,
                Invoice.issue_date <= this_month_end,
            ).scalar()
        )

        paid_last_month = safe_float(
            db.query(func.sum(Invoice.total)).filter(
                Invoice.user_id == current_user.id,
                Invoice.workspace_id == workspace.id,
                Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE, InvoiceStatus.PAID]),
                Invoice.issue_date >= last_month_start,
                Invoice.issue_date <= last_month_end,
            ).scalar()
        )

        revenue_change = 0.0
        if paid_last_month > 0:
            revenue_change = round(
                ((paid_this_month - paid_last_month) / paid_last_month) * 100.0, 1
            )

        # ── Hours this month ────────────────────────────────────────────────
        hours_this_raw = safe_float(
            db.query(func.sum(TimeEntry.duration_minutes)).filter(
                TimeEntry.user_id == current_user.id,
                TimeEntry.workspace_id == workspace.id,
                TimeEntry.date >= this_month_start,
                TimeEntry.date <= this_month_end,
            ).scalar()
        )
        hours_this_month = round(hours_this_raw / 60.0, 1)

        hours_last_raw = safe_float(
            db.query(func.sum(TimeEntry.duration_minutes)).filter(
                TimeEntry.user_id == current_user.id,
                TimeEntry.workspace_id == workspace.id,
                TimeEntry.date >= last_month_start,
                TimeEntry.date <= last_month_end,
            ).scalar()
        )
        hours_last_month = round(hours_last_raw / 60.0, 1)

        hours_change = 0.0
        if hours_last_month > 0:
            hours_change = round(
                ((hours_this_month - hours_last_month) / hours_last_month) * 100.0, 1
            )

        # ── Active projects ─────────────────────────────────────────────────
        from models import ProjectStatus
        active_projects = int(
            db.query(func.count(Project.id)).filter(
                Project.user_id == current_user.id,
                Project.workspace_id == workspace.id,
                Project.status == ProjectStatus.ACTIVE,
            ).scalar() or 0
        )

        # ── Total active clients ────────────────────────────────────────────
        total_clients = int(
            db.query(func.count(Client.id)).filter(
                Client.user_id == current_user.id,
                Client.workspace_id == workspace.id,
                Client.is_active == True,
            ).scalar() or 0
        )

        # ── Outstanding invoices ────────────────────────────────────────────
        outstanding = safe_float(
            db.query(func.sum(Invoice.total)).filter(
                Invoice.user_id == current_user.id,
                Invoice.workspace_id == workspace.id,
                Invoice.status.in_([
                    InvoiceStatus.SENT,
                    InvoiceStatus.VIEWED,
                    InvoiceStatus.OVERDUE,
                ]),
            ).scalar()
        )

        outstanding_count = int(
            db.query(func.count(Invoice.id)).filter(
                Invoice.user_id == current_user.id,
                Invoice.workspace_id == workspace.id,
                Invoice.status.in_([
                    InvoiceStatus.SENT,
                    InvoiceStatus.VIEWED,
                    InvoiceStatus.OVERDUE,
                ]),
            ).scalar() or 0
        )

        # ── Expenses this month ─────────────────────────────────────────────
        expenses_this_month = safe_float(
            db.query(func.sum(Expense.amount)).filter(
                Expense.user_id == current_user.id,
                Expense.workspace_id == workspace.id,
                Expense.date >= this_month_start,
                Expense.date <= this_month_end,
            ).scalar()
        )

        net_income = round(paid_this_month - expenses_this_month, 2)

        stats = DashboardStats(
            total_revenue_this_month=paid_this_month,
            total_revenue_last_month=paid_last_month,
            revenue_change_pct=revenue_change,
            total_hours_this_month=hours_this_month,
            total_hours_last_month=hours_last_month,
            hours_change_pct=hours_change,
            active_projects=active_projects,
            total_clients=total_clients,
            outstanding_invoices=outstanding,
            outstanding_count=outstanding_count,
            total_expenses_this_month=expenses_this_month,
            net_income_this_month=net_income,
        )

        # ── Revenue chart (last 6 months) ───────────────────────────────────
        revenue_chart = []
        for i in range(5, -1, -1):
            offset = today.month - i
            if offset <= 0:
                m = offset + 12
                y = today.year - 1
            else:
                m = offset
                y = today.year
            m_start, m_end = get_month_range(y, m)

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

            revenue_chart.append(RevenueDataPoint(
                month=date(y, m, 1).strftime("%b"),
                revenue=rev,
                expenses=exp,
                profit=round(rev - exp, 2),
            ))

        # ── Recent Activity ─────────────────────────────────────────────────
        activity = []

        recent_entries = (
            db.query(TimeEntry)
            .filter(
                TimeEntry.user_id == current_user.id,
                TimeEntry.workspace_id == workspace.id,
            )
            .order_by(TimeEntry.created_at.desc())
            .limit(5)
            .all()
        )

        for te in recent_entries:
            hours = round(safe_float(te.duration_minutes) / 60.0, 1)
            proj_name = te.project.name if te.project else "No project"
            earnings  = safe_float(te.duration_minutes) / 60.0 * safe_float(te.hourly_rate)
            activity.append(ActivityItem(
                id=te.id,
                type="time_entry",
                description=f"Logged {hours}h on {proj_name}",
                amount=round(earnings, 2),
                date=te.date.strftime("%b %d") if te.date else "",
                color="#4F46E5",
            ))

        recent_invoices = (
            db.query(Invoice)
            .filter(
                Invoice.user_id == current_user.id,
                Invoice.workspace_id == workspace.id,
            )
            .order_by(Invoice.created_at.desc())
            .limit(5)
            .all()
        )

        for inv in recent_invoices:
            status_text = inv.status.value.title()
            client_name = inv.client.name if inv.client else "No client"
            activity.append(ActivityItem(
                id=inv.id,
                type="invoice",
                description=f"Invoice {inv.invoice_number} ({status_text}) — {client_name}",
                amount=safe_float(inv.total),
                date=inv.issue_date.strftime("%b %d") if inv.issue_date else "",
                color="#10B981" if inv.status == InvoiceStatus.PAID else "#F59E0B",
            ))

        activity = activity[:10]

        # ── Top Clients ─────────────────────────────────────────────────────
        clients = db.query(Client).filter(
            Client.user_id == current_user.id,
            Client.workspace_id == workspace.id,
        ).all()

        top_clients = []
        for c in clients:
            total_paid = safe_float(
                db.query(func.sum(Invoice.total)).filter(
                    Invoice.client_id == c.id,
                    Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE, InvoiceStatus.PAID]),
                ).scalar()
            )
            total_projects = int(
                db.query(func.count(Project.id)).filter(
                    Project.client_id == c.id
                ).scalar() or 0
            )
            top_clients.append({
                "id":             c.id,
                "name":           c.name,
                "company":        c.company or "",
                "total_paid":     total_paid,
                "total_projects": total_projects,
            })
        top_clients.sort(key=lambda x: x["total_paid"], reverse=True)
        top_clients = top_clients[:5]

        # ── Upcoming Deadlines ──────────────────────────────────────────────
        from models import ProjectStatus as PS
        upcoming = (
            db.query(Project)
            .filter(
                Project.user_id == current_user.id,
                Project.workspace_id == workspace.id,
                Project.due_date >= today,
                Project.due_date <= today + timedelta(days=30),
                Project.status.in_([PS.ACTIVE, PS.ON_HOLD]),
            )
            .order_by(Project.due_date.asc())
            .limit(5)
            .all()
        )

        upcoming_deadlines = []
        for p in upcoming:
            days_left = (p.due_date - today).days
            upcoming_deadlines.append({
                "id":          p.id,
                "name":        p.name,
                "due_date":    p.due_date.strftime("%b %d, %Y"),
                "days_left":   days_left,
                "status":      p.status.value,
                "color":       p.color or "#4F46E5",
                "client_name": p.client.name if p.client else "Personal",
            })

        return DashboardResponse(
            stats=stats,
            revenue_chart=revenue_chart,
            recent_activity=activity,
            top_clients=top_clients,
            upcoming_deadlines=upcoming_deadlines,
        )

    except Exception as exc:
        # Always log full traceback so the exact failure is visible in server output
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Dashboard query failed: {type(exc).__name__}: {exc}"
        )
