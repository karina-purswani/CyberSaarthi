import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage" / "evidence"
DATABASE_PATH = BASE_DIR / "cybersaarthi.db"

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

settings = Settings()

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
