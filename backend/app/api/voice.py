import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.core.config import settings
from app.services.voice_transcription import transcribe_audio_file

router = APIRouter(prefix="/voice", tags=["Voice Transcription"])

TEMP_AUDIO_DIR = settings.storage_dir.parent / "temp_audio"
TEMP_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/transcribe")
async def transcribe_voice(
    audio_file: UploadFile = File(...),
    language: str = Form("en")
):
    """
    Accepts recorded voice audio (WAV) directly from the browser MediaRecorder pipeline,
    transcribes it for English, Hindi, or Marathi, and returns the editable text to the citizen.
    Never invents or fabricates a transcript on failure.
    """
    if not audio_file or not audio_file.filename:
        raise HTTPException(status_code=400, detail="No audio file uploaded.")

    # Validate file size
    file_bytes = await audio_file.read()
    if len(file_bytes) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Audio file exceeds {settings.max_upload_size_mb}MB limit."
        )

    # Save to safe temporary location
    ext = os.path.splitext(audio_file.filename)[1].lower()
    if not ext or ext not in (".wav", ".mp3", ".ogg", ".webm"):
        ext = ".wav"
        
    temp_filename = f"rec_{uuid.uuid4().hex}{ext}"
    temp_path = TEMP_AUDIO_DIR / temp_filename

    try:
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        result = transcribe_audio_file(file_path=temp_path, language=language)
        return result
    finally:
        # Clean up temporary audio file after transcription
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass
