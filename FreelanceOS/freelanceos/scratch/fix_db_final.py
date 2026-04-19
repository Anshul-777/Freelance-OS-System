
import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres.zxsloquwsmicadpanclo:Anshul-777%40@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(db_url)

def run_sql(sql):
    with engine.connect() as conn:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"SUCCESS: {sql[:50]}...")
        except Exception as e:
            print(f"ERROR: {sql[:50]}... -> {e}")

# 1. Create Enum Types
enums = {
    "projectstatus": "('lead', 'active', 'on_hold', 'completed', 'cancelled')",
    "taskstatus": "('todo', 'in_progress', 'review', 'done')",
    "invoicestatus": "('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')",
    "expensecategory": "('software_subscription', 'hardware', 'travel', 'meals', 'office_rent', 'utilities', 'marketing_advertising', 'contractor_payments', 'banking_fees', 'taxes', 'education', 'miscellaneous', 'other')",
    "recurringsegment": "('weekly', 'monthly', 'yearly')",
    "deliverablestatus": "('pending', 'in_progress', 'completed', 'approved', 'rejected')"
}

print("--- Creating Enums ---")
for name, values in enums.items():
    # Use if not exists pattern for types is a bit tricky, try/except is safer
    run_sql(f"CREATE TYPE {name} AS ENUM {values}")

print("\n--- Adding Missing Columns ---")
# Define missing columns as (table, col_name, pg_type, default)
missing_cols = [
    ("users", "in_app_alerts", "BOOLEAN", "TRUE"),
    ("users", "daily_digest", "BOOLEAN", "TRUE"),
    ("users", "profile_public", "BOOLEAN", "TRUE"),
    ("users", "show_email", "BOOLEAN", "TRUE"),
    ("users", "show_location", "BOOLEAN", "TRUE"),
    ("users", "show_activity", "BOOLEAN", "TRUE"),
    ("users", "api_key", "VARCHAR(100)", "NULL"),
    ("users", "tax_number", "VARCHAR(100)", "NULL"),
    ("users", "invoice_prefix", "VARCHAR(20)", "'INV'"),
    ("users", "invoice_notes", "TEXT", "NULL"),
    ("users", "payment_terms", "INTEGER", "30"),
    
    ("invoices", "status", "invoicestatus", "'draft'"),
    ("expenses", "category", "expensecategory", "'other'"),
    ("notifications", "created_at", "TIMESTAMP WITH TIME ZONE", "NOW()"),
]

for table, col, ptype, default in missing_cols:
    sql = f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {ptype} DEFAULT {default}"
    run_sql(sql)

print("\n--- Repairing Specific Table Mismatches ---")
# Expenses 'amount' is INTEGER in DB but Numeric in model?
# Actually, the inspection said 'amount (INTEGER)'. Let's change to NUMERIC.
run_sql("ALTER TABLE expenses ALTER COLUMN amount TYPE NUMERIC(15, 2)")
run_sql("ALTER TABLE expenses ALTER COLUMN currency TYPE VARCHAR(10)")
run_sql("ALTER TABLE expenses RENAME COLUMN expense_date TO date")

print("\n--- Initialization Complete ---")
