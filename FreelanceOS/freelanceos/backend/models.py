from decimal import Decimal
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum as SAEnum, Date, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_workspaces", foreign_keys=[owner_id])
    members = relationship("User", secondary="user_workspaces", back_populates="workspaces")


class UserWorkspace(Base):
    __tablename__ = "user_workspaces"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), primary_key=True)
    role = Column(String(50), default="member")  # owner, admin, member
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProjectStatus(str, enum.Enum):
    LEAD = "lead"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class ExpenseCategory(str, enum.Enum):
    SOFTWARE_SUBSCRIPTION = "software_subscription"
    HARDWARE = "hardware"
    TRAVEL = "travel"
    MEALS = "meals"
    OFFICE_RENT = "office_rent"
    UTILITIES = "utilities"
    MARKETING_ADVERTISING = "marketing_advertising"
    CONTRACTOR_PAYMENTS = "contractor_payments"
    BANKING_FEES = "banking_fees"
    TAXES = "taxes"
    EDUCATION = "education"
    MISCELLANEOUS = "miscellaneous"
    OTHER = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True, default="United States")
    currency = Column(String(10), nullable=False, default="USD")
    hourly_rate = Column(Numeric(12, 2), nullable=False, default=Decimal("75.0"))
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    website = Column(String(255), nullable=True)
    profile_card_template = Column(String(50), nullable=True, default="premium")
    theme = Column(String(20), nullable=True, default="light")
    language = Column(String(50), nullable=True, default="English")
    timezone = Column(String(50), nullable=True, default="UTC")
    date_format = Column(String(20), nullable=True, default="MM/DD/YYYY")
    email_invoices = Column(Boolean, default=True)
    email_expenses = Column(Boolean, default=True)
    email_weekly = Column(Boolean, default=True)
    in_app_alerts = Column(Boolean, default=True)
    daily_digest = Column(Boolean, default=True)
    profile_public = Column(Boolean, default=True)
    show_email = Column(Boolean, default=True)
    show_location = Column(Boolean, default=True)
    show_activity = Column(Boolean, default=True)
    api_key = Column(String(100), nullable=True)
    tax_number = Column(String(100), nullable=True)
    invoice_prefix = Column(String(20), nullable=True, default="INV")
    invoice_notes = Column(Text, nullable=True)
    payment_terms = Column(Integer, nullable=True, default=30)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owned_workspaces = relationship("Workspace", back_populates="owner", foreign_keys="[Workspace.owner_id]")
    workspaces = relationship("Workspace", secondary="user_workspaces", back_populates="members")
    clients = relationship("Client", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="user", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="user", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)  # Nullable for migration
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    hourly_rate = Column(Numeric(12, 2), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="clients")
    projects = relationship("Project", back_populates="client", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="client")
    notes_list = relationship("Note", back_populates="client", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SAEnum(ProjectStatus), default=ProjectStatus.ACTIVE, nullable=False)
    color = Column(String(20), nullable=True, default="#4F46E5")
    budget = Column(Numeric(15, 2), nullable=True)
    budget_type = Column(String(20), nullable=True, default="fixed")  # fixed | hourly
    hourly_rate = Column(Numeric(12, 2), nullable=True)
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    estimated_hours = Column(Numeric(10, 2), nullable=True)
    is_billable = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="projects")
    client = relationship("Client", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="project")
    invoices = relationship("Invoice", back_populates="project")
    deliverables = relationship("Deliverable", back_populates="project", cascade="all, delete-orphan")
    scope_changes = relationship("ScopeChange", back_populates="project", cascade="all, delete-orphan")
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SAEnum(TaskStatus), default=TaskStatus.TODO, nullable=False)
    priority = Column(String(20), nullable=True, default="medium")  # low | medium | high | urgent
    estimated_hours = Column(Numeric(10, 2), nullable=True)
    due_date = Column(Date, nullable=True)
    position = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="tasks")


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    description = Column(String(500), nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, nullable=True)  # stored in minutes
    hourly_rate = Column(Numeric(12, 2), nullable=True)
    is_billable = Column(Boolean, default=True)
    is_invoiced = Column(Boolean, default=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="time_entries")
    project = relationship("Project", back_populates="time_entries")
    task = relationship("Task")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    invoice_number = Column(String(50), unique=True, nullable=False)
    status = Column(SAEnum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    paid_date = Column(Date, nullable=True)
    subtotal = Column(Numeric(15, 2), nullable=False, default=Decimal("0.0"))
    tax_rate = Column(Numeric(5, 2), nullable=True, default=Decimal("0.0"))
    tax_amount = Column(Numeric(15, 2), nullable=False, default=Decimal("0.0"))
    discount_amount = Column(Numeric(15, 2), nullable=False, default=Decimal("0.0"))
    total = Column(Numeric(15, 2), nullable=False, default=Decimal("0.0"))
    currency = Column(String(10), nullable=False, default="USD")
    notes = Column(Text, nullable=True)
    payment_terms = Column(Integer, nullable=True, default=30)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    viewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Email delivery tracking
    email_delivery_status = Column(String(20), nullable=True, default=None)  # pending, sent, failed, bounced
    email_failure_reason = Column(Text, nullable=True)
    last_email_sent_at = Column(DateTime(timezone=True), nullable=True)
    email_send_attempts = Column(Integer, default=0)
    
    # Payment tracking
    amount_paid = Column(Numeric(15, 2), default=Decimal("0.0"))
    payment_notes = Column(Text, nullable=True)
    
    # Reminders & follow-up
    reminder_sent_at = Column(DateTime(timezone=True), nullable=True)
    next_reminder_date = Column(Date, nullable=True)
    
    # Template & duplication
    is_from_template = Column(Boolean, default=False)
    template_invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")
    project = relationship("Project", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    events = relationship("InvoiceEvent", back_populates="invoice", cascade="all, delete-orphan")
    template = relationship("Invoice", remote_side=[template_invoice_id], foreign_keys=[template_invoice_id])


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False, default=Decimal("1.0"))
    unit_price = Column(Numeric(15, 2), nullable=False, default=Decimal("0.0"))
    amount = Column(Numeric(15, 2), nullable=False, default=Decimal("0.0"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    invoice = relationship("Invoice", back_populates="items")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    category = Column(SAEnum(ExpenseCategory), default=ExpenseCategory.OTHER, nullable=False)
    description = Column(String(500), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    date = Column(Date, nullable=False)
    vendor = Column(String(255), nullable=True)
    payment_method = Column(String(100), nullable=True)
    receipt_url = Column(String(500), nullable=True)
    is_billable = Column(Boolean, default=False)
    is_reimbursed = Column(Boolean, default=False)
    is_recurring = Column(Boolean, default=False)
    parent_recurring_id = Column(Integer, ForeignKey("recurring_expense_configs.id"), nullable=True)
    tax_included = Column(Boolean, default=False)
    tax_amount = Column(Numeric(15, 2), nullable=True, default=Decimal("0.0"))
    converted_amount = Column(Numeric(15, 2), nullable=True)  # Converted to base currency
    exchange_rate = Column(Numeric(14, 6), nullable=True)
    notes = Column(Text, nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="expenses")
    project = relationship("Project")
    recurring_config = relationship("RecurringExpenseConfig", back_populates="instances")


class RecurringSegment(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class RecurringExpenseConfig(Base):
    __tablename__ = "recurring_expense_configs"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    category = Column(SAEnum(ExpenseCategory), nullable=False)
    interval = Column(SAEnum(RecurringSegment), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    last_generated_date = Column(Date, nullable=True)
    next_generation_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    instances = relationship("Expense", back_populates="recurring_config")


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    from_currency = Column(String(10), nullable=False)
    to_currency = Column(String(10), nullable=False)
    rate = Column(Numeric(14, 6), nullable=False)
    source = Column(String(50), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # CREATE, UPDATE, DELETE
    resource_type = Column(String(50), nullable=False)  # EXPENSE, INVOICE, etc.
    resource_id = Column(Integer, nullable=True)
    changes = Column(Text, nullable=True)  # JSON-string of changes
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class DeliverableStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    APPROVED = "approved"
    REJECTED = "rejected"


class Deliverable(Base):
    __tablename__ = "deliverables"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SAEnum(DeliverableStatus), default=DeliverableStatus.PENDING, nullable=False)
    due_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="deliverables")


class ScopeChange(Base):
    __tablename__ = "scope_changes"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    change_type = Column(String(50), nullable=False, default="revision")  # revision | extra_work | scope_reduction
    impact_on_budget = Column(Numeric(15, 2), nullable=True)  # Positive or negative
    impact_on_hours = Column(Numeric(10, 2), nullable=True)
    impact_on_timeline = Column(Integer, nullable=True)  # Days added/removed
    status = Column(String(20), default="pending", nullable=False)  # pending | approved | implemented | rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="scope_changes")


class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # contract | brief | deliverable | reference | other
    file_url = Column(String(500), nullable=False)  # S3/Supabase URL
    file_size = Column(Integer, nullable=True)  # In bytes
    uploaded_by_user = Column(Boolean, default=True)  # False = uploaded by client
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="files")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    client = relationship("Client", back_populates="notes_list")


class InvoiceEvent(Base):
    """Tracks all invoice-related events for audit trail and history."""
    __tablename__ = "invoice_events"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # created, status_changed, email_sent, email_failed, payment_received, reminder_sent, viewed
    description = Column(Text, nullable=True)
    old_value = Column(Text, nullable=True)  # JSON: old value if applicable
    new_value = Column(Text, nullable=True)  # JSON: new value if applicable
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    invoice = relationship("Invoice", back_populates="events")


class InvoiceTemplate(Base):
    """Stores reusable invoice templates for quick creation."""
    __tablename__ = "invoice_templates"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)  # e.g., "Monthly Retainer", "Project Work"
    description = Column(Text, nullable=True)
    default_tax_rate = Column(Numeric(5, 2), default=Decimal("0.0"))
    default_discount = Column(Numeric(15, 2), default=Decimal("0.0"))
    default_payment_terms = Column(Integer, default=30)
    items = relationship("InvoiceTemplateItem", cascade="all, delete-orphan")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User")


class InvoiceTemplateItem(Base):
    """Line items for invoice templates."""
    __tablename__ = "invoice_template_items"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("invoice_templates.id"), nullable=False)
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(10, 2), default=Decimal("1.0"))
    unit_price = Column(Numeric(15, 2), default=Decimal("0.0"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    """Stores user notifications."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False, default="info")  # success, warning, error, info
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    reference_type = Column(String(50), nullable=True)  # 'invoice', 'project', etc.
    reference_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")
