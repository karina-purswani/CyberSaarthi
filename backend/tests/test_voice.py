import io
import wave
import struct
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_synthetic_wav_bytes(duration_sec: float = 1.0, framerate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(framerate)
        num_frames = int(duration_sec * framerate)
        wf.writeframes(struct.pack('<' + ('h' * num_frames), *([0] * num_frames)))
    return buf.getvalue()

def test_transcribe_silence_audio():
    wav_bytes = create_synthetic_wav_bytes(duration_sec=1.5)
    files = {"audio_file": ("test_recording.wav", wav_bytes, "audio/wav")}
    res = client.post("/api/voice/transcribe", data={"language": "en"}, files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["error_type"] in ("UNRECOGNIZABLE_SPEECH", "EMPTY_TRANSCRIPT", "SERVICE_UNAVAILABLE")
    assert "language" in data
    assert data["transcript"] is None

def test_transcribe_missing_audio():
    res = client.post("/api/voice/transcribe", data={"language": "hi"})
    assert res.status_code == 422 or res.status_code == 400
