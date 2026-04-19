
import os
from sqlalchemy import create_engine, inspect

db_url = "postgresql://postgres.zxsloquwsmicadpanclo:Anshul-777%40@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(db_url)
inspector = inspect(engine)
print(f"AuditLog Columns: {[c['name'] for c in inspector.get_columns('audit_logs')]}")
