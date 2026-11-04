'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/ds/Alert';

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

const SCAN_INTERVAL_MS = 250;

/**
 * Câmera do computador lendo o QR do cliente com a API `BarcodeDetector` (só é montada quando ela existe; ver
 * `cameraScanSupported`). Para a câmera ao ler o código e ao desmontar (diálogo fechado). O valor lido vai direto
 * para `onCode` e nunca é mostrado nem registrado.
 */
export function QrCameraScanner({ onCode }: { onCode: (raw: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const done = useRef(onCode);
  done.current = onCode;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const stop = () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      if (video.current) video.current.srcObject = null;
    };
    (async () => {
      try {
        const Detector = (globalThis as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
        const detector = new Detector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const el = video.current!;
        el.srcObject = stream;
        await el.play().catch(() => undefined);
        const tick = async () => {
          if (stopped) return;
          try {
            const found = el.readyState >= 2 ? await detector.detect(el) : [];
            const raw = found.find((b) => b.rawValue)?.rawValue;
            if (raw && !stopped) { stop(); done.current(raw); return; }
          } catch { /* quadro sem leitura: tenta no próximo */ }
          if (!stopped) timer = setTimeout(tick, SCAN_INTERVAL_MS);
        };
        tick();
      } catch {
        if (!stopped) setError('Não foi possível abrir a câmera. Use o campo do código (leitor USB ou colar).');
        stop();
      }
    })();
    return stop;
  }, []);

  return (
    <div data-testid="pickup-qr-camera" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {error ? <Alert tone="danger">{error}</Alert> : (
        <video ref={video} muted playsInline aria-label="Câmera lendo o QR do cliente"
          style={{ width: '100%', maxHeight: 260, borderRadius: 'var(--radius-md)', background: 'var(--ink-900, #111)', objectFit: 'cover' }} />
      )}
    </div>
  );
}
