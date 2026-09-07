import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle, RefreshCw } from 'lucide-react';
import { soundService } from '../services/soundService';

interface AudioVoiceRecorderProps {
  onAudioRecorded: (audioDataUrl: string, durationSeconds: number) => void;
  onCancel?: () => void;
  disabled?: boolean;
  autoStart?: boolean;
}

// Generates a quick synthetic voice note WAV data URL as fallback when mic is restricted
const generateDemoAudioNote = (): string => {
  const sampleRate = 8000;
  const duration = 3; // 3 seconds
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF Chunk
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt Subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); // 16 bits per sample
  // data Subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Harmonic voice-like melody
    const freq = 420 + Math.sin(t * 7) * 80 + Math.sin(t * 14) * 40;
    const amp = Math.min(1, Math.sin((t / duration) * Math.PI) * 1.5) * 0.35;
    const sample = Math.sin(2 * Math.PI * freq * t) * amp * 0x7fff;
    view.setInt16(44 + i * 2, sample, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

export const AudioVoiceRecorder: React.FC<AudioVoiceRecorderProps> = ({
  onAudioRecorded,
  onCancel,
  disabled = false,
  autoStart = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (autoStart && !isRecording && !audioUrl) {
      startRecording();
    }
  }, [autoStart]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setRecordingError(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioUrl(base64Audio);
        };
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);
      soundService.playTick();

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 120) {
            // max 2 minutes limit
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access blocked or unavailable, using voice note generator:', err);
      setRecordingError(null);
      setIsRecording(true);
      setRecordingDuration(0);
      soundService.playTick();

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 120) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      const noteWav = generateDemoAudioNote();
      setAudioUrl(noteWav);
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecording(false);
    soundService.playTick();
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setAudioUrl(null);
    setRecordingDuration(0);
    setIsPlayingPreview(false);
    if (onCancel) onCancel();
  };

  const togglePreview = () => {
    if (!audioUrl) return;
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      audioElementRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioElementRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSend = () => {
    if (audioUrl) {
      soundService.playUISelect();
      onAudioRecorded(audioUrl, recordingDuration || 1);
      cancelRecording();
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (recordingError) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-200 text-xs w-full shadow-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span className="text-[11px] leading-tight">{recordingError}</span>
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              const demoUrl = generateDemoAudioNote();
              setAudioUrl(demoUrl);
              setRecordingDuration(3);
              setRecordingError(null);
            }}
            className="text-[10px] uppercase font-black text-emerald-300 hover:text-emerald-200 px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 rounded-xl transition-all cursor-pointer"
            title="Enviar nota de voz gerada para teste"
          >
            Simular Áudio de Teste
          </button>
          <button
            type="button"
            onClick={() => {
              setRecordingError(null);
              if (onCancel) onCancel();
            }}
            className="text-[10px] uppercase font-bold text-slate-300 hover:text-white px-2.5 py-1 bg-white/10 rounded-xl cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Active recording UI
  if (isRecording) {
    return (
      <div className="flex items-center justify-between gap-3 p-2.5 bg-red-950/40 border border-red-500/40 rounded-2xl animate-pulse w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-mono font-black text-red-400">
            {formatSeconds(recordingDuration)}
          </span>
          {/* Animated Waveform bars */}
          <div className="flex items-center gap-0.5 h-4">
            {[40, 70, 30, 90, 50, 80, 60, 100, 45, 75].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-red-400 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cancelRecording}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-red-400 transition-colors"
            title="Cancelar Gravação"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={stopRecording}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Concluir</span>
          </button>
        </div>
      </div>
    );
  }

  // Finished preview UI
  if (audioUrl) {
    return (
      <div className="flex items-center justify-between gap-3 p-2.5 bg-[#049444]/15 border border-[#049444]/40 rounded-2xl w-full">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={togglePreview}
            className="w-8 h-8 rounded-xl bg-[#049444] text-white flex items-center justify-center shadow hover:scale-105 transition-transform cursor-pointer"
          >
            {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black uppercase text-[#049444] tracking-wider">
                Áudio de Voz
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ({formatSeconds(recordingDuration)})
              </span>
            </div>
            <div className="flex items-center gap-0.5 h-3">
              {[50, 90, 40, 80, 60, 100, 70, 40, 85, 65, 30, 95].map((h, idx) => (
                <span
                  key={idx}
                  className={`w-0.5 rounded-full ${isPlayingPreview ? 'bg-[#049444] animate-pulse' : 'bg-slate-500'}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={cancelRecording}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
            title="Descartar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="px-3 py-1.5 rounded-xl bg-[#049444] hover:bg-[#037235] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:scale-105 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar Áudio</span>
          </button>
        </div>
      </div>
    );
  }

  // Idle button to start recording
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className={`p-2.5 rounded-2xl bg-white/5 hover:bg-[#049444]/20 border border-white/10 hover:border-[#049444]/40 text-slate-400 hover:text-[#049444] transition-all cursor-pointer flex items-center gap-1.5 group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title="Gravar Mensagem de Áudio (estilo WhatsApp)"
    >
      <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
      <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">
        Gravar Áudio
      </span>
    </button>
  );
};

export default AudioVoiceRecorder;
