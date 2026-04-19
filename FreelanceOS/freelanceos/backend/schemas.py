from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from models import ProjectStatus, TaskStatus, InvoiceStatus, ExpenseCategory


# ─── Auth Schemas ──────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ─── Workspace Schemas ─────────────────────────────────────────────────────────

class WorkspaceBase(BaseModel):
    name: str
    slug: str


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceResponse(WorkspaceBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── User Schemas ──────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: str
    full_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = "United States"
    currency: str = "USD"
    hourly_rate: Decimal = Decimal("75.0")
    bio: Optional[str] = None
    website: Optional[str] = None
    tax_number: Optional[str] = None
    invoice_prefix: Optional[str] = "INV"
    invoice_notes: Optional[str] = None
    payment_terms: Optional[int] = 30


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    avatar_url: Optional[str] = None
    tax_number: Optional[str] = None
    invoice_prefix: Optional[str] = None
    invoice_notes: Optional[str] = None
    payment_terms: Optional[int] = None
    profile_card_template: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    email_invoices: Optional[bool] = None
    email_expenses: Optional[bool] = None
    email_weekly: Optional[bool] = None
    in_app_alerts: Optional[bool] = None
    daily_digest: Optional[bool] = None
    profile_public: Optional[bool] = None
    show_email: Optional[bool] = None
    show_location: Optional[bool] = None
    show_activity: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = None
    profile_card_template: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    email_invoices: bool = True
    email_expenses: bool = True
    email_weekly: bool = True
    in_app_alerts: bool = True
    daily_digest: bool = True
    profile_public: bool = True
    show_email: bool = True
    show_location: bool = True
    show_activity: bool = True
    is_active: bool
    created_at: Optional[datetime] = None
    workspaces: List[WorkspaceResponse] = []

    class Config:
        from_attributes = True


# ─── Client Schemas ────────────────────────────────────────────────────────────

class ClientBase(BaseModel):
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    notes: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    is_active: bool = True


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    notes: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ClientResponse(ClientBase):
    id: int
    workspace_id: Optional[int] = None
    user_id: int
    created_at: Optional[datetime] = None
    total_projects: Optional[int] = 0
    total_invoiced: Optional[Decimal] = Decimal("0.0")
    total_paid: Optional[Decimal] = Decimal("0.0")

    class Config:
        from_attributes = True


# ─── Task Schemas ──────────────────────────────────────────────────────────────

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: Optional[str] = "medium"
    estimated_hours: Optional[Decimal] = None
    due_date: Optional[date] = None
    position: Optional[int] = 0


class TaskCreate(TaskBase):
    project_id: int


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[str] = None
    estimated_hours: Optional[Decimal] = None
    due_date: Optional[date] = None
    position: Optional[int] = None


class TaskResponse(TaskBase):
    id: int
    workspace_id: Optional[int] = None
    project_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Project Schemas ───────────────────────────────────────────────────────────

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    color: Optional[str] = "#4F46E5"
    budget: Optional[Decimal] = None
    budget_type: Optional[str] = "fixed"
    hourly_rate: Optional[Decimal] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None
    is_billable: bool = True


class ProjectCreate(ProjectBase):
    client_id: Optional[int] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    color: Optional[str] = None
    client_id: Optional[int] = None
    budget: Optional[Decimal] = None
    budget_type: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None
    is_billable: Optional[bool] = None


class ProjectResponse(ProjectBase):
    id: int
    workspace_id: Optional[int] = None
    user_id: int
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    created_at: Optional[datetime] = None
    tasks: List[TaskResponse] = []
    total_hours: Optional[Decimal] = 0.0
    total_earnings: Optional[Decimal] = 0.0
    completion_percentage: Optional[Decimal] = 0.0

    class Config:
        from_attributes = True


class ProjectListResponse(ProjectBase):
    id: int
    user_id: int
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    created_at: Optional[datetime] = None
    total_hours: Optional[Decimal] = 0.0
    total_earnings: Optional[Decimal] = 0.0
    task_count: Optional[int] = 0
    completion_percentage: Optional[Decimal] = 0.0

    class Config:
        from_attributes = True


# ─── Deliverable Schemas ──────────────────────────────────────────────────────

class DeliverableBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "pending"  # pending | in_progress | completed | approved | rejected
    due_date: Optional[date] = None
    notes: Optional[str] = None
    order: int = 0


class DeliverableCreate(DeliverableBase):
    project_id: int


class DeliverableResponse(DeliverableBase):
    id: int
    project_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Scope Change Schemas ────────────────────────────────────────────────────

class ScopeChangeBase(BaseModel):
    title: str
    description: Optional[str] = None
    change_type: str = "revision"  # revision | extra_work | scope_reduction
    impact_on_budget: Optional[Decimal] = None
    impact_on_hours: Optional[Decimal] = None
    impact_on_timeline: Optional[int] = None  # Days
    status: str = "pending"  # pending | approved | implemented | rejected


class ScopeChangeCreate(ScopeChangeBase):
    project_id: int


class ScopeChangeResponse(ScopeChangeBase):
    id: int
    project_id: int
    created_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Project File Schemas ────────────────────────────────────────────────────

class ProjectFileBase(BaseModel):
    file_name: str
    file_type: str  # contract | brief | deliverable | reference | other
    file_url: str
    file_size: Optional[int] = None
    uploaded_by_user: bool = True
    description: Optional[str] = None


class ProjectFileCreate(ProjectFileBase):
    project_id: int


class ProjectFileResponse(ProjectFileBase):
    id: int
    project_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Project Detail Response ───────────────────────────────────────────────

class ProjectDetailResponse(ProjectBase):
    """Rich response with all project details for project page"""
    id: int
    workspace_id: Optional[int] = None
    user_id: int
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    tasks: List[TaskResponse] = []
    deliverables: List[DeliverableResponse] = []
    scope_changes: List[ScopeChangeResponse] = []
    files: List[ProjectFileResponse] = []
    total_hours: float = 0.0
    total_expenses: float = 0.0
    total_earnings: float = 0.0
    profit_estimate: float = 0.0
    days_until_due: Optional[int] = None
    is_overdue: bool = False
    completion_percentage: float = 0.0
    risk_level: str = "low"  # low | medium | high

    class Config:
        from_attributes = True


# ─── Time Entry Schemas ────────────────────────────────────────────────────────

class TimeEntryBase(BaseModel):
    description: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    hourly_rate: Optional[Decimal] = None
    is_billable: bool = True
    date: date


class TimeEntryCreate(TimeEntryBase):
    project_id: Optional[int] = None
    task_id: Optional[int] = None


class TimeEntryUpdate(BaseModel):
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    hourly_rate: Optional[Decimal] = None
    is_billable: Optional[bool] = None


class TimeEntryResponse(TimeEntryBase):
    id: int
    workspace_id: Optional[int] = None
    user_id: int
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    project_name: Optional[str] = None
    task_title: Optional[str] = None
    earnings: Optional[Decimal] = Decimal("0.0")
    is_invoiced: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Invoice Schemas ───────────────────────────────────────────────────────────

class InvoiceItemBase(BaseModel):
    description: str
    quantity: Decimal = Decimal("1.0")
    unit_price: Decimal = Decimal("0.0")
    amount: Decimal = Decimal("0.0")


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    id: int
    invoice_id: int

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    status: InvoiceStatus = InvoiceStatus.DRAFT
    issue_date: date
    due_date: date
    subtotal: Decimal = Decimal("0.0")
    tax_rate: Optional[Decimal] = Decimal("0.0")
    tax_amount: Decimal = Decimal("0.0")
    discount_amount: Decimal = Decimal("0.0")
    total: Decimal = Decimal("0.0")
    currency: str = "USD"
    notes: Optional[str] = None
    payment_terms: Optional[int] = 30


class InvoiceCreate(InvoiceBase):
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    items: List[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    status: Optional[InvoiceStatus] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    subtotal: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    total: Optional[Decimal] = None
    currency: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[int] = None
    items: Optional[List[InvoiceItemCreate]] = None


class InvoiceResponse(InvoiceBase):
    id: int
    workspace_id: Optional[int] = None
    user_id: int
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    invoice_number: str
    client_name: Optional[str] = None
    project_name: Optional[str] = None
    paid_date: Optional[date] = None
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    email_delivery_status: Optional[str] = None
    email_failure_reason: Optional[str] = None
    last_email_sent_at: Optional[datetime] = None
    email_send_attempts: int = 0
    amount_paid: Decimal = Decimal("0.0")
    payment_notes: Optional[str] = None
    reminder_sent_at: Optional[datetime] = None
    next_reminder_date: Optional[date] = None
    is_from_template: bool = False
    template_invoice_id: Optional[int] = None
    items: List[InvoiceItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceEventResponse(BaseModel):
    id: int
    invoice_id: int
    event_type: str
    description: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceDetailResponse(InvoiceResponse):
    """Rich response with all invoice details for invoice detail page"""
    events: List[InvoiceEventResponse] = []
    client: Optional[ClientResponse] = None
    project: Optional[ProjectResponse] = None

    class Config:
        from_attributes = True


class InvoiceTemplateItemBase(BaseModel):
    description: str
    quantity: Decimal = Decimal("1.0")
    unit_price: Decimal = Decimal("0.0")


class InvoiceTemplateItemCreate(InvoiceTemplateItemBase):
    pass


class InvoiceTemplateItemResponse(InvoiceTemplateItemBase):
    id: int
    template_id: int

    class Config:
        from_attributes = True


class InvoiceTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    default_tax_rate: Decimal = Decimal("0.0")
    default_discount: Decimal = Decimal("0.0")
    default_payment_terms: int = 30


class InvoiceTemplateCreate(InvoiceTemplateBase):
    items: List[InvoiceTemplateItemCreate] = []


class InvoiceTemplateResponse(InvoiceTemplateBase):
    id: int
    workspace_id: int
    user_id: int
    items: List[InvoiceTemplateItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Expense Schemas ───────────────────────────────────────────────────────────

class ExpenseBase(BaseModel):
    category: ExpenseCategory = ExpenseCategory.OTHER
    description: str
    amount: Decimal
    currency: str = "USD"
    date: date
    vendor: Optional[str] = None
    payment_method: Optional[str] = None
    receipt_url: Optional[str] = None
    is_billable: bool = False
    is_reimbursed: bool = False
    tax_included: bool = False
    tax_amount: Optional[Decimal] = 0.0
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    project_id: Optional[int] = None


class ExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    date: Optional[date] = None
    vendor: Optional[str] = None
    payment_method: Optional[str] = None
    receipt_url: Optional[str] = None
    project_id: Optional[int] = None
    is_billable: Optional[bool] = None
    is_reimbursed: Optional[bool] = None
    tax_included: Optional[bool] = None
    tax_amount: Optional[Decimal] = None
    notes: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: int
    workspace_id: Optional[int] = None
    user_id: int
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    payment_method: Optional[str] = None
    receipt_url: Optional[str] = None
    is_recurring: bool = False
    parent_recurring_id: Optional[int] = None
    tax_included: bool = False
    tax_amount: Optional[Decimal] = 0.0
    converted_amount: Optional[Decimal] = None
    exchange_rate: Optional[Decimal] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Dashboard Schemas ─────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_revenue_this_month: float
    total_revenue_last_month: float
    revenue_change_pct: float
    total_hours_this_month: float
    total_hours_last_month: float
    hours_change_pct: float
    active_projects: int
    total_clients: int
    outstanding_invoices: float
    outstanding_count: int
    total_expenses_this_month: float
    net_income_this_month: float


class RevenueDataPoint(BaseModel):
    month: str
    revenue: float
    expenses: float
    profit: float


class ActivityItem(BaseModel):
    id: int
    type: str  # time_entry | invoice | project | expense
    description: str
    amount: Optional[float] = None
    date: str
    color: str


class DashboardResponse(BaseModel):
    stats: DashboardStats
    revenue_chart: List[RevenueDataPoint]
    recent_activity: List[ActivityItem]
    top_clients: List[dict]
    upcoming_deadlines: List[dict]


# ─── Analytics Schemas ─────────────────────────────────────────────────────────

class AnalyticsResponse(BaseModel):
    revenue_by_month: List[dict]
    revenue_by_client: List[dict]
    time_by_project: List[dict]
    expenses_by_category: List[dict]
    invoice_status_breakdown: List[dict]
    utilization_rate: float
    avg_project_value: float
    avg_hourly_rate: float
    total_revenue_ytd: float
    total_expenses_ytd: float
    net_profit_ytd: float


# ─── Recurring Expense Schemas ────────────────────────────────────────────────

class RecurringExpenseBase(BaseModel):
    title: str
    amount: Decimal
    currency: str = "USD"
    category: ExpenseCategory
    interval: str  # weekly | monthly | yearly
    start_date: date
    end_date: Optional[date] = None

class RecurringExpenseCreate(RecurringExpenseBase):
    pass

class RecurringExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    category: Optional[ExpenseCategory] = None
    interval: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

class RecurringExpenseResponse(RecurringExpenseBase):
    id: int
    workspace_id: int
    user_id: int
    next_generation_date: date
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Exchange Rate Schemas ───────────────────────────────────────────────────

class ExchangeRateResponse(BaseModel):
    from_currency: str
    to_currency: str
    rate: Decimal
    timestamp: datetime

    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    type: str = "info"
    title: str
    message: str
    read: bool = False
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    workspace_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
