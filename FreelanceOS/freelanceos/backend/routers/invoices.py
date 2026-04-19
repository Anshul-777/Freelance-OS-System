"""Advanced invoices router with email tracking, time entry integration, and analytics."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from database import get_db
from models import (
    User, Invoice, InvoiceItem, InvoiceEvent, Client, Project,
    InvoiceStatus, Workspace, TimeEntry, Notification
)
from schemas import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceDetailResponse,
    InvoiceEventResponse, TimeEntryResponse
)
from auth import get_current_user
from deps import get_current_workspace
from services.email_service import send_invoice_email
from services.pdf_service import generate_invoice_pdf
import io
import json

router = APIRouter(prefix="/invoices", tags=["Invoices"])


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

def enrich_invoice(inv: Invoice) -> dict:
    """Add client and project names to invoice."""
    client_name = inv.client.name if inv.client else None
    project_name = inv.project.name if inv.project else None
    return {"client_name": client_name, "project_name": project_name}


def get_next_invoice_number(db: Session, user: User) -> str:
    """Generate next invoice number — always higher than any existing one for this user/prefix."""
    prefix = user.invoice_prefix or "INV"
    existing = (
        db.query(Invoice)
        .filter(Invoice.user_id == user.id, Invoice.invoice_number.like(f"{prefix}-%"))
        .all()
    )
    max_num = 0
    for inv in existing:
        try:
            num = int(inv.invoice_number.rsplit("-", 1)[-1])
            if num > max_num:
                max_num = num
        except (ValueError, IndexError):
            pass
    return f"{prefix}-{str(max_num + 1).zfill(4)}"


def build_invoice_response(invoice: Invoice) -> InvoiceResponse:
    """Build invoice response from model."""
    enriched = enrich_invoice(invoice)
    items = [
        {
            "id": item.id,
            "invoice_id": item.invoice_id,
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "amount": item.amount,
        }
        for item in invoice.items
    ]
    return InvoiceResponse(
        id=invoice.id,
        user_id=invoice.user_id,
        client_id=invoice.client_id,
        project_id=invoice.project_id,
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        sent_at=invoice.sent_at,
        viewed_at=invoice.viewed_at,
        email_delivery_status=invoice.email_delivery_status,
        email_failure_reason=invoice.email_failure_reason,
        last_email_sent_at=invoice.last_email_sent_at,
        email_send_attempts=invoice.email_send_attempts,
        amount_paid=invoice.amount_paid,
        payment_notes=invoice.payment_notes,
        reminder_sent_at=invoice.reminder_sent_at,
        next_reminder_date=invoice.next_reminder_date,
        is_from_template=invoice.is_from_template,
        template_invoice_id=invoice.template_invoice_id,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total=invoice.total,
        currency=invoice.currency,
        notes=invoice.notes,
        payment_terms=invoice.payment_terms,
        items=items,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        **enriched,
    )


def log_invoice_event(
    db: Session,
    invoice_id: int,
    event_type: str,
    description: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    workspace_id: Optional[int] = None
) -> None:
    """Log an event for audit trail."""
    event = InvoiceEvent(
        workspace_id=workspace_id,
        invoice_id=invoice_id,
        event_type=event_type,
        description=description,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(event)
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# List Invoices with Advanced Filters
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    status_filter: Optional[str] = None,
    client_id: Optional[int] = None,
    project_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort_by: Optional[str] = "newest",  # newest, due_soon, highest_value, unpaid_first
    paid_status: Optional[str] = None,  # all, paid, unpaid, overdue
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """List invoices with advanced filtering, sorting, and status options."""
    query = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items)
    ).filter(
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id
    )

    # Status filter
    if status_filter:
        try:
            inv_status = InvoiceStatus(status_filter)
            query = query.filter(Invoice.status == inv_status)
        except ValueError:
            pass

    # Client filter
    if client_id:
        query = query.filter(Invoice.client_id == client_id)

    # Project filter
    if project_id:
        query = query.filter(Invoice.project_id == project_id)

    # Date range filter
    if date_from:
        query = query.filter(Invoice.issue_date >= date_from)
    if date_to:
        query = query.filter(Invoice.issue_date <= date_to)

    # Paid status filter
    if paid_status == "paid":
        query = query.filter(Invoice.status == InvoiceStatus.PAID)
    elif paid_status == "unpaid":
        query = query.filter(Invoice.status.in_([InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.VIEWED]))
    elif paid_status == "overdue":
        today = date.today()
        query = query.filter(
            and_(
                Invoice.due_date < today,
                Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.VIEWED])
            )
        )

    # Sorting
    if sort_by == "due_soon":
        query = query.order_by(Invoice.due_date.asc())
    elif sort_by == "highest_value":
        query = query.order_by(Invoice.total.desc())
    elif sort_by == "unpaid_first":
        query = query.order_by(Invoice.status.desc(), Invoice.due_date.asc())
    else:  # newest (default)
        query = query.order_by(Invoice.created_at.desc())

    invoices = query.all()
    return [build_invoice_response(inv) for inv in invoices]


# ─────────────────────────────────────────────────────────────────────────────
# Create Invoice
# ─────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Create a new invoice with line items."""
    data = invoice_data.model_dump()
    items_data = data.pop("items", [])

    invoice_number = get_next_invoice_number(db, current_user)

    # Calculate totals server-side
    subtotal = sum(Decimal(str(item["quantity"])) * Decimal(str(item["unit_price"])) for item in items_data)
    tax_rate = Decimal(str(data.get("tax_rate") or "0.0"))
    tax_amount = (subtotal * tax_rate / Decimal("100")).quantize(Decimal("0.01"))
    discount = Decimal(str(data.get("discount_amount") or "0.0"))
    total = subtotal + tax_amount - discount

    data["subtotal"] = subtotal
    data["tax_amount"] = tax_amount
    data["total"] = total

    invoice = Invoice(
        user_id=current_user.id,
        workspace_id=workspace.id,
        invoice_number=invoice_number,
        **data
    )
    db.add(invoice)
    db.flush()

    # Add line items
    for item_data in items_data:
        item = InvoiceItem(
            invoice_id=invoice.id,
            workspace_id=workspace.id,
            description=item_data["description"],
            quantity=Decimal(str(item_data["quantity"])),
            unit_price=Decimal(str(item_data["unit_price"])),
            amount=Decimal(str(item_data["quantity"])) * Decimal(str(item_data["unit_price"])),
        )
        db.add(item)

    # Log event
    log_invoice_event(
        db,
        invoice.id,
        "created",
        f"Invoice {invoice_number} created",
        workspace_id=workspace.id
    )

    db.add(Notification(
        user_id=current_user.id,
        workspace_id=workspace.id,
        type="info",
        title="Invoice Created",
        message=f"New invoice #{invoice_number} created for {total}. Ensure to review and send to the client.",
        reference_type="invoice",
        reference_id=invoice.id
    ))
    db.commit()
    # Reload with relationships
    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items)
    ).filter(Invoice.id == invoice.id).first()

    return build_invoice_response(invoice)


