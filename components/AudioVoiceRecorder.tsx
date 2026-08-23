import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle, RefreshCw } from 'lucide-react';
import { soundService } from '../services/soundService';

interface AudioVoiceRecorderProps {
  onAudioRecorded: (audioDataUrl: string, durationSeconds: number) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export const AudioVoiceRecorder: React.FC<AudioVoiceRecorderProps> = ({
  onAudioRecorded,
  onCancel,
  disabled = false
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
      console.error('Error starting audio recording:', err);
      setRecordingError('Não foi possível aceder ao microfone. Verifique as permissões.');
      soundService.playCrash();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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
      <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
        <span className="flex-1">{recordingError}</span>
        <button
          onClick={() => setRecordingError(null)}
          className="text-[10px] uppercase font-bold text-slate-300 hover:text-white px-2 py-0.5 bg-black/40 rounded"
        >
          OK
        </button>
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
