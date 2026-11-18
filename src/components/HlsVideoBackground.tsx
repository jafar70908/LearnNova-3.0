import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsVideoBackgroundProps {
  src: string;
  flipped?: boolean;
  overlayClassName?: string;
}

export function HlsVideoBackground({
  src,
  flipped = false,
  overlayClassName = 'bg-black/20',
}: HlsVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Autoplay may be blocked in strict environments; fallback backdrop stays visible
        });
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && hls) {
          hls.destroy();
          hls = null;
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Subtle atmospheric fallback gradient visible before stream buffers or if offline */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(78, 133, 191, 0.16) 0%, rgba(18, 22, 28, 0.72) 55%, rgba(10, 10, 10, 1) 100%)',
        }}
      />
      <div
        className={`absolute -inset-[20%] opacity-40 animate-gradient-shift ${
          flipped ? 'scale-y-[-1]' : ''
        }`}
        style={{
          background:
            'radial-gradient(circle at 30% 35%, rgba(137, 170, 204, 0.14) 0%, transparent 45%), radial-gradient(circle at 70% 65%, rgba(78, 133, 191, 0.14) 0%, transparent 50%)',
        }}
      />
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className={`absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto object-cover -translate-x-1/2 -translate-y-1/2 opacity-80 ${
          flipped ? 'scale-y-[-1]' : ''
        }`}
      />
      <div className={`absolute inset-0 ${overlayClassName}`} />
    </div>
  );
}