# ─────────────────────────────────────────────────────────────────────────────
# Get Invoice Detail
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single invoice by ID."""
    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return build_invoice_response(invoice)


@router.get("/{invoice_id}/detail")
def get_invoice_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get full invoice detail with timeline and all related data."""
    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items),
        joinedload(Invoice.events)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Build response with events
    response = build_invoice_response(invoice)
    
    # Add events timeline
    events_list = [
        {
            "id": event.id,
            "event_type": event.event_type,
            "description": event.description,
            "old_value": event.old_value,
            "new_value": event.new_value,
            "created_at": event.created_at,
        }
        for event in sorted(invoice.events, key=lambda e: e.created_at or datetime.min)
    ]

    return {
        **response.model_dump(),
        "events": events_list,
        "client": {
            "id": invoice.client.id,
            "name": invoice.client.name,
            "email": invoice.client.email,
            "phone": invoice.client.phone,
            "company": invoice.client.company,
            "address": invoice.client.address,
            "city": invoice.client.city,
            "country": invoice.client.country,
        } if invoice.client else None,
        "project": {
            "id": invoice.project.id,
            "name": invoice.project.name,
            "description": invoice.project.description,
            "status": invoice.project.status,
            "hourly_rate": invoice.project.hourly_rate,
            "budget": invoice.project.budget,
        } if invoice.project else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Update Invoice
# ─────────────────────────────────────────────────────────────────────────────

@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    update_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update invoice details."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    data = update_data.model_dump(exclude_unset=True)
    items_data = data.pop("items", None)

    # Update fields
    for field, value in data.items():
        setattr(invoice, field, value)

    # Update items if provided
    if items_data is not None:
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
        for item_data in items_data:
            item = InvoiceItem(
                invoice_id=invoice.id,
                workspace_id=invoice.workspace_id,
                description=item_data["description"],
                quantity=Decimal(str(item_data["quantity"])),
                unit_price=Decimal(str(item_data["unit_price"])),
                amount=Decimal(str(item_data["quantity"])) * Decimal(str(item_data["unit_price"])),
            )
            db.add(item)

        # Recalculate totals
        subtotal = sum(Decimal(str(i["quantity"])) * Decimal(str(i["unit_price"])) for i in items_data)
        tax_rate = Decimal(str(invoice.tax_rate or 0))
        tax_amount = subtotal * (tax_rate / Decimal(100))
        invoice.subtotal = subtotal
        invoice.tax_amount = tax_amount
        invoice.total = subtotal + tax_amount - (invoice.discount_amount or Decimal(0))

    db.commit()

    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items)
    ).filter(Invoice.id == invoice_id).first()

    return build_invoice_response(invoice)


