'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { QR_QUIET, qrFileName, qrMatrix, qrPrintHtml, qrSvg } from '@/lib/stations';
import type { S } from '@/lib/types';
import { Button } from '@/ds/Button';
import { ErrorNote, Modal, Skeleton } from './ui';

type StationRef = Pick<S<'SwapStationAdmin'>, 'id' | 'name' | 'address' | 'active'>;

/** QR desenhado no cliente (SVG), preto no branco com zona de silêncio. */
export function QrImage({ code, size = 280 }: { code: string; size?: number }) {
  const { size: n, path } = qrMatrix(code);
  const total = n + QR_QUIET * 2;
  return (
    <svg role="img" aria-label="QR da estação" data-testid="station-qr-image" width={size} height={size} viewBox={`${-QR_QUIET} ${-QR_QUIET} ${total} ${total}`} shapeRendering="crispEdges">
      <rect x={-QR_QUIET} y={-QR_QUIET} width={total} height={total} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

function download(name: string, code: string): void {
  const url = URL.createObjectURL(new Blob([qrSvg(code)], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = qrFileName(name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Impressão do adesivo num iframe oculto (sem abrir outra janela; o conteúdo é só texto escapado e o SVG). */
function print(station: StationRef, code: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', width: '0', height: '0', border: '0', right: '0', bottom: '0' });
  frame.srcdoc = qrPrintHtml(station, code);
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
  document.body.appendChild(frame);
}

/**
 * QR fixo da estação para imprimir ou baixar (`GET /swap-stations/{id}/qr`, admin/operacao). O código não fica em cache:
 * é lido de novo a cada abertura e descartado ao fechar.
 */
export function StationQrModal({ station, onClose }: { station: StationRef; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['swap-station-qr', station.id],
    queryFn: () => unwrap(api.GET('/swap-stations/{id}/qr', { params: { path: { id: station.id } } })),
    gcTime: 0,
    staleTime: 0,
  });
  const code = q.data?.stationCode;
  return (
    <Modal open title={`QR · ${station.name}`} onClose={onClose} width={420} testId="station-qr-modal"
      actions={<>
        <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
        <Button size="sm" variant="ghost" icon="Download" testId="station-qr-download" disabled={!code} onClick={() => code && download(station.name, code)}>Baixar SVG</Button>
        <Button size="sm" variant="dark" icon="FileText" testId="station-qr-print" disabled={!code} onClick={() => code && print(station, code)}>Imprimir</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {q.isLoading && <Skeleton w={280} h={280} r={12} />}
        <ErrorNote error={q.error} onRetry={() => q.refetch()} />
        {code && <QrImage code={code} />}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Cole o adesivo na estação, à vista do cliente. O código é fixo: reimprimir dá o mesmo QR.
          {!station.active && ' A estação está inativa: o app recusa a troca até reativar.'}
        </div>
      </div>
    </Modal>
  );
}
