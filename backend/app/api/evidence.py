import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import FileResponse
from app.core.config import settings
from app.core.security import get_optional_user
from app.db.database import get_connection

router = APIRouter(prefix="/evidence", tags=["Evidence"])

@router.get("/file/{storage_filename}")
def stream_evidence_file(
    storage_filename: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Safely streams uploaded evidence file.
    Enforces strict path containment within settings.storage_dir to prevent directory traversal.
    Enforces authorization check: Citizens can only stream evidence belonging to their own complaints.
    """
    safe_name = os.path.basename(storage_filename)
    file_path = (settings.storage_dir / safe_name).resolve()
    
    # Path containment check
    storage_root = settings.storage_dir.resolve()
    if not str(file_path).startswith(str(storage_root)):
        raise HTTPException(status_code=400, detail="Invalid path request.")
        
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Evidence file not found.")

    # Authorization check against database
    conn = get_connection()
    try:
        ev = conn.execute(
            """
            SELECT ef.id, ef.complaint_id, c.user_id 
            FROM evidence_files ef
            JOIN complaints c ON ef.complaint_id = c.id
            WHERE ef.storage_filename = ?
            """,
            (safe_name,)
        ).fetchone()

        if ev and current_user and current_user.get("role") == "CITIZEN":
            if ev["user_id"] != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. You do not have permission to view evidence from this complaint."
                )
    finally:
        conn.close()

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
def get_evidence_details(
    evidence_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Returns full evidence record including raw OCR text, confidence, and structured fields.
    Restricts access if the evidence belongs to another citizen.
    """
    conn = get_connection()
    try:
        ev = conn.execute(
            """
            SELECT ef.*, c.user_id, c.reference_id
            FROM evidence_files ef
            JOIN complaints c ON ef.complaint_id = c.id
            WHERE ef.id = ?
            """,
            (evidence_id,)
        ).fetchone()
        
        if not ev:
            raise HTTPException(status_code=404, detail="Evidence not found.")

        if current_user and current_user.get("role") == "CITIZEN":
            if ev["user_id"] != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. You do not have permission to inspect this evidence."
                )

        fields = conn.execute(
            "SELECT * FROM extracted_fields WHERE evidence_id = ?",
            (evidence_id,)
        ).fetchall()
        
        return {
            "id": ev["id"],
            "complaint_id": ev["complaint_id"],
            "reference_id": ev["reference_id"],
            "original_filename": ev["original_filename"],
            "storage_filename": ev["storage_filename"],
            "file_type": ev["file_type"],
            "file_size_bytes": ev["file_size_bytes"],
            "ocr_status": ev["ocr_status"],
            "raw_ocr_text": ev["raw_ocr_text"],
            "ocr_confidence": ev["ocr_confidence"],
            "created_at": ev["created_at"],
            "extracted_fields": [dict(f) for f in fields]
        }
    finally:
        conn.close()
