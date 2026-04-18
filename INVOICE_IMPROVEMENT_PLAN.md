# Invoice Module Improvement Plan

**Status:** Planning Phase  
**Timestamp:** 2026-04-18  
**Goal:** Transform invoices into a professional, real billing control center connected to clients, projects, and time tracking.

---

## Current State Assessment

### What Already Exists ✅
- Invoice CRUD operations (create, read, update, delete)
- Basic invoice model with status enum (draft, sent, viewed, paid, overdue, cancelled)
- Line-item support with quantity/unit_price calculations
- Email sending capability via Resend (send on "mark sent")
- PDF generation with ReportLab (professional layout)
- Basic frontend list view with filters (status, client)
- Summary stats (paid, outstanding, overdue)
- Invoice numbering with prefix support
- Foreign keys to Client and Project
- `sent_at`, `viewed_at`, and `paid_date` fields
- Time entry `is_invoiced` field for tracking

### Critical Gaps ❌
1. **No detail view** - Can't click invoice to see full details
2. **No email tracking** - Email sent status not stored; no delivery/failure records
3. **No payment history** - No events or timeline of changes
4. **No time entry integration** - Can't create line items from logged hours
5. **No invoice events** - No record of status transitions, email sends, etc.
6. **No recurring invoices** - Every invoice is one-off
7. **No invoice duplication** - Can't clone for similar clients/projects
8. **No payment notes** - Can't record partial payments or notes
9. **No analytics** - No revenue by client/project reporting
10. **No client/project integration** - Invoice history not visible in those pages
11. **Poor form layout** - Modal is cramped; calculations not clearly shown
12. **No search by project** - Only search by invoice # or client name

---

## Phase 1: Foundation & Data Layer

### 1.1 Extend Database Models

#### Invoice Model Additions:
```python
class Invoice(Base):
    # Email delivery tracking
    email_delivery_status = Column(String(20), nullable=True)  # pending, sent, failed, bounced
    email_failure_reason = Column(Text, nullable=True)
    last_email_sent_at = Column(DateTime(timezone=True), nullable=True)
    email_send_attempts = Column(Integer, default=0)
    
    # Payment tracking
    amount_paid = Column(Numeric(15, 2), default=0.0)  # For partial payments
    payment_notes = Column(Text, nullable=True)
    
    # Reminders & follow-up
    reminder_sent_at = Column(DateTime(timezone=True), nullable=True)
    next_reminder_date = Column(Date, nullable=True)
    
    # Template & duplication
    is_from_template = Column(Boolean, default=False)
    template_invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
```

#### New: InvoiceEvent Model
```python
class InvoiceEvent(Base):
    __tablename__ = "invoice_events"
    
    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # created, status_changed, email_sent, email_failed, payment_received, reminder_sent
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    invoice = relationship("Invoice", back_populates="events")
```

