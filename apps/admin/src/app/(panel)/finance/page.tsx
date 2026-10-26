'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSubmitGuard } from '@/lib/submit-guard';
import { api, asJson, downloadCsv, unwrap } from '@/lib/api';
import { PLAN_LABEL } from '@/lib/labels';
import { formatCompactBRL, moneyDelta, percentDelta, pointsDelta, previousRange } from '@/lib/finance-delta';
import { dayStartIso, formatBRL, localDay } from '@/lib/format';
import { Empty, ErrorNote, Page, PageHeader, Pill, DataTable, Skeleton, TabPanel, useToast } from '@/components/ui';
import { RentalsPanel } from '@/components/RentalsPanel';
import { StatTile, StatTileSkeleton } from '@/ds/StatTile';
import { Card } from '@/ds/Card';
import { Button } from '@/ds/Button';
import { SegmentedControl } from '@/ds/SegmentedControl';

type Period = 'today' | '7d' | '30d';
type Tab = 'overview' | 'rentals';

function range(p: Period): { from: string; to: string } {
  const now = new Date();
  const days = p === 'today' ? 0 : p === '7d' ? 6 : 29;
  const start = localDay(new Date(now.getTime() - days * 86400_000));
  return { from: dayStartIso(start), to: now.toISOString() };
}

const WEEKDAY = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short' });
const DAYMONTH = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });

