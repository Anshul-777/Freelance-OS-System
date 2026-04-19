
import os
from sqlalchemy import create_engine, inspect
from decimal import Decimal

# Use the DATABASE_URL provided by the user
db_url = "postgresql://postgres.zxsloquwsmicadpanclo:Anshul-777%40@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

try:
    engine = create_engine(db_url)
    inspector = inspect(engine)
    
    for table_name in inspector.get_table_names():
        columns = [f"{c['name']} ({c['type']})" for c in inspector.get_columns(table_name)]
        print(f"Table: {table_name}")
        print(f"Columns: {columns}")
        print("-" * 20)

except Exception as e:
    print(f"ERROR: {e}")
