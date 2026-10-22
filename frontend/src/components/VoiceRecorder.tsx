import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Trash2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { transcribeVoiceAudio } from '../services/api';

interface VoiceRecorderProps {
  language: string;
  onTranscriptionComplete: (text: string) => void;
  onAudioReady?: (blob: Blob) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  language,
  onTranscriptionComplete,
  onAudioReady
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionSuccess, setTranscriptionSuccess] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopStream();
    };
  }, []);

  const stopStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscriptionSuccess(null);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Voice recording is not supported in this browser. Please enter your complaint as text.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 16kHz mono audio for clean speech recognition
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // Buffer size 4096, 1 input channel, 1 output channel
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isPaused) {
          const inputData = e.inputBuffer.getChannelData(0);
          audioChunksRef.current.push(new Float32Array(inputData));
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration(prev => {
          if (prev >= 180) { // Auto-stop at 3 minutes
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage("Microphone access denied. Please allow microphone permissions in your browser settings to speak.");
      } else {
        setErrorMessage("Could not initialize microphone: " + error.message);
      }
      stopStream();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);

    // Encode audio chunks to 16-bit PCM WAV
    const wavBlob = encodeWAV(audioChunksRef.current, 16000);
    stopStream();

    if (wavBlob.size < 1000) {
      setErrorMessage("No audio was recorded. Please check your microphone and try again.");
      return;
    }

    const url = URL.createObjectURL(wavBlob);
    setAudioUrl(url);
    setAudioBlob(wavBlob);
    if (onAudioReady) onAudioReady(wavBlob);

    setStatusMessage("Recording saved. Click 'Transcribe Speech' or review the playback.");
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);
    setErrorMessage(null);
    setStatusMessage("Processing audio through speech recognition engine...");

    try {
      const res = await transcribeVoiceAudio(audioBlob, language);
      if (res.success && res.transcript) {
        setTranscriptionSuccess(true);
        setStatusMessage(res.message || "Spoken statement transcribed. Please review and edit below.");
        onTranscriptionComplete(res.transcript);
      } else {
        setTranscriptionSuccess(false);
        setErrorMessage(res.message || "Could not transcribe speech. You can type your statement directly.");
      }
    } catch (err: unknown) {
      setTranscriptionSuccess(false);
      const error = err as Error;
      setErrorMessage(error.message || "Failed to contact transcription service.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handlePlaybackToggle = () => {
    if (!audioElementRef.current && audioUrl) {
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      audio.onended = () => setIsPlaying(false);
    }

    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElementRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleReset = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    stopStream();
    setAudioUrl(null);
    setAudioBlob(null);
    setIsPlaying(false);
    setDuration(0);
    setErrorMessage(null);
    setStatusMessage(null);
    setTranscriptionSuccess(null);
  };

  // Helper to encode raw float samples into valid 16-bit PCM WAV file
  const encodeWAV = (samplesChunks: Float32Array[], sampleRate: number): Blob => {
    const totalLength = samplesChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of samplesChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const buffer = new ArrayBuffer(44 + merged.length * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + merged.length * 2, true);
    writeString(view, 8, 'WAVE');
    
    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true);  // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true);  // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // BitsPerSample (16 bits)

    // Data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, merged.length * 2, true);

    // Float to 16-bit PCM
    let idx = 44;
    for (let i = 0; i < merged.length; i++, idx += 2) {
      const s = Math.max(-1, Math.min(1, merged[i]));
      view.setInt16(idx, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      backgroundColor: 'var(--surface-subtle)',
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: isRecording ? '#FEE2E2' : 'var(--brand-subtle)',
            color: isRecording ? '#DC2626' : 'var(--brand-teal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Mic size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Direct Voice Statement
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Speak in English, Hindi, or Marathi (max 3 minutes)
            </div>
          </div>
        </div>

        {/* Recording Timer */}
        {(isRecording || duration > 0) && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isRecording ? '#FEF2F2' : 'var(--surface-secondary)',
            color: isRecording ? '#991B1B' : 'var(--text-primary)',
            border: `1px solid ${isRecording ? '#FECACA' : 'var(--border-light)'}`
          }}>
            {formatTime(duration)}
          </div>
        )}
      </div>

      {/* Recording Wave Indicator */}
      {isRecording && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#DC2626',
            animation: 'pulse 1.2s infinite'
          }} />
          <span style={{ fontSize: '0.8125rem', color: '#991B1B', fontWeight: 500 }}>
            Microphone active — Listening to your statement... Speak clearly.
          </span>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        {!isRecording && !audioBlob && (
          <button
            type="button"
            onClick={startRecording}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--brand-teal)',
              color: '#FFFFFF',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Mic size={15} />
            <span>Start Speaking</span>
          </button>
        )}

        {isRecording && (
          <button
            type="button"
            onClick={stopRecording}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Square size={15} />
            <span>Finish Speaking</span>
          </button>
        )}

        {audioBlob && (
          <>
            {/* Playback preview */}
            <button
              type="button"
              onClick={handlePlaybackToggle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--surface-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'Pause Audio' : 'Listen Recording'}</span>
            </button>

            {/* Transcribe Trigger */}
            <button
              type="button"
              onClick={handleTranscribe}
              disabled={isTranscribing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--brand-teal)',
                color: '#FFFFFF',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: isTranscribing ? 'not-allowed' : 'pointer',
                opacity: isTranscribing ? 0.7 : 1
              }}
            >
              <Sparkles size={14} />
              <span>{isTranscribing ? 'Transcribing...' : 'Transcribe Speech to Text'}</span>
            </button>

            {/* Retake */}
            <button
              type="button"
              onClick={startRecording}
              title="Record again"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} />
              <span>Retake</span>
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={handleReset}
              title="Remove recording"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'transparent',
                color: '#991B1B',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </>
        )}
      </div>

      {/* Status Messages */}
      {statusMessage && !errorMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginTop: '0.75rem',
          fontSize: '0.78125rem',
          color: transcriptionSuccess ? '#065F46' : 'var(--text-secondary)'
        }}>
          {transcriptionSuccess ? <CheckCircle2 size={14} color="#065F46" /> : null}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginTop: '0.75rem',
          fontSize: '0.78125rem',
          color: '#991B1B',
          backgroundColor: '#FEF2F2',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid #FECACA'
        }}>
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
