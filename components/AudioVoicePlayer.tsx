import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Mic } from 'lucide-react';
import { soundService } from '../services/soundService';

interface AudioVoicePlayerProps {
  audioUrl: string;
  duration?: number;
  senderName?: string;
  className?: string;
}

export const AudioVoicePlayer: React.FC<AudioVoicePlayerProps> = ({
  audioUrl,
  duration,
  senderName,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.error('Audio playback error:', err));
    }
  };

  const cycleSpeed = () => {
    soundService.playTick();
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const seekTime = pos * totalDuration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const remainder = s % 60;
    return `${m}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={`p-3 rounded-2xl bg-[#0f172a]/80 border border-emerald-500/30 flex flex-col gap-2 shadow-md max-w-sm ${className}`}>
      {senderName && (
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <Mic className="w-3 h-3" />
            <span>Nota de Voz de {senderName}</span>
          </span>
          <span>{isPlaying ? 'A reproduzir...' : 'Áudio gravado'}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-[#049444] hover:bg-[#037235] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Waveform & Scrubber */}
        <div className="flex-1 space-y-1.5">
          <div
            onClick={handleSeek}
            className="h-6 flex items-center gap-0.5 cursor-pointer relative group px-1"
          >
            {/* Visual soundwave bars */}
            {[
              30, 60, 90, 45, 75, 100, 50, 85, 40, 70, 95, 60, 30, 80, 50, 90, 65, 40, 85, 100, 45, 70, 35, 80, 60, 40, 90
            ].map((height, idx) => {
              const barPercent = (idx / 27) * 100;
              const isPast = barPercent <= progressPercent;
              return (
                <span
                  key={idx}
                  className={`w-1 rounded-full transition-all ${
                    isPast
                      ? 'bg-[#049444]'
                      : 'bg-slate-700 group-hover:bg-slate-600'
                  }`}
                  style={{
                    height: `${height}%`,
                    transform: isPlaying && isPast ? 'scaleY(1.15)' : 'none'
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Speed multiplier chip */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-black uppercase font-mono tracking-tighter border border-white/10 shrink-0 cursor-pointer"
          title="Alterar Velocidade de Reprodução"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
};

export default AudioVoicePlayer;