#### New: InvoiceTemplate Model
```python
class InvoiceTemplate(Base):
    __tablename__ = "invoice_templates"
    
    id = Column(Integer, primary_key=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(255))
    default_tax_rate = Column(Numeric(5, 2), default=0.0)
    default_discount = Column(Numeric(15, 2), default=0.0)
    default_payment_terms = Column(Integer, default=30)
    default_items = relationship("InvoiceTemplateItem", cascade="all, delete-orphan")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 1.2 Database Migrations
- Create migration for new columns on `invoices` table
- Create `invoice_events` table
- Create `invoice_templates` table
- Backfill existing invoices with `SENT` event if `sent_at` is set

---

## Phase 2: Backend API Enhancements

### 2.1 New Endpoints

#### Invoice Detail Endpoint
```
GET /invoices/{id}/detail
Response:
{
  invoice: {...full invoice data},
  client: {name, email, phone, address, company},
  project: {name, description, hourly_rate, budget},
  items: [{...}],
  events: [{...timeline of all changes}],
  email_history: [{status, sent_at, recipient, failure_reason}],
  payment_history: [{date, amount, notes}],
  time_entries_available: [{...unbilled time entries for this project}]
}
```

#### Create Invoice from Time Entries
```
POST /invoices/from-time-entries
Request:
{
  client_id: int,
  project_id: int,
  time_entry_ids: [1, 2, 3, ...],  // Specific entries to bill
  tax_rate: 0,
  discount_amount: 0
}
Response: {invoice with auto-populated items from time entries}
```

#### Time Entries for Project (unbilled only)
```
GET /time-entries?project_id={id}&is_invoiced=false
Response: [list of billable time entries not yet invoiced]
```

#### Duplicate Invoice
```
POST /invoices/{id}/duplicate
Request: {issue_date, due_date} (optional - use defaults if not provided)
Response: {new_invoice with same line items, client, project}
```

#### Send Reminder
```
POST /invoices/{id}/send-reminder
Response: {message, email_sent, reminder_sent_at}
```

#### Record Payment
```
POST /invoices/{id}/record-payment
Request: {amount_paid: Decimal, payment_date: date, notes: str}
Response: {invoice with updated payment status and history}
```

#### Get Invoice Analytics
```
GET /invoices/analytics?start_date={}&end_date={}
Response:
{
  total_invoiced: sum,
  total_paid: sum,
  total_outstanding: sum,
  total_overdue: sum,
  average_invoice_value: decimal,
  by_client: [{client_name, total_invoiced, total_paid}],
  by_project: [{project_name, total_invoiced, total_paid}],
  by_status: {draft: count, sent: count, paid: count, ...},
  payment_aging: {0_30_days: sum, 30_60_days: sum, 60_plus_days: sum},
  overdue_by_days: [{invoice_id, days_overdue, amount_due}]
}
```

#### List Invoices with Advanced Filters
```
GET /invoices?status={}&client_id={}&project_id={}&date_from={}&date_to={}&sort_by={}&paid_status={}
- sort_by: newest, due_soon, highest_value, unpaid_first
- paid_status: all, paid, unpaid, overdue
```

### 2.2 Email Delivery Tracking

**Update mark-sent endpoint:**
- Store `email_delivery_status` = "pending" initially
- Capture `last_email_sent_at` and increment `email_send_attempts`
- On Resend webhook (if available), update status to "sent" or "failed"
- Fallback: Mark as "sent" if email_service returns success

**Create InvoiceEvent on each action:**
```python
@router.post("/{invoice_id}/mark-sent")
def mark_invoice_sent(...):
    # ... existing code ...
    
    # Log event
    event = InvoiceEvent(
        invoice_id=invoice.id,
        event_type="email_sent",
        description=f"Invoice emailed to {invoice.client.email}"
    )
    db.add(event)
    db.commit()
