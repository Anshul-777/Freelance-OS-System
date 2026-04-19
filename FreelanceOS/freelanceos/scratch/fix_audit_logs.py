
import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres.zxsloquwsmicadpanclo:Anshul-777%40@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(db_url)

def fix_audit_logs():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE audit_logs RENAME COLUMN created_at TO timestamp"))
            conn.commit()
            print("SUCCESS: Renamed audit_logs.created_at to timestamp")
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    fix_audit_logs()
