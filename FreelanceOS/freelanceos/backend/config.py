from pydantic_settings import BaseSettings
from typing import Optional
import secrets


class Settings(BaseSettings):
    # App
    APP_NAME: str = "FreelanceOS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:Anshul@localhost:5432/freelanceos"

    # JWT
    SECRET_KEY: str = "freelanceos-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days in minutes

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://freelance-os-rust.vercel.app",
        "https://freelanceos-1.onrender.com",
    ]

    # Demo user
    DEMO_EMAIL: str = "demo@freelanceos.com"
    DEMO_PASSWORD: str = "demo123"
    DEMO_NAME: str = "Alex Johnson"
    DEMO_COMPANY: str = "Alex Johnson Design & Dev"
    DEMO_HOURLY_RATE: float = 95.0
    DEMO_CURRENCY: str = "USD"

    DEFAULT_FROM_EMAIL: str = "onboarding@resend.dev"
    RESEND_API_KEY: Optional[str] = None

    # Supabase (Storage)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None

    # Workspace
    DEFAULT_WORKSPACE_NAME: str = "My Freelance Workspace"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