# ─────────────────────────────────────────────────────────────────────────────
# Delete Invoice
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an invoice."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db.delete(invoice)
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Mark Sent (with Email)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{invoice_id}/mark-sent")
def mark_invoice_sent(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Mark invoice as sent and send email to client."""
    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.items)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Generate PDF
    pdf_content = generate_invoice_pdf(invoice, current_user)
    
    # Send Email if client has email
    email_sent = False
    email_failure_reason = None
    try:
        if invoice.client and invoice.client.email:
            email_sent = send_invoice_email(
                to_email=invoice.client.email,
                subject=f"Invoice {invoice.invoice_number} from {current_user.company_name or current_user.full_name}",
                invoice_number=invoice.invoice_number,
                pdf_content=pdf_content,
                client_name=invoice.client.name,
                amount=f"{invoice.currency} {invoice.total:,.2f}",
                due_date=invoice.due_date.strftime("%B %d, %Y")
            )
            if email_sent:
                invoice.email_delivery_status = "sent"
            else:
                invoice.email_delivery_status = "failed"
                email_failure_reason = "Email service returned false"
        else:
            email_failure_reason = "Client has no email address"
    except Exception as e:
        email_sent = False
        invoice.email_delivery_status = "failed"
        email_failure_reason = str(e)

    # Update invoice
    invoice.status = InvoiceStatus.SENT
    invoice.sent_at = datetime.utcnow()
    invoice.last_email_sent_at = datetime.utcnow()
    invoice.email_send_attempts = (invoice.email_send_attempts or 0) + 1
    if email_failure_reason:
        invoice.email_failure_reason = email_failure_reason
    
    # Log event
    log_invoice_event(
        db,
        invoice.id,
        "email_sent" if email_sent else "email_failed",
        f"Invoice emailed to {invoice.client.email if invoice.client else 'N/A'}" if email_sent else f"Email failed: {email_failure_reason}",
        workspace_id=workspace.id
    )
    
    db.commit()
    
    return {
        "message": "Invoice marked as sent",
        "email_sent": email_sent,
        "email_failure_reason": email_failure_reason,
        "status": "sent"
    }


# ─────────────────────────────────────────────────────────────────────────────
# Mark Paid (with Payment Recording)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{invoice_id}/mark-paid")
def mark_invoice_paid(
    invoice_id: int,
    paid_date: Optional[date] = None,
    amount_paid: Optional[Decimal] = None,
    payment_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Mark invoice as paid and optionally record payment details."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Record payment
    if amount_paid is not None:
        invoice.amount_paid = Decimal(str(amount_paid))
    else:
        invoice.amount_paid = invoice.total  # Full payment
    
    if payment_notes:
        invoice.payment_notes = payment_notes
    
    # Mark as paid
    invoice.status = InvoiceStatus.PAID
    invoice.paid_date = paid_date or date.today()
    
    # Log event
    log_invoice_event(
        db,
        invoice.id,
        "payment_received",
        f"Payment received: {invoice.currency} {float(invoice.amount_paid):,.2f}",
        workspace_id=workspace.id
    )
    
    db.commit()
    
    return {
        "message": "Invoice marked as paid",
        "status": "paid",
        "amount_paid": float(invoice.amount_paid),
        "payment_notes": invoice.payment_notes
    }


# ─────────────────────────────────────────────────────────────────────────────
# Record Payment (for partial payments)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{invoice_id}/record-payment")
def record_payment(
    invoice_id: int,
    amount_paid: Decimal,
    payment_date: Optional[date] = None,
    payment_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Record a payment (partial or full) for an invoice."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    amount_paid = Decimal(str(amount_paid))
    invoice.amount_paid = (invoice.amount_paid or Decimal(0)) + amount_paid
    
    # Update status based on payment amount
    if invoice.amount_paid >= invoice.total:
        invoice.status = InvoiceStatus.PAID
        invoice.paid_date = payment_date or date.today()
    
    if payment_notes:
        invoice.payment_notes = (invoice.payment_notes or "") + f"\n[{datetime.now().isoformat()}] {payment_notes}"
    
    # Log event
    log_invoice_event(
        db,
        invoice.id,
        "payment_received",
        f"Payment recorded: {invoice.currency} {amount_paid:,.2f}",
        workspace_id=workspace.id
    )
    
    db.commit()
    
    return {
        "message": "Payment recorded",
        "amount_paid": float(invoice.amount_paid),
        "outstanding_balance": float(invoice.total - invoice.amount_paid),
        "status": invoice.status.value
    }


# ─────────────────────────────────────────────────────────────────────────────
# Duplicate Invoice
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{invoice_id}/duplicate")
def duplicate_invoice(
    invoice_id: int,
    issue_date: Optional[date] = None,
    due_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Duplicate an invoice with new dates."""
    original = db.query(Invoice).options(
        joinedload(Invoice.items)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id
    ).first()
    
    if not original:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Create new invoice
    invoice_number = get_next_invoice_number(db, current_user)
    new_issue_date = issue_date or date.today()
    if due_date is None:
        # Use same payment terms to calculate due date
        due_date = new_issue_date + timedelta(days=original.payment_terms or 30)
    
    new_invoice = Invoice(
        user_id=current_user.id,
        workspace_id=workspace.id,
        client_id=original.client_id,
        project_id=original.project_id,
        invoice_number=invoice_number,
        status=InvoiceStatus.DRAFT,
        issue_date=new_issue_date,
        due_date=due_date,
        subtotal=original.subtotal,
        tax_rate=original.tax_rate,
        tax_amount=original.tax_amount,
        discount_amount=original.discount_amount,
        total=original.total,
        currency=original.currency,
        notes=original.notes,
        payment_terms=original.payment_terms,
        is_from_template=True,
        template_invoice_id=original.id,
    )
    db.add(new_invoice)
    db.flush()
    
    # Duplicate items
    for original_item in original.items:
        new_item = InvoiceItem(
            invoice_id=new_invoice.id,
            workspace_id=workspace.id,
            description=original_item.description,
            quantity=Decimal(str(original_item.quantity)),
            unit_price=Decimal(str(original_item.unit_price)),
            amount=Decimal(str(original_item.amount)),
        )
        db.add(new_item)
    
    # Log event
    log_invoice_event(
        db,
        new_invoice.id,
        "created",
        f"Invoice duplicated from {original.invoice_number}",
        workspace_id=workspace.id
    )
    
    db.commit()
    
    new_invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items)
    ).filter(Invoice.id == new_invoice.id).first()
    
    return build_invoice_response(new_invoice)


# ─────────────────────────────────────────────────────────────────────────────
# Create Invoice from Time Entries
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/from-time-entries")
def create_invoice_from_time_entries(
    client_id: int,
    project_id: int,
    time_entry_ids: List[int],
    tax_rate: Optional[Decimal] = None,
    discount_amount: Optional[Decimal] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Create an invoice from selected billable time entries."""
    # Fetch time entries
    time_entries = db.query(TimeEntry).filter(
        TimeEntry.id.in_(time_entry_ids),
        TimeEntry.user_id == current_user.id,
        TimeEntry.is_billable == True,
        TimeEntry.is_invoiced == False
    ).all()
    
    if not time_entries:
        raise HTTPException(status_code=400, detail="No billable time entries found")
    
    # Verify client and project exist
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.user_id == current_user.id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Create invoice
    invoice_number = get_next_invoice_number(db, current_user)
    
    # Build items from time entries
    items_data = []
    subtotal = Decimal(0)
    for entry in time_entries:
        hours = Decimal(entry.duration_minutes or 0) / Decimal(60)
        rate = entry.hourly_rate or current_user.hourly_rate or Decimal(0)
        amount = hours * rate
        
        items_data.append({
            "description": f"{entry.description or 'Time entry'} ({hours:.1f} hrs)",
            "quantity": hours,
            "unit_price": rate,
            "amount": amount,
            "time_entry_id": entry.id,
        })
        subtotal += amount
    
    # Calculate totals
    tax_rate = Decimal(str(tax_rate or "0"))
    discount = Decimal(str(discount_amount or "0"))
    tax_amount = subtotal * (tax_rate / Decimal("100"))
    total = subtotal + tax_amount - discount
    
    # Create invoice
    invoice = Invoice(
        user_id=current_user.id,
        workspace_id=workspace.id,
        client_id=client_id,
        project_id=project_id,
        invoice_number=invoice_number,
        status=InvoiceStatus.DRAFT,
        issue_date=date.today(),
        due_date=date.today() + timedelta(days=current_user.payment_terms or 30),
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        discount_amount=discount,
        total=total,
        currency=current_user.currency or "USD",
        notes=f"Invoiced for {len(time_entries)} time entries",
    )
    db.add(invoice)
    db.flush()
    
    # Add items
    time_entry_ids_to_mark = []
    for item_data in items_data:
        time_entry_id = item_data.pop("time_entry_id")
        time_entry_ids_to_mark.append(time_entry_id)
        
        item = InvoiceItem(
            invoice_id=invoice.id,
            workspace_id=workspace.id,
            description=item_data["description"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            amount=item_data["amount"],
        )
        db.add(item)
    
    # Mark time entries as invoiced
    db.query(TimeEntry).filter(TimeEntry.id.in_(time_entry_ids_to_mark)).update({
        TimeEntry.is_invoiced: True
    }, synchronize_session=False)
    
    # Log event
    log_invoice_event(
        db,
        invoice.id,
        "created",
        f"Invoice created from {len(time_entries)} time entries",
        workspace_id=workspace.id
    )
    
    db.commit()
    
    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items)
    ).filter(Invoice.id == invoice.id).first()
    
    return build_invoice_response(invoice)


# ─────────────────────────────────────────────────────────────────────────────
# Get Unbilled Time Entries
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/available-time-entries", response_model=List[TimeEntryResponse])
def get_available_time_entries(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Get unbilled billable time entries for creating invoices."""
    query = db.query(TimeEntry).filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.workspace_id == workspace.id,
        TimeEntry.is_billable == True,
        TimeEntry.is_invoiced == False
    )
    
    if project_id:
        query = query.filter(TimeEntry.project_id == project_id)
    
    entries = query.order_by(TimeEntry.date.desc()).all()
    
    result = []
    for entry in entries:
        result.append(TimeEntryResponse(
            id=entry.id,
            workspace_id=entry.workspace_id,
            user_id=entry.user_id,
            project_id=entry.project_id,
            task_id=entry.task_id,
            description=entry.description,
            start_time=entry.start_time,
            end_time=entry.end_time,
            duration_minutes=entry.duration_minutes,
            hourly_rate=entry.hourly_rate,
            is_billable=entry.is_billable,
            date=entry.date,
            project_name=entry.project.name if entry.project else None,
            earnings=(Decimal(entry.duration_minutes or 0) / Decimal(60)) * (entry.hourly_rate or Decimal(0)),
            created_at=entry.created_at,
        ))
    
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Send Reminder
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{invoice_id}/send-reminder")
def send_invoice_reminder(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Send a payment reminder email for an unpaid invoice."""
    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.items)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status == InvoiceStatus.PAID:
        raise HTTPException(status_code=400, detail="Cannot send reminder for paid invoice")
    
    if not invoice.client or not invoice.client.email:
        raise HTTPException(status_code=400, detail="Client has no email address")
    
    # Generate PDF
    pdf_content = generate_invoice_pdf(invoice, current_user)
    
    # Send reminder email
    days_overdue = (date.today() - invoice.due_date).days if invoice.due_date < date.today() else 0
    
    try:
        email_sent = send_invoice_email(
            to_email=invoice.client.email,
            subject=f"Reminder: Invoice {invoice.invoice_number} Payment Due",
            invoice_number=invoice.invoice_number,
            pdf_content=pdf_content,
            client_name=invoice.client.name,
            amount=f"{invoice.currency} {invoice.total:,.2f}",
            due_date=invoice.due_date.strftime("%B %d, %Y")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send reminder: {str(e)}")
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send reminder email")
    
    # Update reminder tracking
    invoice.reminder_sent_at = datetime.utcnow()
    invoice.next_reminder_date = date.today() + timedelta(days=7)
    
    # Log event
    log_invoice_event(
        db,
        invoice.id,
        "reminder_sent",
        f"Payment reminder sent (Days overdue: {days_overdue})",
        workspace_id=workspace.id
    )
    
    db.commit()
    
    return {
        "message": "Reminder sent successfully",
        "reminder_sent_at": invoice.reminder_sent_at,
        "next_reminder_date": invoice.next_reminder_date,
        "days_overdue": days_overdue
    }


# ─────────────────────────────────────────────────────────────────────────────
# PDF Download
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Download invoice as PDF."""
    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    pdf_buffer = generate_invoice_pdf(invoice, current_user)

    return StreamingResponse(
        io.BytesIO(pdf_buffer),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Invoice-{invoice.invoice_number}.pdf"'
        }
    )


