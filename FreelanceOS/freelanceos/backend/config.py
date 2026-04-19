from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "FreelanceOS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Database - Load from .env, fallback to localhost
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:Anshul@localhost:5432/freelanceos"
    )

    # JWT
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "freelanceos-super-secret-key-change-in-production-2024"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200

    # CORS - Dynamic frontend URL
    FRONTEND_URL: str = os.getenv(
        "FRONTEND_URL",
        "https://freelance-os-system-w8mv.vercel.app"
    )
    BACKEND_URL: str = os.getenv(
        "BACKEND_URL",
        "https://freelance-os-system.onrender.com"
    )
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://freelance-os-system-w8mv.vercel.app",
        "https://freelance-os-system-w8mv-fqpzkclkw-god-s-projects-04ef3be1.vercel.app",
        "https://freelance-os-system-1.onrender.com",
    ]

    # Demo user
    DEMO_EMAIL: str = "demo@freelanceos.com"
    DEMO_PASSWORD: str = "demo123"
    DEMO_NAME: str = "Alex Johnson"
    DEMO_COMPANY: str = "Alex Johnson Design & Dev"
    DEMO_HOURLY_RATE: float = 95.0
    DEMO_CURRENCY: str = "USD"

    DEFAULT_FROM_EMAIL: str = "onboarding@resend.dev"
    RESEND_API_KEY: Optional[str] = os.getenv("RESEND_API_KEY")

    # Supabase (Storage)
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY")

    # Workspace
    DEFAULT_WORKSPACE_NAME: str = "My Freelance Workspace"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
