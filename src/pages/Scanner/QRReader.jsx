import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon';

export default function QRReader({ onScan, paused }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [permError, setPermError] = useState(false);
  const [ready, setReady] = useState(false);

  // Keep ref in sync so the RAF closure always has the latest callback
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  // Start camera on mount
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        if (active) setPermError(true);
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Scan loop — runs only when ready and not paused
  useEffect(() => {
    if (!ready || paused) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });

      if (code && code.data) {
        onScanRef.current(code.data);
        return; // stop looping — parent sets paused=true
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [ready, paused]);

  if (permError) {
    return (
      <div style={{
        width: '100%', height: '100%', minHeight: 180,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 12, background: '#16181d',
        borderRadius: 'inherit',
        padding: 24,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(244,63,94,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="camera" size={22} color="#f43f5e" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#f4f4f5', fontWeight: 600, fontSize: 14, marginBottom: 5 }}>
            Camera access denied
          </div>
          <div style={{ color: '#a1a1aa', fontSize: 12.5, lineHeight: 1.55, maxWidth: 220 }}>
            Allow camera access in your browser settings and reload the page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', borderRadius: 'inherit', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      {/* Hidden canvas for frame sampling */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Subtle scanline animation while scanning */}
      {!paused && ready && (
        <div style={{
          position: 'absolute',
          left: '15%', right: '15%',
          top: '50%',
          height: 2,
          background: 'linear-gradient(90deg, transparent, var(--orange), transparent)',
          opacity: 0.7,
          animation: 'scanline 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}