# ─────────────────────────────────────────────────────────────────────────────
# Analytics
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/summary")
def get_invoice_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    """Get comprehensive invoice analytics."""
    today = date.today()
    start = start_date or date(today.year, today.month, 1)  # First day of month
    end = end_date or today

    query = db.query(Invoice).filter(
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id,
        Invoice.created_at >= start,
        Invoice.created_at <= end
    )

    invoices = query.all()

    # Calculate metrics
    total_invoiced = sum(inv.total for inv in invoices)
    total_paid = sum(inv.total for inv in invoices if inv.status == InvoiceStatus.PAID)
    total_outstanding = sum(inv.total for inv in invoices if inv.status in [InvoiceStatus.SENT, InvoiceStatus.VIEWED])
    total_overdue = sum(inv.total for inv in invoices if inv.status == InvoiceStatus.OVERDUE)
    average_invoice = total_invoiced / len(invoices) if invoices else 0

    # By client
    by_client = {}
    for inv in invoices:
        if inv.client:
            if inv.client_id not in by_client:
                by_client[inv.client_id] = {
                    "client_name": inv.client.name,
                    "total_invoiced": Decimal(0),
                    "total_paid": Decimal(0)
                }
            by_client[inv.client_id]["total_invoiced"] += inv.total
            if inv.status == InvoiceStatus.PAID:
                by_client[inv.client_id]["total_paid"] += inv.total

    # By project
    by_project = {}
    for inv in invoices:
        if inv.project:
            if inv.project_id not in by_project:
                by_project[inv.project_id] = {
                    "project_name": inv.project.name,
                    "total_invoiced": Decimal(0),
                    "total_paid": Decimal(0)
                }
            by_project[inv.project_id]["total_invoiced"] += inv.total
            if inv.status == InvoiceStatus.PAID:
                by_project[inv.project_id]["total_paid"] += inv.total

    # By status
    by_status = {
        "draft": len([i for i in invoices if i.status == InvoiceStatus.DRAFT]),
        "sent": len([i for i in invoices if i.status == InvoiceStatus.SENT]),
        "viewed": len([i for i in invoices if i.status == InvoiceStatus.VIEWED]),
        "paid": len([i for i in invoices if i.status == InvoiceStatus.PAID]),
        "overdue": len([i for i in invoices if i.status == InvoiceStatus.OVERDUE]),
    }

    # Payment aging
    payment_aging = {
        "0_30_days": Decimal(0),
        "30_60_days": Decimal(0),
        "60_plus_days": Decimal(0),
    }
    for inv in invoices:
        if inv.status in [InvoiceStatus.SENT, InvoiceStatus.VIEWED]:
            days_outstanding = (today - inv.issue_date).days
            if days_outstanding <= 30:
                payment_aging["0_30_days"] += inv.total
            elif days_outstanding <= 60:
                payment_aging["30_60_days"] += inv.total
            else:
                payment_aging["60_plus_days"] += inv.total

    return {
        "total_invoiced": float(total_invoiced),
        "total_paid": float(total_paid),
        "total_outstanding": float(total_outstanding),
        "total_overdue": float(total_overdue),
        "average_invoice_value": float(average_invoice),
        "invoice_count": len(invoices),
        "by_client": [
            {
                "client_name": data["client_name"],
                "total_invoiced": float(data["total_invoiced"]),
                "total_paid": float(data["total_paid"])
            }
            for data in by_client.values()
        ],
        "by_project": [
            {
                "project_name": data["project_name"],
                "total_invoiced": float(data["total_invoiced"]),
                "total_paid": float(data["total_paid"])
            }
            for data in by_project.values()
        ],
        "by_status": by_status,
        "payment_aging": {k: float(v) for k, v in payment_aging.items()},
    }
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from database import get_db
from models import User, Invoice, InvoiceItem, Client, Project, InvoiceStatus, Workspace
from schemas import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from auth import get_current_user
from deps import get_current_workspace
from services.email_service import send_invoice_email
from services.pdf_service import generate_invoice_pdf
import io

