import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_db():
    try:
        con = psycopg2.connect(dbname='postgres', user='postgres', host='localhost', password='Anshul')
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = con.cursor()
        cur.execute("CREATE DATABASE freelanceos")
        print("Database 'freelanceos' created successfully.")
        cur.close()
        con.close()
    except Exception as e:
        if "already exists" in str(e):
            print("Database 'freelanceos' already exists.")
        else:
            print(f"Error creating database: {e}")

if __name__ == "__main__":
    create_db()