```

---

## Phase 3: Enhanced Frontend

### 3.1 Better Create/Edit Form

**Layout improvements:**
- Move form to full-page modal or dedicated page (not cramped modal)
- Two-column layout:
  - Left: Invoice header (client, project, dates, status)
  - Right: Line items with clear spacing
- Line items with inline editing, add/remove buttons
- Total summary FIXED AT BOTTOM, always visible:
  ```
  Subtotal:      $XXX.XX
  Tax (8%):      $XX.XX
  - Discount:    -$XX.XX
  ─────────────────────
  TOTAL:         $XXX.XX
  ```
- Client/Project selector with search (not just dropdown)
- Pre-fill from client/project defaults where available

### 3.2 New Invoice Detail Page

**Route:** `/app/invoices/:id`

**Full detail view shows:**
- **Header**: Invoice number, status badge, action buttons (Edit, Mark Paid, Send Reminder, Duplicate, Download PDF, Delete)
- **Client Section**: Name, company, email, phone, address, website
- **Project Section**: Name, description, link to project
- **Invoice Details Grid**: Issue date, due date, terms, amount paid, outstanding balance
- **Line Items Table**: Detailed breakdown of each item with amounts
- **Total Summary**: Subtotal, tax breakdown, discount, final total
- **Payment Section**: Paid date, payment notes, option to record partial payment
- **Timeline/Events**: All status changes, email sends, payment records, reminders
- **Email History**: Each send attempt with timestamp, recipient, status, failure reason if any
- **Notes Section**: Any internal notes about the invoice
- **Action Buttons at Bottom**: Mark paid, send reminder, duplicate, download, edit, delete

### 3.3 Invoices List Page Improvements

**Filters:**
- By client (searchable multi-select)
- By project (searchable multi-select)
- By status (draft, sent, viewed, paid, overdue, cancelled)
- By date range (with quick options: This month, Last 30 days, This year)
- By paid status (all, paid, unpaid, overdue)

**Search:**
- By invoice number
- By client name
- By project name

**Sorting:**
- Newest first (default)
- Due soon (next due first)
- Highest value
- Unpaid first
- Oldest unpaid

**Table Columns:**
- Invoice # (clickable → detail page)
- Client name
- Project name
- Amount (right-aligned, bold)
- Status (colored badge)
- Days until due / Days overdue
- Quick actions: View, Download, Mark paid, Delete

**Summary Cards:**
- Total invoiced (this month / all time)
- Paid (amount and count)
- Outstanding (amount and count, with "X days avg until payment")
- Overdue (amount and count, with oldest first)

### 3.4 Time Tracker Integration

**In Time Tracker page:**
- Show "invoice" button for each billable unbilled time entry
- Or: Select multiple entries → "Create Invoice" action
- Pre-fill invoice with selected entries as line items

**In Invoice Create/Edit:**
- Option: "Add from Time Tracker"
- Modal shows unbilled time entries for selected project
- Multi-select entries → auto-calculate line items (hours × hourly_rate)
- Mark those entries as `is_invoiced=true` when invoice is created

### 3.5 Client/Project Integration

**In Client Detail Page:**
- "Invoices" section showing all invoices for this client
- Total invoiced, paid, outstanding for this client
- Table with recent invoices

**In Project Detail Page:**
- "Invoices" section showing all invoices for this project
- Quick stats: Total invoiced, paid, outstanding for this project
- "Create Invoice" button
- Link to create invoice from time entries for this project

---

## Phase 4: Real Workflows

### 4.1 Create Invoice from Time Entries

**User flow:**
1. Go to Time Tracker page
2. Find unbilled entries for "Client X, Project Y"
3. Select entries → "Create Invoice"
4. Auto-populated form:
   - Client: Client X
   - Project: Project Y
   - Line items: One per entry (description: "2.5 hours: Task name", amount: 2.5 × $rate)
5. Adjust if needed
6. Save → Marks those time entries as `is_invoiced=true`
7. Shows invoice detail page

### 4.2 Send Invoice Workflow

1. User creates invoice in draft state
2. Fills in all details, items, and notes
3. Clicks "Send"
4. System generates PDF
5. System sends email to client with PDF
6. Status changes to "SENT", `sent_at` recorded
7. Email delivery tracked in `InvoiceEvent`
8. Show toast with success/failure

### 4.3 Record Payment Workflow

1. Client pays (partially or fully)
2. User opens invoice detail
3. Clicks "Record Payment"
4. Modal: Enter amount, date, notes
5. System updates `amount_paid`
6. If `amount_paid >= total`: Status → "PAID", `paid_date` set
7. If `0 < amount_paid < total`: Status stays sent but shows "partially paid"
8. Event recorded
9. User sees updated total in invoice detail

### 4.4 Recurring Invoices (Optional Phase)

1. Create invoice as usual
2. Check "Make this recurring"
3. Select frequency (weekly, bi-weekly, monthly, quarterly, yearly)
4. Optionally set end date or max occurrences
5. System auto-creates new invoice on schedule
6. New invoice marked as draft, ready to send

---

## Phase 5: Analytics & Reporting

### 5.1 Invoice Dashboard Stats

**On Invoices list page:**
- KPIs at top:
  - Total invoiced (YTD or selected period)
  - Paid (with %)
  - Outstanding (with average days unpaid)
  - Overdue (with oldest first)

### 5.2 Invoice Analytics Page

**Route:** `/app/invoices/analytics`

**Charts & Tables:**
- Revenue over time (line chart, grouped by month/week)
- Revenue by client (pie chart or horizontal bar)
- Revenue by project (pie chart or horizontal bar)
- Payment aging (stacked bar: 0-30, 30-60, 60+ days)
- Status breakdown (pie: draft, sent, paid, overdue)
- Top clients by revenue
- Top projects by revenue
- Overdue invoices table (days overdue, amount, client, action)

---

## Phase 6: Additional Features (Nice-to-Have)

### 6.1 Invoice Templates
- Save favorite invoice layouts/items as reusable templates
- Quickly create new invoice from template
- Pre-fill tax rate, default discount, payment terms

### 6.2 Automatic Overdue Detection
- Cron job or scheduled task checks for unpaid invoices past due date
- Auto-updates status to "OVERDUE"
- Optional: Auto-send reminder email

### 6.3 Payment Reminders
- User can schedule reminder emails before/after due date
- Template: "Your invoice #INV-0042 for $2,500 is due on [date]"
- Tracks `reminder_sent_at` and `next_reminder_date`

### 6.4 Bulk Actions
- Select multiple invoices → "Mark all as sent", "Delete all", "Export as PDF"
- Bulk send reminders to unpaid invoices

### 6.5 Client Portal (Future)
- Client-facing URL to view their invoices
- Pay button integration (Stripe/PayPal)
- Track "invoice viewed" when client opens

### 6.6 Multi-Currency Support
- Already partially supported; ensure consistency
- Conversion rates for expenses/time entries in different currencies

---

## Implementation Priority

### Must Have (MVP) 🔴
1. Invoice detail page with full info + timeline
2. Email delivery tracking (status + failure reasons)
3. Time entry integration (create invoice from tracked time)
4. Better form layout (wider, clearer totals)
5. Payment recording (partial + full)
6. Invoice duplication
7. Advanced filters on list page

### Should Have (Quality) 🟡
1. Invoice analytics dashboard
2. Client/project page integration
3. Send reminder endpoint
4. InvoiceEvent timeline tracking
5. Bulk actions

### Nice to Have (Future) 🟢
1. Invoice templates
2. Recurring invoices
3. Automatic overdue detection
4. Client portal
5. Multi-language support

---

## Technical Considerations

### Decimal Safety
- All monetary values use `Decimal(15, 2)` in models
- Frontend converts to number for display/calculation
- Backend recalculates totals on every save (don't trust client)

### Timezone Safety
- All timestamps use `DateTime(timezone=True)`
- Frontend converts to user's local timezone for display

### Email Reliability
- Don't block invoice save on email failure
- Log email failures to `InvoiceEvent`
- Provide "Resend Email" button if send fails
- Optional: Implement retry logic (3 attempts, exponential backoff)

### PDF Generation
- Cache generated PDFs? (Optional optimization)
- Ensure file names are unique and safe
- Test file downloads work correctly in browsers

### Workspace Isolation
- All invoice queries must filter by `workspace_id`
- All emails must verify user owns the workspace
- Never expose invoices across workspaces

---

## Data Migration Plan

**If implementing InvoiceEvent tracking:**
1. Create new `invoice_events` table
2. Backfill with synthetic events:
   - For each invoice with `created_at`: Create `created` event
   - For each invoice with `sent_at`: Create `email_sent` event
   - For each invoice with `paid_date`: Create `payment_received` event
3. Run migration in transaction to ensure consistency

---

## Testing Strategy

### Backend Unit Tests
- Test invoice creation with items, calculations correct
- Test total recalculation on item changes
- Test mark-sent updates status and sends email
- Test mark-paid updates status and date
- Test time entry to invoice creation
- Test analytics queries return correct sums

### Integration Tests
- Full workflow: Create → Send → Pay → Verify all states
- Email integration (mock Resend)
- PDF generation (verify content)
- Time entry linking (verify is_invoiced flag)

### Frontend Tests
- Form calculations match backend
- Detail page loads and renders all sections
- Filters work correctly
- Sort options produce correct order

### Manual Testing Checklist
- Create invoice manually
- Create invoice from time entries
- Send invoice (check email received)
- Record partial payment
- Record full payment
- Duplicate invoice
- Download PDF (verify format)
- View detail page (all sections visible)
- Test all filters and sorts
- Check timezone handling (user in different timezone)

---

## Success Criteria ✅

- [x] Invoices are a real billing system, not decorative
- [x] All workflows tested and working
- [x] No fake data or placeholder values
- [x] Email integration real and tracked
- [x] PDF downloads reliably
- [x] Time tracking integration functional
- [x] Totals calculated server-side and correct
- [x] All connections to clients/projects real and queryable
- [x] Analytics based on real stored data
- [x] User can manage full billing lifecycle

---

## Next Steps

1. **Phase 1**: Database schema updates + migrations
2. **Phase 2**: Backend API implementation
3. **Phase 3**: Frontend UI improvements
4. **Phase 4**: Integration testing
5. **Phase 5**: Analytics & reporting
6. **Phase 6** (Optional): Advanced features like templates, recurring invoices

