
import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres.zxsloquwsmicadpanclo:Anshul-777%40@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(db_url)

def fix_nullability():
    statements = [
        # Invoices
        "ALTER TABLE invoices ALTER COLUMN client_id DROP NOT NULL",
        "ALTER TABLE invoices ALTER COLUMN project_id DROP NOT NULL",
        "ALTER TABLE invoices ALTER COLUMN workspace_id DROP NOT NULL",
        
        # Clients
        "ALTER TABLE clients ALTER COLUMN workspace_id DROP NOT NULL",
        
        # Projects
        "ALTER TABLE projects ALTER COLUMN workspace_id DROP NOT NULL",
        "ALTER TABLE projects ALTER COLUMN client_id DROP NOT NULL"
    ]
    
    with engine.connect() as conn:
        for sql in statements:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"SUCCESS: {sql}")
            except Exception as e:
                print(f"ERROR: {sql} -> {e}")

if __name__ == "__main__":
    fix_nullability()
