
import os
from sqlalchemy import create_engine, inspect

db_url = "postgresql://postgres.zxsloquwsmicadpanclo:Anshul-777%40@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(db_url)

try:
    inspector = inspect(engine)
    for table_name in ["invoices", "projects", "clients"]:
        columns = inspector.get_columns(table_name)
        print(f"Table: {table_name}")
        for col in columns:
            print(f"  {col['name']}: {col['type']} (Nullable: {col['nullable']})")
        print("-" * 20)

except Exception as e:
    print(f"ERROR: {e}")
