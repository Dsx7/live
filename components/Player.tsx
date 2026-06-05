'use client';
import { useEffect, useRef, useState } from 'react';
import type { Channel } from '@/lib/parser';

interface PlayerProps {
  channel: Channel;
  onClose: () => void;
}

export default function Player({ channel, onClose }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const ttmlRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const hlsRef = useRef<unknown>(null);
  const dashRef = useRef<unknown>(null);

  const destroyPlayers = () => {
    if (hlsRef.current) {
      (hlsRef.current as { destroy: () => void }).destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      (dashRef.current as { reset: () => void; destroy: () => void }).destroy();
      dashRef.current = null;
    }
  };

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    destroyPlayers();
    setStatus('loading');
    setErrorMsg('');

    const loadStream = async () => {
      if (channel.type === 'dash') {
        try {
          const dashjs = await import('dashjs');
          const player = dashjs.MediaPlayer().create();

          // Suppress verbose TTML subtitle warnings — attach the rendering div
          if (ttmlRef.current) {
            player.attachTTMLRenderingDiv(ttmlRef.current as HTMLDivElement);
          }

          player.initialize(video, channel.url, true);

          player.on('error', (e: { error?: { code?: number } }) => {
            // Ignore non-fatal / subtitle-related errors (code 111 = TTML)
            const code = e?.error?.code;
            if (code === 111) return;
            setStatus('error');
            setErrorMsg('DASH stream unavailable');
          });

          player.on('playbackPlaying', () => setStatus('playing'));
          dashRef.current = player;
        } catch {
          setStatus('error');
          setErrorMsg('Could not load DASH player');
        }
      } else {
        // HLS
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS (Safari/iOS)
          video.src = channel.url;
          video.play().catch(() => setStatus('error'));
          video.onplaying = () => setStatus('playing');
          video.onerror = () => { setStatus('error'); setErrorMsg('Stream unavailable'); };
        } else {
          try {
            const Hls = (await import('hls.js')).default;
            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 30,
              });
              hls.loadSource(channel.url);
              hls.attachMedia(video);
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {});
                setStatus('playing');
              });
              hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal: boolean }) => {
                if (data.fatal) {
                  setStatus('error');
                  setErrorMsg('HLS stream unavailable');
                }
              });
              hlsRef.current = hls;
            } else {
              video.src = channel.url;
              video.play().catch(() => setStatus('error'));
              video.onplaying = () => setStatus('playing');
              video.onerror = () => setStatus('error');
            }
          } catch {
            setStatus('error');
            setErrorMsg('Could not load HLS player');
          }
        }
      }
    };

    loadStream();

    return () => {
      destroyPlayers();
      video.src = '';
    };
  }, [channel]);

  const handleFullscreen = async () => {
    const el = playerContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  const handlePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {}
  };

  const retry = () => {
    setStatus('loading');
    const video = videoRef.current;
    if (video) {
      video.load();
    }
  };

  return (
    <div className="player-section">
      <div className="player-card" ref={playerContainerRef}>
        {/* Header */}
        <div className="player-topbar">
          <div className="player-channel-info">
            {channel.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.logo} alt={channel.name} className="player-ch-logo"
                onError={e => (e.currentTarget.style.display = 'none')} />
            )}
            <div>
              <p className="player-ch-name">{channel.name}</p>
              <p className="player-ch-group">{channel.group}</p>
            </div>
            <div className="live-pill"><span className="live-dot"></span>LIVE</div>
          </div>
          <div className="player-actions">
            <button className="player-btn" onClick={handlePiP} title="Picture in Picture">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <rect x="13" y="10" width="8" height="5" rx="1" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button className="player-btn" onClick={handleFullscreen} title="Fullscreen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
            <button className="player-btn player-btn-close" onClick={onClose} title="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="video-wrapper">
          <video
            ref={videoRef}
            className="video-el"
            controls
            playsInline
            autoPlay
          />
          {/* Required by dash.js to render TTML subtitles — must sit over the video */}
          <div ref={ttmlRef} className="ttml-rendering-div" />

          {status === 'loading' && (
            <div className="player-overlay">
              <div className="spinner"></div>
              <p>Loading stream...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="player-overlay player-overlay-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="52" height="52">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="err-title">Stream Unavailable</p>
              <p className="err-sub">{errorMsg || 'This channel may be offline or geo-restricted'}</p>
              <button className="btn-retry" onClick={retry}>↻ Retry</button>
            </div>
          )}
        </div>

        {/* Stream info */}
        <div className="player-footer">
          <span className="stream-tag">{channel.type.toUpperCase()}</span>
          {channel.hasDrm && <span className="stream-tag drm-tag">DRM</span>}
          <span className="stream-url" title={channel.url}>{channel.url.slice(0, 60)}…</span>
        </div>
      </div>
    </div>
  );
}
