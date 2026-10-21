from fastapi import APIRouter
from datetime import datetime
from app.core.config import settings
from app.db.database import get_connection
from app.services.evidence_extraction import get_ocr_engine

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    # Verify DB connectivity
    db_status = "error"
    try:
        conn = get_connection()
        conn.execute("SELECT 1")
        conn.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"unreachable: {str(e)}"

    ocr = get_ocr_engine()
    ocr_status = "rapidocr_active" if ocr else "fallback_active"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "app_name": settings.app_name,
        "version": "1.0.0",
        "environment": settings.environment,
        "database": db_status,
        "ocr_engine": ocr_status,
        "timestamp": datetime.now().isoformat()
    }
