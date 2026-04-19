
import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres.zxsloquwsmicadpanclo:Anshul-777%40@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(db_url)

def fix_invoice_uniqueness():
    statements = [
        # 1. Drop existing global unique indexing on invoices.invoice_number
        # Usually named invoices_invoice_number_key or similar
        "ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key",
        
        # 2. Add composite unique constraint
        "ALTER TABLE invoices ADD CONSTRAINT uq_invoice_user_number UNIQUE (user_id, invoice_number)",
        
        # 3. Same for Expenses if they have any such constraints?
        # Let's check expenses. Actually, expenses don't have a unique 'number'.
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
    fix_invoice_uniqueness()
