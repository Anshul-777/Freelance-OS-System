from sqlalchemy.orm import Session
from datetime import date, timedelta
from models import RecurringExpenseConfig, Expense, RecurringSegment, Workspace, User
from database import get_db
from services.currency_service import currency_service
import logging

logger = logging.getLogger(__name__)

async def generate_scheduled_expenses():
    """Background job to generate expenses from active recurring configs."""
    logger.info("Running scheduled expense generation job...")
    
    # We need a generator for DB sessions as it's not a request context
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        today = date.today()
        configs = db.query(RecurringExpenseConfig).filter(
            RecurringExpenseConfig.is_active == True,
            RecurringExpenseConfig.next_generation_date <= today
        ).all()

        for config in configs:
            try:
                # 1. Create the Expense instance
                # Calculate converted amount based on user's base currency
                user = db.query(User).filter(User.id == config.user_id).first()
                converted_amount = config.amount
                exchange_rate = 1.0
                
                if user and config.currency != user.currency:
                    exchange_rate = await currency_service.get_rate(db, config.currency, user.currency)
                    converted_amount = config.amount * exchange_rate

                expense = Expense(
                    workspace_id=config.workspace_id,
                    user_id=config.user_id,
                    title=f"[Recurring] {config.title}",
                    description=f"Auto-generated from recurring config: {config.title}",
                    amount=config.amount,
                    currency=config.currency,
                    category=config.category,
                    date=today,
                    is_recurring=True,
                    parent_recurring_id=config.id,
                    converted_amount=converted_amount,
                    exchange_rate=exchange_rate
                )
                db.add(expense)

                # 2. Update config's next_generation_date
                config.last_generated_date = today
                if config.interval == RecurringSegment.WEEKLY:
                    config.next_generation_date = today + timedelta(weeks=1)
                elif config.interval == RecurringSegment.MONTHLY:
                    # Safe month end handling (simplistic: +30 days or handle month roll)
                    import calendar
                    year, month = today.year, today.month
                    days_in_month = calendar.monthrange(year, month)[1]
                    config.next_generation_date = today + timedelta(days=days_in_month)
                elif config.interval == RecurringSegment.YEARLY:
                    import copy
                    try:
                        config.next_generation_date = today.replace(year=today.year + 1)
                    except ValueError: # Leap year Feb 29
                        config.next_generation_date = today + timedelta(days=365)

                # Deactivate if end_date reached
                if config.end_date and config.next_generation_date > config.end_date:
                    config.is_active = False

                db.commit()
                logger.info(f"Generated expense for config ID {config.id}")

            except Exception as e:
                db.rollback()
                logger.error(f"Error generating expense for config {config.id}: {e}")

    finally:
        db.close()

async def check_spending_spikes():
    """Analyze spending and log audit alerts for spikes > 50% compared to last month."""
    from database import SessionLocal
    from models import Workspace, Expense, AuditLog
    from sqlalchemy import func
    import json
    
    db = SessionLocal()
    try:
        today = date.today()
        first_of_this_month = today.replace(day=1)
        
        last_month_end = first_of_this_month - timedelta(days=1)
        first_of_last_month = last_month_end.replace(day=1)
        
        workspaces = db.query(Workspace).all()
        for ws in workspaces:
            # Current Month Total (Converted)
            current_total = db.query(func.sum(Expense.converted_amount)).filter(
                Expense.workspace_id == ws.id,
                Expense.date >= first_of_this_month,
                Expense.deleted_at == None
            ).scalar() or 0
            
            # Last Month Total (Converted)
            last_total = db.query(func.sum(Expense.converted_amount)).filter(
                Expense.workspace_id == ws.id,
                Expense.date >= first_of_last_month,
                Expense.date <= last_month_end,
                Expense.deleted_at == None
            ).scalar() or 0
            
            # Spike threshold: 50% increase AND last month > 50.00 (to ignore tiny spikes)
            if last_total > 50 and current_total > (last_total * 1.5):
                logger.warning(f"SPIKE DETECTED in workspace {ws.id}: {current_total} vs {last_total}")
                
                # Create Audit Alert
                alert = AuditLog(
                    workspace_id=ws.id,
                    action="SPIKE_ALERT",
                    resource_type="BUDGET",
                    resource_id=ws.id,
                    changes=json.dumps({
                        "message": "Spending increased by over 50% compared to last month.",
                        "current_month": float(current_total),
                        "previous_month": float(last_total),
                        "increase_pct": float(((current_total / last_total) - 1) * 100)
                    })
                )
                db.add(alert)
        
        db.commit()
    except Exception as e:
        logger.error(f"Error in check_spending_spikes: {e}")
        db.rollback()
    finally:
        db.close()
