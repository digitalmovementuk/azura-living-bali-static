import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';

type AmbientVideoProps = {
  src: string;
  type?: string;
  poster: string;
  label: string;
  testId?: string;
  className?: string;
};

export function AmbientVideo({ src, type = 'video/mp4', poster, label, testId, className = '' }: AmbientVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;

    if (reduceMotion) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !document.hidden) video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <video
      ref={videoRef}
      className={`ambient-video ${className}`}
      data-testid={testId}
      autoPlay={!reduceMotion}
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-label={label}
    >
      <source src={src} type={type} />
    </video>
  );
}
