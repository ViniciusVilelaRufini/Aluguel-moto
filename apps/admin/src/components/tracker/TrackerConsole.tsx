'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { can } from '@/lib/permissions';
import { formatDateTime } from '@/lib/format';
import { CHANGE_CONFIRM_TEXT, CONSOLE_PRESETS, apnMismatch, consoleRisk } from '@/lib/tracker-console';
import type { S, StaffGroup } from '@/lib/types';
import { Button } from '@/ds/Button';
import { Alert } from '@/ds/Alert';
import { ErrorNote, Modal, Pill, SectionTitle, TextInput } from '../ui';

type Cmd = S<'TrackerConsoleCommand'>;
type Report = S<'TrackerStatusReport'>;

const POLL_MS = 3000;

function failLabel(reason: Cmd['failReason']): string {
  if (reason === 'offline') return 'Rastreador offline';
  if (reason === 'timeout') return 'Sem resposta em 90 s';
  return 'Falha ao enviar o comando';
}

function statusPill(c: Cmd) {
  if (c.status === 'pending') return <Pill tone="info">Aguardando</Pill>;
  if (c.status === 'answered') return <Pill tone="success">Respondido</Pill>;
  return <Pill tone="danger">Falhou: {failLabel(c.failReason)}</Pill>;
}

const yn = (v: boolean | null | undefined, on: string, off: string) => (v == null ? '—' : v ? on : off);
const volts = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(2).replace('.', ',')} V`);

/** Resposta de `STATUS#` decodificada pela API. */
export function StatusReportTable({ report }: { report: Report }) {
  const rows: [string, string][] = [
    ['Bateria interna', volts(report.batteryVolts)],
    ['Alimentação', volts(report.externalVolts)],
    ['Dados móveis', yn(report.gprsOnline, 'Online', 'Offline')],
    ['Sinal (CSQ)', report.csq == null ? '—' : String(report.csq)],
    ['Ignição', yn(report.acc, 'Ligada', 'Desligada')],
    ['GPS', yn(report.gpsOn, 'Ligado', 'Desligado')],
    ['Relé', yn(report.relay, 'Cortado', 'Liberado')],
    ['Sono', yn(report.sleep, 'Dormindo', 'Acordado')],
  ];
  return (
    <table data-testid="console-status-report" style={{ borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ padding: '2px 12px 2px 0', color: 'var(--text-secondary)' }}>{k}</td>
            <td style={{ padding: '2px 0', fontWeight: 600 }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Console de texto do rastreador J16 (só admin, só `relay_only`). */
export function TrackerConsole({ vehicleId, groups, mode, simApn }: {
  vehicleId: string; groups: StaffGroup[]; mode: S<'Vehicle'>['trackerControlMode'] | undefined; simApn: string | null;
}) {
  const allowed = can(groups, 'trackerConsole.use') && mode === 'relay_only';
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ['tracker-console', vehicleId],
    enabled: allowed,
    queryFn: () => unwrap(api.GET('/vehicles/{id}/tracker-console', { params: { path: { id: vehicleId }, query: { limit: 20 } } })),
    refetchInterval: (q: { state: { data?: { items: Cmd[] } } }) => (q.state.data?.items.some((c) => c.status === 'pending') ? POLL_MS : false),
  });
  const send = useMutation({
    mutationFn: async (v: { text: string; confirm?: boolean }) =>
      unwrap(api.POST('/vehicles/{id}/tracker-console', { params: { path: { id: vehicleId } }, body: v.confirm ? { text: v.text, confirm: true } : { text: v.text } })),
    onSuccess: () => { setText(''); setConfirming(null); qc.invalidateQueries({ queryKey: ['tracker-console', vehicleId] }); },
  });
  if (!allowed) return null;

  const items = list.data?.items ?? [];
  const hasPending = items.some((c) => c.status === 'pending');
  const submit = (t: string) => {
    const value = t.trim();
    if (!value) return;
    if (consoleRisk(value) === 'read') send.mutate({ text: value });
    else setConfirming(value);
  };
  // Só a resposta com APN mais recente conta (a lista vem do mais novo para o mais antigo).
  const latestApnReply = items.find((c) => c.status === 'answered' && c.response && /APN:/i.test(c.response));
  const mismatch = latestApnReply ? apnMismatch(simApn, latestApnReply.response) : null;

  return (
    <div data-testid="tracker-console">
      <SectionTitle>Console do rastreador</SectionTitle>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CONSOLE_PRESETS.map((p) => (
          <Button key={p.text} size="sm" variant="secondary" testId={`console-preset-${p.text}`} disabled={send.isPending || hasPending} onClick={() => submit(p.text)}>{p.label}</Button>
        ))}
      </div>
      <form style={{ display: 'flex', gap: 8, marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); submit(text); }}>
        <div style={{ flex: 1, minWidth: 0 }}><TextInput value={text} onChange={setText} placeholder="Ex.: STATUS#" testId="console-text" /></div>
        <Button size="md" type="submit" testId="console-send" busy={send.isPending} disabled={send.isPending || hasPending || !text.trim()}>Enviar</Button>
      </form>
      {hasPending && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>Aguardando a resposta do rastreador…</div>}
      {send.error && <div style={{ marginTop: 8 }}><ErrorNote error={send.error} /></div>}
      {mismatch && simApn && (
        <div style={{ marginTop: 8 }}>
          <Alert tone="warning" icon="TriangleAlert">{`O aparelho está com o APN ${mismatch}, mas o chip cadastrado usa ${simApn}.`}</Alert>
        </div>
      )}
      <div data-testid="console-history" style={{ marginTop: 10 }}>
        {items.length === 0 && !list.isLoading && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nenhum comando enviado.</div>}
        {items.map((c) => (
          <div key={c.id} data-testid="console-item" data-status={c.status} style={{ padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ font: '500 12px/1.4 var(--font-mono)', color: 'var(--text-secondary)' }}>{formatDateTime(c.createdAt)}</span>
              <span style={{ font: '600 13px/1.4 var(--font-mono)' }}>{c.text}</span>
              {statusPill(c)}
            </div>
            {c.response && <pre style={{ margin: '6px 0 0', font: '500 12px/1.4 var(--font-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{c.response}</pre>}
            {c.statusReport && <StatusReportTable report={c.statusReport} />}
          </div>
        ))}
      </div>
      <Modal open={confirming !== null} title="Confirmar comando" onClose={() => setConfirming(null)} testId="console-confirm" actions={<>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>Voltar</Button>
        <Button size="sm" variant="danger" testId="console-confirm-send" busy={send.isPending} disabled={send.isPending} onClick={() => confirming && send.mutate({ text: confirming, confirm: true })}>Enviar mesmo assim</Button>
      </>}>
        <div style={{ font: '600 13px/1.4 var(--font-mono)' }}>{confirming}</div>
        <p style={{ margin: 0, fontSize: 14 }}>{CHANGE_CONFIRM_TEXT}</p>
      </Modal>
    </div>
  );
}
