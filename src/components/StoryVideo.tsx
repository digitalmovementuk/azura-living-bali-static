import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export function StoryVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;

    if (reduceMotion) {
      video.pause();
      return;
    }

    let inView = false;
    const playWhenReady = () => {
      if (!inView || document.hidden) return;
      video.play().catch(() => undefined);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) playWhenReady();
        else video.pause();
      },
      { threshold: 0.28 },
    );
    const handleVisibility = () => {
      if (document.hidden) video.pause();
      else playWhenReady();
    };

    observer.observe(video);
    video.addEventListener('loadeddata', playWhenReady);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      observer.disconnect();
      video.removeEventListener('loadeddata', playWhenReady);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [reduceMotion]);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (video.paused) video.play().catch(() => undefined);
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <div className="story-video">
      <video
        ref={videoRef}
        data-testid="founder-video"
        autoPlay={!reduceMotion}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        poster="/assets/images/ayham-founder-poster.jpg"
        aria-label="Ayham Muhrez, Founder of Azura Living Bali, sharing the Azura vision"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
      >
        <source src="/assets/video/ayham-founder-story.mp4" type="video/mp4" />
        Your browser does not support video playback.
      </video>
      <div className="story-video__shade" aria-hidden="true" />
      <div className="story-video__meta">
        <span>Ayham Muhrez</span>
        <strong>Founder · Azura Living Bali</strong>
      </div>
      <div className="story-video__controls" aria-label="Founder film controls">
        <button type="button" onClick={togglePlayback} aria-label={playing ? 'Pause founder film' : 'Play founder film'}>
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          <span>{playing ? 'Pause' : 'Play'}</span>
        </button>
        <button type="button" onClick={toggleSound} aria-label={muted ? 'Turn on founder film sound' : 'Mute founder film'}>
          {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          <span>{muted ? 'Listen' : 'Mute'}</span>
        </button>
      </div>
    </div>
  );
}
