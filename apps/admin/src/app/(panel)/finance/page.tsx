'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, asJson, downloadCsv, unwrap } from '@/lib/api';
import { PLAN_LABEL } from '@/lib/labels';
import { formatCompactBRL, moneyDelta, percentDelta, pointsDelta, previousRange } from '@/lib/finance-delta';
import { formatBRL, formatBRLBar } from '@/lib/format';
import { csvName, periodRange } from '@/lib/period';
import { allowedFinanceTabs, resolveFinanceTab, type FinanceTab } from '@/lib/finance-tabs';
import { useAuth } from '@/lib/auth';
import { Empty, ErrorNote, Page, PageHeader, Pill, DataTable, Skeleton, TabPanel, useToast } from '@/components/ui';
import { RentalsPanel } from '@/components/RentalsPanel';
import { DepositsPanel } from '@/components/DepositsPanel';
import { PaymentsPanel } from '@/components/PaymentsPanel';
import { WalletPanel } from '@/components/WalletPanel';
import { DEFAULT_PERIOD, PeriodPicker, type PeriodState } from '@/components/PeriodPicker';
import { StatTile, StatTileSkeleton } from '@/ds/StatTile';
import { Card } from '@/ds/Card';
import { Button } from '@/ds/Button';
import { SegmentedControl } from '@/ds/SegmentedControl';

type Tab = FinanceTab;

const WEEKDAY = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short' });
const DAYMONTH = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });

