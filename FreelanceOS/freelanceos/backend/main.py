"""
FreelanceOS Backend — FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from database import create_tables, SessionLocal
from config import settings
import traceback
from routers import (
    auth_router, dashboard, projects, clients, 
    time_entries, invoices, expenses, analytics,
    recurring_expenses, notifications
)
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from jobs.expense_jobs import generate_scheduled_expenses


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Scheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(generate_scheduled_expenses, 'cron', hour=1, minute=0)
    scheduler.start()
    app.state.scheduler = scheduler
    print("✓ Background scheduler started")

    # Only create tables and seed data in DEBUG mode
    if settings.DEBUG:
        try:
            create_tables()
            print("✓ Database tables created/verified")
            
            db = SessionLocal()
            try:
                from seed_data import seed_database
                seed_database(db)
                print("✓ Demo data seeded")
            finally:
                db.close()
        except Exception as e:
            print(f"⚠ Startup warning: {e}")
    else:
        print("✓ Production mode - skipping table creation and seeding")

    yield
    print("Shutting down FreelanceOS API")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## FreelanceOS API

Complete backend for the FreelanceOS freelancer management platform.

### Features
- 🔐 JWT Authentication
- 👥 Client Management
- 📁 Project Tracking (with Kanban tasks)
- ⏱️ Time Tracking
- 🧾 Invoice Generation + PDF Export
- 💰 Expense Tracking
- 📊 Analytics & Reporting
- 🗂️ Dashboard with KPIs
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global Exception Handler ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"{type(exc).__name__}: {exc}",
            "path":   str(request.url),
        },
    )

# ─── Routers ─────────────────────────────────────────────────────────────────
# Include all routers with /api prefix
app.include_router(auth_router.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(time_entries.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(recurring_expenses.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")

# ─── Root & Health ────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "version": settings.APP_VERSION}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )

