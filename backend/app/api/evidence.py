import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from app.core.config import settings
from app.db.database import get_connection

router = APIRouter(prefix="/evidence", tags=["Evidence"])

@router.get("/file/{storage_filename}")
def stream_evidence_file(storage_filename: str):
    """
    Safely stream uploaded evidence file.
    Enforces strict path containment within settings.storage_dir to prevent directory traversal.
    """
    # Sanitize storage_filename
    safe_name = os.path.basename(storage_filename)
    file_path = (settings.storage_dir / safe_name).resolve()
    
    # Path containment check
    storage_root = settings.storage_dir.resolve()
    if not str(file_path).startswith(str(storage_root)):
        raise HTTPException(status_code=400, detail="Invalid path request.")
        
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Evidence file not found.")

    # Determine media type
    ext = file_path.suffix.lower()
    media_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg"
    }
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(path=file_path, media_type=media_type)

@router.get("/{evidence_id}")
def get_evidence_details(evidence_id: str):
    """
    Returns full evidence record including raw OCR text, confidence, and structured fields.
    """
    conn = get_connection()
    try:
        ev = conn.execute("SELECT * FROM evidence_files WHERE id = ?", (evidence_id,)).fetchone()
        if not ev:
            raise HTTPException(status_code=404, detail="Evidence not found.")
            
        fields = conn.execute(
            "SELECT * FROM extracted_fields WHERE evidence_id = ?",
            (evidence_id,)
        ).fetchall()
        
        return {
            "id": ev["id"],
            "complaint_id": ev["complaint_id"],
            "original_filename": ev["original_filename"],
            "storage_filename": ev["storage_filename"],
            "file_type": ev["file_type"],
            "file_size_bytes": ev["file_size_bytes"],
            "ocr_status": ev["ocr_status"],
            "ocr_confidence": ev["ocr_confidence"],
            "raw_ocr_text": ev["raw_ocr_text"],
            "created_at": ev["created_at"],
            "extracted_fields": [dict(f) for f in fields]
        }
    finally:
        conn.close()
