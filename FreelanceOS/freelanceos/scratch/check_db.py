
import os
from sqlalchemy import create_engine, inspect

# Use the DATABASE_URL provided by the user
db_url = "postgresql://postgres:Anshul-777%40@db.zxsloquwsmicadpanclo.supabase.co:5432/postgres?sslmode=require"

try:
    engine = create_engine(db_url)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables found: {tables}")
    
    expected_tables = ['users', 'workspaces', 'user_workspaces', 'projects', 'clients', 'invoices']
    missing = [t for t in expected_tables if t not in tables]
    
    if missing:
        print(f"FAILED: Missing tables: {missing}")
    else:
        print("SUCCESS: All expected tables found.")
except Exception as e:
    print(f"CONNECTION ERROR: {e}")