# router = APIRouter(prefix="/invoices", tags=["Invoices"])


def enrich_invoice(inv: Invoice) -> dict:
    client_name = inv.client.name if inv.client else None
    project_name = inv.project.name if inv.project else None
    return {"client_name": client_name, "project_name": project_name}


def get_next_invoice_number(db: Session, user: User) -> str:
    """Generate next invoice number — always higher than any existing one for this user/prefix."""
    prefix = user.invoice_prefix or "INV"
    existing = (
        db.query(Invoice)
        .filter(Invoice.user_id == user.id, Invoice.invoice_number.like(f"{prefix}-%"))
        .all()
    )
    max_num = 0
    for inv in existing:
        try:
            num = int(inv.invoice_number.rsplit("-", 1)[-1])
            if num > max_num:
                max_num = num
        except (ValueError, IndexError):
            pass
    return f"{prefix}-{str(max_num + 1).zfill(4)}"


# This duplicate endpoint is removed - using the advanced one above instead


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    enriched = enrich_invoice(invoice)
    items = [
        {
            "id": item.id,
            "invoice_id": item.invoice_id,
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "amount": item.amount,
        }
        for item in invoice.items
    ]

    return InvoiceResponse(
        id=invoice.id,
        user_id=invoice.user_id,
        client_id=invoice.client_id,
        project_id=invoice.project_id,
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total=invoice.total,
        currency=invoice.currency,
        notes=invoice.notes,
        payment_terms=invoice.payment_terms,
        sent_at=invoice.sent_at,
        items=items,
        created_at=invoice.created_at,
        **enriched,
    )


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    update_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    data = update_data.model_dump(exclude_unset=True)
    items_data = data.pop("items", None)

    for field, value in data.items():
        setattr(invoice, field, value)

    if items_data is not None:
        # Replace all items
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
        for item_data in items_data:
            qty = Decimal(str(item_data["quantity"]))
            price = Decimal(str(item_data["unit_price"]))
            item = InvoiceItem(
                invoice_id=invoice.id,
                workspace_id=invoice.workspace_id,
                description=item_data["description"],
                quantity=qty,
                unit_price=price,
                amount=qty * price,
            )
            db.add(item)

        # Recalculate totals
        subtotal = sum(Decimal(str(i["quantity"])) * Decimal(str(i["unit_price"])) for i in items_data)
        tax_rate = Decimal(str(invoice.tax_rate or "0"))
        tax_amount = subtotal * (tax_rate / Decimal("100"))
        invoice.subtotal = subtotal
        invoice.tax_amount = tax_amount
        invoice.total = subtotal + tax_amount - (Decimal(str(invoice.discount_amount or "0")))

    db.commit()

    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items)
    ).filter(Invoice.id == invoice_id).first()

    enriched = enrich_invoice(invoice)
    items = [
        {
            "id": item.id,
            "invoice_id": item.invoice_id,
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "amount": item.amount,
        }
        for item in invoice.items
    ]

    return InvoiceResponse(
        id=invoice.id,
        user_id=invoice.user_id,
        client_id=invoice.client_id,
        project_id=invoice.project_id,
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total=invoice.total,
        currency=invoice.currency,
        notes=invoice.notes,
        payment_terms=invoice.payment_terms,
        sent_at=invoice.sent_at,
        items=items,
        created_at=invoice.created_at,
        **enriched,
    )


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(invoice)
    db.commit()


