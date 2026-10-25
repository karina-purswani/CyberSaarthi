import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage" / "evidence"
DATABASE_PATH = BASE_DIR / "cybersaarthi.db"

# Automatically parse .env file if present in BASE_DIR, frontend, backend, or cwd
def _load_env_file():
    env_paths = [
        BASE_DIR / ".env",
        BASE_DIR / "frontend" / ".env",
        BASE_DIR / "backend" / ".env",
        Path.cwd() / ".env"
    ]
    for path in env_paths:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        # Allow non-empty values to override previously empty variables
                        if k not in os.environ or not os.environ[k]:
                            os.environ[k] = v
            except Exception:
                pass

_load_env_file()

class Settings(BaseModel):
    app_name: str = "CyberSaarthi Cyber-Fraud Evidence Intelligence Platform"
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    port: int = int(os.getenv("PORT", 8000))
    host: str = os.getenv("HOST", "127.0.0.1")
    
    database_url: str = f"sqlite:///{DATABASE_PATH}"
    storage_dir: Path = STORAGE_DIR
    max_upload_size_mb: int = 15
    allowed_image_types: list[str] = ["image/jpeg", "image/png", "image/webp"]
    allowed_audio_types: list[str] = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/webm"]
    
    jwt_secret_key: str = os.getenv("CYBERSAARTHI_JWT_SECRET", "cybersaarthi-dev-secret-key-32chars-minimum-entropy")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 hours
    
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Email / SMTP Configuration
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", 587))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_tls: bool = os.getenv("SMTP_TLS", "true").lower() == "true"
    smtp_ssl: bool = os.getenv("SMTP_SSL", "false").lower() == "true"
    email_from: str = os.getenv("EMAIL_FROM", "CyberSaarthi Platform <no-reply@cybersaarthi.local>")
    test_recipient_email: str = os.getenv("CYBERSAARTHI_TEST_EMAIL", "purswani2276@gmail.com")
    frontend_base_url: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")

settings = Settings()

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