export default function FinancePage() {
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'overview');
  const [rental, setRental] = useState<string | null>(params.get('rental'));
  const [period, setPeriod] = useState<Period>('7d');
  const toast = useToast();
  const exporting = useSubmitGuard();
  const r = useMemo(() => range(period), [period]);

  const fin = useQuery({ queryKey: ['finance', period], queryFn: () => unwrap(api.GET('/reports/finance', { params: { query: r } })).then(asJson) });
  const rev = useQuery({ queryKey: ['revenue', period], queryFn: () => unwrap(api.GET('/reports/revenue', { params: { query: { ...r, groupBy: period === '30d' ? 'week' : 'day' } } })).then(asJson) });
  const occ = useQuery({ queryKey: ['occupancy', period], queryFn: () => unwrap(api.GET('/reports/occupancy', { params: { query: { ...r, groupBy: 'day' } } })).then(asJson) });
  const perVehicle = useQuery({ queryKey: ['rev-vehicle', period], queryFn: () => unwrap(api.GET('/reports/revenue-per-vehicle', { params: { query: r } })).then(asJson) });

  const pr = useMemo(() => previousRange(r.from, r.to), [r]);
  const finPrev = useQuery({ queryKey: ['finance-prev', period], queryFn: () => unwrap(api.GET('/reports/finance', { params: { query: pr } })).then(asJson) });
  const occPrev = useQuery({ queryKey: ['occupancy-prev', period], queryFn: () => unwrap(api.GET('/reports/occupancy', { params: { query: { ...pr, groupBy: 'day' } } })).then(asJson) });
  const perVehiclePrev = useQuery({ queryKey: ['rev-vehicle-prev', period], queryFn: () => unwrap(api.GET('/reports/revenue-per-vehicle', { params: { query: pr } })).then(asJson) });

  const occAvg = occ.data && occ.data.rows.length ? occ.data.rows.reduce((a, x) => a + x.occupancyPct, 0) / occ.data.rows.length : null;
  const vehicleDays = perVehicle.data?.rows.length ?? 0;
  const perVehicleDay = vehicleDays ? Math.round((perVehicle.data!.rows.reduce((a, x) => a + x.revenueCents, 0)) / vehicleDays) : null;

  const occPrevAvg = occPrev.data && occPrev.data.rows.length ? occPrev.data.rows.reduce((a, x) => a + x.occupancyPct, 0) / occPrev.data.rows.length : null;
  const prevVehicleDays = perVehiclePrev.data?.rows.length ?? 0;
  const perVehicleDayPrev = prevVehicleDays ? Math.round(perVehiclePrev.data!.rows.reduce((a, x) => a + x.revenueCents, 0) / prevVehicleDays) : null;
  const dRevenue = percentDelta(fin.data?.totalRevenueCents ?? null, finPrev.data?.totalRevenueCents ?? null);
  const dOcc = pointsDelta(occAvg === null ? null : Math.round(occAvg), occPrevAvg === null ? null : Math.round(occPrevAvg));
  const dPerVehicle = moneyDelta(perVehicleDay, perVehicleDayPrev);
  const dDelinquent = moneyDelta(fin.data?.delinquentAmountCents ?? null, finPrev.data?.delinquentAmountCents ?? null);

  const topVehicles = useMemo(() => {
    const m = new Map<string, { code: string; rentals: number; revenueCents: number }>();
    for (const x of perVehicle.data?.rows ?? []) {
      const cur = m.get(x.vehicleCode) ?? { code: x.vehicleCode, rentals: 0, revenueCents: 0 };
      cur.rentals += x.rentals; cur.revenueCents += x.revenueCents; m.set(x.vehicleCode, cur);
    }
    return [...m.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5).map((v) => ({ id: v.code, ...v }));
  }, [perVehicle.data]);

  const bars = useMemo(() => (rev.data?.rows ?? []).reduce<Record<string, number>>((a, x) => { a[x.periodStart] = (a[x.periodStart] ?? 0) + x.netCents; return a; }, {}), [rev.data]);
  const barList = Object.entries(bars).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...barList.map(([, v]) => v));

  const exportCsv = (path: '/reports/revenue' | '/reports/finance', name: string) => exporting.run(async () => {
    try { await downloadCsv(path, { from: r.from, to: r.to }, name); } catch (e) { toast(e instanceof Error ? e.message : 'Não foi possível exportar', 'danger'); }
  });

  const f = fin.data;
  return (
    <Page>
      <PageHeader title="Financeiro" subtitle="Receita, planos, inadimplência e cauções">
        <SegmentedControl options={[{ value: 'overview', label: 'Visão geral' }, { value: 'rentals', label: 'Aluguéis' }]} value={tab} onChange={(t: Tab) => { setTab(t); router.replace(`/finance?tab=${t}`, { scroll: false }); }} style={{ width: 260 }} />
        {tab === 'overview' && <SegmentedControl options={[{ value: 'today', label: 'Hoje' }, { value: '7d', label: '7 dias' }, { value: '30d', label: '30 dias' }]} value={period} onChange={setPeriod} style={{ width: 280 }} />}
      </PageHeader>

      {tab === 'rentals' ? (
        <TabPanel k="rentals" style={{ flex: 1, minHeight: 0 }}><RentalsPanel selectedId={rental} onSelect={setRental} /></TabPanel>
      ) : (
        <TabPanel k="overview">
          <ErrorNote error={fin.error ?? rev.error} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            {fin.isLoading ? [0, 1, 2, 3].map((i) => <StatTileSkeleton key={i} />) : <>
              <StatTile icon="Wallet" label="Receita" numeric={f ? f.totalRevenueCents : null} format={formatCompactBRL} delta={dRevenue?.text} trend={dRevenue?.trend} />
              <StatTile icon="Gauge" label="Taxa de ocupação" numeric={occAvg === null ? null : Math.round(occAvg)} format={(n) => `${n}%`} delta={dOcc?.text} trend={dOcc?.trend} />
              <StatTile icon="Bike" label="Receita/moto/dia" numeric={perVehicleDay} format={formatBRL} delta={dPerVehicle?.text} trend={dPerVehicle?.trend} />
              <StatTile icon="CircleAlert" label="Inadimplência" numeric={f ? f.delinquentAmountCents : null} format={formatBRL} goodWhen="down" delta={dDelinquent?.text} trend={dDelinquent ? (dDelinquent.trend === 'flat' ? 'flat' : dDelinquent.trend === 'up' ? 'down' : 'up') : undefined}
                caption={f ? `${f.delinquentCustomers} ${f.delinquentCustomers === 1 ? 'cliente' : 'clientes'}` : undefined} />
            </>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            <Card padding={20}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Receita líquida {period === '30d' ? 'por semana' : 'por dia'}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180 }}>
                {barList.map(([d, v], i) => (
                  <div key={d} style={{ flex: 1, maxWidth: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end', minWidth: 0, margin: '0 auto' }}>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text-secondary)' }}>{(v / 100000).toFixed(1).replace('.', ',')}</span>
                    <div title={formatBRL(v)} style={{ width: '100%', height: `${(v / max) * 130}px`, minHeight: 2, borderRadius: 8, background: v === max ? 'var(--brand)' : 'var(--green-200)', transformOrigin: 'bottom', animation: `vt-bar-grow 520ms var(--ease-out) ${i * 40}ms backwards` }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{period === '30d' ? DAYMONTH.format(new Date(d)) : WEEKDAY.format(new Date(d)).replace('.', '')}</span>
                  </div>
                ))}
                {rev.isLoading && [40, 70, 55, 90, 65, 80, 50].map((h, i) => <Skeleton key={i} h={h + '%'} r={8} style={{ flex: 1, alignSelf: 'flex-end' }} />)}
                {!rev.isLoading && barList.length === 0 && <div style={{ margin: 'auto' }}><Empty compact icon="ChartColumn">Sem receita no período</Empty></div>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>Valores em R$ mil.</div>
            </Card>
            <DataTable dense rows={(f?.revenueByPlan ?? []).map((p) => ({ id: p.planCode, ...p }))} loading={fin.isLoading} empty="Sem aluguéis no período."
              columns={[
                { key: 'planCode', label: 'Plano', render: (p) => PLAN_LABEL[p.planCode] },
                { key: 'rentals', label: 'Aluguéis', align: 'right' },
                { key: 'revenueCents', label: 'Receita', align: 'right', render: (p) => formatBRL(p.revenueCents) },
              ]} />
          </div>
          <DataTable
            rows={f ? [
              { id: 'dep', k: `Cauções retidas (${f.depositsHeldCount})`, v: formatBRL(f.depositsHeldCents), s: 'Em aberto', t: 'warning' as const },
              { id: 'prem', k: 'Prêmios de seguro no período', v: formatBRL(f.insurancePremiumsCents), s: 'A repassar', t: 'info' as const },
              { id: 'pay', k: 'Indenizações pagas pela seguradora', v: formatBRL(f.insurancePayoutsCents), s: 'Pago', t: 'success' as const },
              { id: 'ref', k: 'Estornos', v: formatBRL(f.refundsCents), s: 'Pago', t: 'success' as const },
              ...(f.walletTopUpsCents !== undefined ? [{ id: 'top', k: 'Recargas de carteira', v: formatBRL(f.walletTopUpsCents), s: 'Recebido', t: 'success' as const }] : []),
            ] : []}
            loading={fin.isLoading}
            columns={[
              { key: 'k', label: 'Cauções, seguros e estornos' },
              { key: 'v', label: 'Valor', align: 'right' },
              { key: 's', label: 'Status', render: (x) => <Pill tone={x.t}>{x.s}</Pill> },
            ]}
          />
          <DataTable dense rows={topVehicles} loading={perVehicle.isLoading} empty="Sem receita por moto no período."
            columns={[
              { key: 'code', label: 'Receita por moto (maiores do período)', mono: true },
              { key: 'rentals', label: 'Aluguéis', align: 'right' },
              { key: 'revenueCents', label: 'Receita', align: 'right', render: (v) => formatBRL(v.revenueCents) },
            ]} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" variant="secondary" icon="Download" testId="export-revenue" busy={exporting.busy} disabled={exporting.busy} style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => exportCsv('/reports/revenue', 'receita.csv')}>Exportar receita (CSV)</Button>
            <Button size="sm" variant="secondary" icon="Download" busy={exporting.busy} disabled={exporting.busy} style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => exportCsv('/reports/finance', 'financeiro.csv')}>Exportar resumo financeiro (CSV)</Button>
          </div>
        </TabPanel>
      )}
    </Page>
  );
}