export default function FinancePage() {
  const params = useSearchParams();
  const router = useRouter();
  const { groups } = useAuth();
  const [requestedTab, setTab] = useState<string | null>(params.get('tab'));
  // Aba sem permissão (ex.: ?tab=wallet para suporte/operação) cai na primeira permitida.
  const tab = resolveFinanceTab(requestedTab, groups);
  useEffect(() => {
    if (groups.length && requestedTab && requestedTab !== tab) router.replace(`/finance?tab=${tab}`, { scroll: false });
  }, [groups, requestedTab, tab, router]);
  const [rental, setRental] = useState<string | null>(params.get('rental'));
  const [period, setPeriod] = useState<PeriodState>(DEFAULT_PERIOD);
  const toast = useToast();
  // Período livre incompleto ou inválido: `range` é nulo e as consultas esperam (o seletor mostra o erro).
  const range = useMemo(() => periodRange(period.kind, period), [period]);
  const r = range ?? { from: '', to: '' };
  const spanDays = range ? Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86400_000) : 0;
  const weekly = period.kind === '30d' || spanDays > 31;
  const pk = `${period.kind}|${r.from}|${r.to}`;
  const on = !!range;

  const fin = useQuery({ queryKey: ['finance', pk], enabled: on, queryFn: () => unwrap(api.GET('/reports/finance', { params: { query: r } })).then(asJson) });
  const rev = useQuery({ queryKey: ['revenue', pk], enabled: on, queryFn: () => unwrap(api.GET('/reports/revenue', { params: { query: { ...r, groupBy: weekly ? 'week' : 'day' } } })).then(asJson) });
  const occ = useQuery({ queryKey: ['occupancy', pk], enabled: on, queryFn: () => unwrap(api.GET('/reports/occupancy', { params: { query: { ...r, groupBy: 'day' } } })).then(asJson) });
  const perVehicle = useQuery({ queryKey: ['rev-vehicle', pk], enabled: on, queryFn: () => unwrap(api.GET('/reports/revenue-per-vehicle', { params: { query: r } })).then(asJson) });

  const pr = useMemo(() => (range ? previousRange(range.from, range.to) : { from: '', to: '' }), [range]);
  const finPrev = useQuery({ queryKey: ['finance-prev', pk], enabled: on, queryFn: () => unwrap(api.GET('/reports/finance', { params: { query: pr } })).then(asJson) });
  const occPrev = useQuery({ queryKey: ['occupancy-prev', pk], enabled: on, queryFn: () => unwrap(api.GET('/reports/occupancy', { params: { query: { ...pr, groupBy: 'day' } } })).then(asJson) });
  const perVehiclePrev = useQuery({ queryKey: ['rev-vehicle-prev', pk], enabled: on, queryFn: () => unwrap(api.GET('/reports/revenue-per-vehicle', { params: { query: pr } })).then(asJson) });

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

  const exportCsv = async (path: '/reports/revenue' | '/reports/finance', base: string) => {
    if (!range) return;
    try { await downloadCsv(path, { from: range.from, to: range.to }, csvName(base, range)); } catch (e) { toast(e instanceof Error ? e.message : 'Não foi possível exportar', 'danger'); }
  };

  const f = fin.data;
  const LABELS: Record<Tab, string> = { overview: 'Visão geral', rentals: 'Aluguéis', payments: 'Pagamentos', deposits: 'Cauções', wallet: 'Carteira' };
  const tabOptions = allowedFinanceTabs(groups).map((value) => ({ value, label: LABELS[value] }));
  return (
    <Page>
      <PageHeader title="Financeiro" subtitle="Receita, planos, inadimplência e cauções">
        <SegmentedControl options={tabOptions} value={tab} onChange={(t: Tab) => { setTab(t); router.replace(`/finance?tab=${t}`, { scroll: false }); }} style={{ width: 120 * tabOptions.length }} />
        {tab === 'overview' && <PeriodPicker value={period} onChange={setPeriod} width={340} />}
      </PageHeader>

      {tab === 'deposits' ? (
        <TabPanel k="deposits"><DepositsPanel /></TabPanel>
      ) : tab === 'payments' ? (
        <TabPanel k="payments"><PaymentsPanel /></TabPanel>
      ) : tab === 'wallet' ? (
        <TabPanel k="wallet"><WalletPanel /></TabPanel>
      ) : tab === 'rentals' ? (
        <TabPanel k="rentals" style={{ flex: 1, minHeight: 0 }}><RentalsPanel selectedId={rental} onSelect={setRental} /></TabPanel>
      ) : (
        <TabPanel k="overview">
          <ErrorNote error={fin.error ?? rev.error ?? occ.error ?? perVehicle.error} onRetry={() => { fin.refetch(); rev.refetch(); occ.refetch(); perVehicle.refetch(); finPrev.refetch(); occPrev.refetch(); perVehiclePrev.refetch(); }} />
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
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Receita líquida {weekly ? 'por semana' : 'por dia'}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180 }}>
                {barList.map(([d, v], i) => (
                  <div key={d} style={{ flex: 1, maxWidth: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end', minWidth: 0, margin: '0 auto' }}>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text-secondary)' }}>{formatBRLBar(v)}</span>
                    <div title={formatBRL(v)} style={{ width: '100%', height: `${(v / max) * 130}px`, minHeight: 2, borderRadius: 8, background: v === max ? 'var(--brand)' : 'var(--green-200)', transformOrigin: 'bottom', animation: `vt-bar-grow 520ms var(--ease-out) ${i * 40}ms backwards` }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{weekly || spanDays > 7 ? DAYMONTH.format(new Date(d)) : `${WEEKDAY.format(new Date(d)).replace('.', '')} ${DAYMONTH.format(new Date(d))}`}</span>
                  </div>
                ))}
                {on && rev.isLoading && [40, 70, 55, 90, 65, 80, 50].map((h, i) => <Skeleton key={i} h={h + '%'} r={8} style={{ flex: 1, alignSelf: 'flex-end' }} />)}
                {(!on || !rev.isLoading) && barList.length === 0 && <div style={{ margin: 'auto' }}><Empty compact icon="ChartColumn">{on ? 'Sem receita no período' : 'Informe um período válido'}</Empty></div>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>Valores líquidos em R$.</div>
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
            <Button size="sm" variant="secondary" icon="Download" testId="export-revenue" disabled={!range} style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => exportCsv('/reports/revenue', 'receita')}>Exportar receita (CSV)</Button>
            <Button size="sm" variant="secondary" icon="Download" testId="export-finance" disabled={!range} style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => exportCsv('/reports/finance', 'financeiro')}>Exportar resumo financeiro (CSV)</Button>
          </div>
        </TabPanel>
      )}
    </Page>
  );
}
