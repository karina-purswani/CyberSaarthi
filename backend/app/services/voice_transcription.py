import os
import wave
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Map platform language codes to Google Speech Recognition BCP-47 tags
LANG_MAP = {
    "en": "en-IN",
    "hi": "hi-IN",
    "mr": "mr-IN"
}

def get_audio_duration_seconds(file_path: Path) -> Optional[float]:
    """
    Computes duration of a PCM WAV file.
    """
    try:
        with wave.open(str(file_path), 'rb') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            if rate > 0:
                return frames / float(rate)
    except Exception:
        pass
    return None

def transcribe_audio_file(file_path: Path, language: str = "en") -> Dict[str, Any]:
    """
    Transcribes spoken statement using SpeechRecognition.
    Supports English (en-IN), Hindi (hi-IN), and Marathi (mr-IN).
    Deterministic error handling without fabricating transcripts.
    """
    import speech_recognition as sr

    lang_tag = LANG_MAP.get(language.lower(), "en-IN")
    recognizer = sr.Recognizer()
    recognizer.energy_threshold = 300
    recognizer.dynamic_energy_threshold = True

    duration = get_audio_duration_seconds(file_path)

    # 1. Enforce duration limit (3 minutes max for incident statements)
    if duration and duration > 180.0:
        return {
            "success": False,
            "error_type": "DURATION_EXCEEDED",
            "transcript": None,
            "message": f"Recorded audio duration ({duration:.1f}s) exceeds the maximum allowed 3 minutes.",
            "duration_seconds": duration,
            "language": lang_tag
        }

    try:
        with sr.AudioFile(str(file_path)) as source:
            # Adjust for ambient noise
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio_data = recognizer.record(source)

        # Call recognizer
        transcript = recognizer.recognize_google(audio_data, language=lang_tag)
        
        if not transcript or not transcript.strip():
            return {
                "success": False,
                "error_type": "EMPTY_TRANSCRIPT",
                "transcript": None,
                "message": "No spoken words were recognized in the audio.",
                "duration_seconds": duration,
                "language": lang_tag
            }

        return {
            "success": True,
            "error_type": None,
            "transcript": transcript.strip(),
            "message": "Spoken statement transcribed successfully.",
            "duration_seconds": duration,
            "language": lang_tag
        }

    except sr.UnknownValueError:
        return {
            "success": False,
            "error_type": "UNRECOGNIZABLE_SPEECH",
            "transcript": None,
            "message": "Could not recognize clear speech from the audio. Please speak clearly into the microphone or enter text manually.",
            "duration_seconds": duration,
            "language": lang_tag
        }
    except sr.RequestError as e:
        logger.warning(f"Speech recognition service request error: {e}")
        return {
            "success": False,
            "error_type": "SERVICE_UNAVAILABLE",
            "transcript": None,
            "message": "Speech transcription service is temporarily unreachable. You may enter your statement text directly in the box below.",
            "duration_seconds": duration,
            "language": lang_tag
        }
    except Exception as e:
        logger.error(f"Error processing audio transcription for {file_path}: {e}")
        return {
            "success": False,
            "error_type": "PROCESSING_ERROR",
            "transcript": None,
            "message": f"Audio processing error: {str(e)}",
            "duration_seconds": duration,
            "language": lang_tag
        }