@router.post("/{invoice_id}/mark-sent")
def mark_invoice_sent(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    from datetime import datetime
    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.items)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Generate PDF
    pdf_content = generate_invoice_pdf(invoice, current_user)
    
    # Send Email if client has email
    email_sent = False
    if invoice.client and invoice.client.email:
        email_sent = send_invoice_email(
            to_email=invoice.client.email,
            subject=f"Invoice {invoice.invoice_number} from {current_user.company_name or current_user.full_name}",
            invoice_number=invoice.invoice_number,
            pdf_content=pdf_content,
            client_name=invoice.client.name,
            amount=f"{invoice.currency} {invoice.total:,.2f}",
            due_date=invoice.due_date.strftime("%B %d, %Y")
        )

    invoice.status = InvoiceStatus.SENT
    invoice.sent_at = datetime.utcnow()
    db.commit()
    
    return {
        "message": "Invoice marked as sent", 
        "email_sent": email_sent, 
        "status": "sent"
    }


@router.post("/{invoice_id}/mark-paid")
def mark_invoice_paid(
    invoice_id: int,
    paid_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = InvoiceStatus.PAID
    invoice.paid_date = paid_date or date.today()
    db.commit()
    return {"message": "Invoice marked as paid", "status": "paid"}


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    invoice = db.query(Invoice).options(
        joinedload(Invoice.client),
        joinedload(Invoice.project),
        joinedload(Invoice.items)
    ).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id,
        Invoice.workspace_id == workspace.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    from services.pdf_service import generate_invoice_pdf
    pdf_buffer = generate_invoice_pdf(invoice, current_user)

    return StreamingResponse(
        io.BytesIO(pdf_buffer),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Invoice-{invoice.invoice_number}.pdf"'
        }
    )
