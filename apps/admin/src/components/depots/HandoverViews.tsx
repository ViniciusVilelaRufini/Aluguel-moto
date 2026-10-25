'use client';

import Link from 'next/link';
import { DataTable, KV, Pill, SectionTitle, type Column, type Pager } from '@/components/ui';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';
import { Icon } from '@/ds/Icon';
import { formatDateTime } from '@/lib/format';
import { batteryColor } from '@/lib/status';
import { HANDOVER_STATUS, HANDOVER_TYPE_LABEL, checklistLabel, checklistSummary, lastErrorLabel } from '@/lib/handovers';
import type { S } from '@/lib/types';

type Handover = S<'Handover'>;

/** Lista de entregas (`GET /handovers`): mais recentes primeiro, como vem da API. */
export function HandoverTable({ rows, onSelect, selectedId, loading, pager, empty, compact }: {
  rows: Handover[]; onSelect: (h: Handover) => void; selectedId?: string | null; loading?: boolean; pager?: Pager; empty?: string;
  /** Com o painel de detalhe aberto: esconde as colunas secundárias para o Status caber em 1366 px. */
  compact?: boolean;
}) {
  return (
    <DataTable<Handover>
      testId="handovers-table"
      label="Entregas"
      rows={rows}
      loading={loading}
      pager={pager}
      selectedKey={selectedId}
      onRowClick={onSelect}
      empty={empty ?? 'Nenhuma entrega por aqui'}
      emptyIcon="PackageCheck"
      emptyHint="As entregas aparecem quando o operador registra a saída ou a chegada de uma moto no galpão."
      columns={handoverColumns(!!compact)}
    />
  );
}

const COMPACT_HIDDEN = new Set(['operator', 'checklist', 'photos']);

function handoverColumns(compact: boolean): Column<Handover>[] {
  const all: Column<Handover>[] = [
        { key: 'createdAt', label: 'Registrada em', render: (h) => formatDateTime(h.createdAt) },
        { key: 'type', label: 'Tipo', render: (h) => HANDOVER_TYPE_LABEL[h.type] },
        { key: 'vehicleCode', label: 'Moto', mono: true, render: (h) => h.vehicleCode ?? '—' },
        { key: 'operator', label: 'Operador', render: (h) => h.operatorFirstName ?? '—' },
        { key: 'batteryPct', label: 'Bateria', align: 'right', render: (h) => `${h.batteryPct}%` },
        {
          key: 'checklist', label: 'Checklist', align: 'right', render: (h) => {
            const s = checklistSummary(h.checklist);
            return <span style={{ color: s.issues.length ? 'var(--danger-ink)' : undefined, fontFamily: 'var(--font-mono)' }}>{s.ok}/{s.total}</span>;
          },
        },
        { key: 'photos', label: 'Fotos', align: 'right', render: (h) => h.photoKeys.length },
        { key: 'status', label: 'Status', render: (h) => <Pill tone={HANDOVER_STATUS[h.status].tone}>{HANDOVER_STATUS[h.status].label}</Pill> },
  ];
  return compact ? all.filter((c) => !COMPACT_HIDDEN.has(c.key)) : all;
}

/**
 * Detalhe da entrega: fotos (links assinados de `photoUrls`), checklist com observações, bateria e, na disputa, o
 * motivo do cliente com "Abrir no suporte".
 */
export function HandoverDetail({ handover: h, supportHref, rentalHref, photosLoading, onCancel }: { handover: Handover; supportHref: string | null; rentalHref: string | null; photosLoading?: boolean; onCancel?: () => void }) {
  const st = HANDOVER_STATUS[h.status];
  // O erro do aceite só importa enquanto a entrega espera o cliente (some quando o aceite dá certo).
  const err = h.status === 'pending_customer' ? lastErrorLabel(h.lastError) : null;
  const photos = h.photoUrls ?? [];
  return (
    <div data-testid="handover-detail" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Pill tone={st.tone}>{st.label}</Pill>
        <Pill tone="neutral" icon={h.type === 'pickup' ? 'ArrowRight' : 'Undo2'}>{HANDOVER_TYPE_LABEL[h.type]}</Pill>
      </div>

      {h.status === 'disputed' && (
        <Alert tone="danger" title="Problema apontado pelo cliente">
          <span data-testid="dispute-reason">{h.disputeReason ?? 'Sem motivo informado.'}</span>
          {h.respondedAt && <span style={{ display: 'block', marginTop: 4 }}>Em {formatDateTime(h.respondedAt)}</span>}
        </Alert>
      )}
      {h.status === 'disputed' && supportHref && (
        // Link do Next com a forma do Button "dark" sm (um <button> dentro de <a> seria interativo aninhado).
        <Link href={supportHref} data-testid="open-support"
          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 10, height: 36, padding: '0 16px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-inverse)', color: 'var(--text-on-inverse)', font: 'var(--fw-semibold) 14px/1 var(--font-sans)', textDecoration: 'none', boxShadow: 'var(--shadow-2)' }}>
          <Icon name="LifeBuoy" size={16} />Abrir no suporte
        </Link>
      )}
      {onCancel && (
        <Button size="sm" variant="danger" icon="Ban" testId="cancel-handover" style={{ alignSelf: 'flex-start' }} onClick={onCancel}>Cancelar entrega</Button>
      )}
      {err && <Alert tone="warning" title={err}>O cliente ainda não destravou a moto. A entrega continua aguardando.</Alert>}

      <div>
        <SectionTitle>Fotos</SectionTitle>
        {photos.length === 0 ? (
          <div role="status" data-testid="handover-photos-empty" style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="Image" size={16} />
            {h.photoKeys.length === 0
              ? 'Sem fotos nesta entrega.'
              : photosLoading
                ? `Carregando as fotos (${h.photoKeys.length})...`
                : `Fotos indisponíveis no momento (${h.photoKeys.length} registradas). Tente reabrir a entrega.`}
          </div>
        ) : (
          <div data-testid="handover-photos" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            {photos.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" aria-label={`Abrir foto ${i + 1} em outra aba`}
                style={{ display: 'block', aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface-media)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- links assinados externos; o export estático não otimiza imagens */}
                <img src={url} alt={`Foto ${i + 1} da entrega`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </a>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle>Checklist</SectionTitle>
        <ul data-testid="handover-checklist" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {h.checklist.map((c) => (
            <li key={c.code} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
              <Icon name={c.ok ? 'CircleCheck' : 'TriangleAlert'} size={18} color={c.ok ? 'var(--success-ink)' : 'var(--danger-ink)'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{checklistLabel(c.code)}{!c.ok && <span className="sr-only"> (com problema)</span>}</div>
                {c.note && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.note}</div>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <KV k="Moto" v={h.vehicleCode ?? '—'} mono />
        <KV k="Bateria" v={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: batteryColor(h.batteryPct) }} />{h.batteryPct}%</span>} />
        {h.batterySerial && <KV k="Série da bateria" v={h.batterySerial} mono />}
        <KV k="Operador" v={h.operatorFirstName ?? '—'} />
        <KV k="Registrada em" v={formatDateTime(h.createdAt)} />
        {h.respondedAt && <KV k="Resposta do cliente" v={formatDateTime(h.respondedAt)} />}
        {h.rentalId && <KV k="Aluguel" v={rentalHref ? <Link href={rentalHref} style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>Ver aluguel</Link> : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{h.rentalId.slice(0, 8)}</span>} />}
      </div>
    </div>
  );
}
