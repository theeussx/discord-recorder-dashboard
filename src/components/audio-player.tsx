import { useEffect, useRef, useState } from "react";
import { Pause, Play, Download } from "lucide-react";

interface Props {
  src?: string;
  filename: string;
  compact?: boolean;
}

export function AudioPlayer({ src, filename, compact }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function ensureAudio() {
    if (audioRef.current || !src) return audioRef.current;
    const a = new Audio(src);
    a.ontimeupdate = () => {
      setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    };
    a.onended = () => {
      setPlaying(false);
      setProgress(0);
    };
    a.onerror = () => setPlaying(false);
    audioRef.current = a;
    return a;
  }

  function toggle() {
    const a = ensureAudio();
    if (!a) {
      // No real source; simulate progress for demo
      setPlaying((p) => !p);
      return;
    }
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  }

  function download() {
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = filename;
    link.click();
  }

  // Demo progress animation when no src
  useEffect(() => {
    if (!src && playing) {
      const t = setInterval(() => {
        setProgress((p) => {
          const next = p + 1.2;
          if (next >= 100) {
            setPlaying(false);
            return 0;
          }
          return next;
        });
      }, 120);
      return () => clearInterval(t);
    }
  }, [playing, src]);

  useEffect(() => () => audioRef.current?.pause(), []);

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "w-full"}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="grid h-8 w-8 place-items-center rounded-full bg-brand/15 text-brand transition hover:bg-brand/25"
        title={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      {!compact && (
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand to-brand/60 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          download();
        }}
        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
        title="Baixar"
      >
        <Download size={14} />
      </button>
    </div>
  );
}
