'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { PLAN_LABEL } from '@/lib/labels';
import type { S } from '@/lib/types';
import { reportMessage, runSaveSteps, type SaveStep } from '@/lib/save-report';
import { DataTable, ErrorNote, Field, MiniInput, Modal, Page, PageHeader, Pill, Select, TextInput, useToast } from '@/components/ui';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';
import { Card } from '@/ds/Card';
import { Switch } from '@/ds/Switch';

const toReais = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const toCents = (v: string) => Math.round(Number(v.replace(/\./g, '').replace(',', '.')) * 100);
const validMoney = (v: string) => /^\d{1,6}([.,]\d{1,2})?$/.test(v.trim().replace(/\./g, ',').replace(/,(?=.*,)/g, ''));

const UNIT_SUFFIX: Record<S<'PlanUnit'>, string> = { minute: '/min', hour: '/hora', day: '/dia', week: '/semana', month: '/mês' };

/** Taxas cobradas por minuto (pausa, reserva) mostram a unidade como no design: "0,20 /min". */
const feeSuffix = (code: string) => (/pause|pausa|reserv/i.test(code) ? '/min' : '');

export default function SettingsPage() {
  const { groups } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const canEdit = can(groups, 'settings.edit');
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => unwrap(api.GET('/pricing/plans')) });
  const fees = useQuery({ queryKey: ['fees'], queryFn: () => unwrap(api.GET('/pricing/fees')) });
  const cov = useQuery({ queryKey: ['coverages'], queryFn: () => unwrap(api.GET('/insurance/coverages')) });
  const coupons = useQuery({ queryKey: ['coupons'], queryFn: () => unwrap(api.GET('/pricing/coupons', { params: { query: { limit: 50 } } })) });

  // Rascunhos por id: só o que o usuário mexeu.
  const [planEdit, setPlanEdit] = useState<Record<string, { unit?: string; unlock?: string; pause?: string; active?: boolean }>>({});
  const [feeEdit, setFeeEdit] = useState<Record<string, { amount?: string; active?: boolean }>>({});
  const [covEdit, setCovEdit] = useState<Record<string, { premium?: string; active?: boolean }>>({});
  const [couponEdit, setCouponEdit] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [newCoupon, setNewCoupon] = useState(false);

  const dirty = useMemo(() => [planEdit, feeEdit, covEdit, couponEdit].some((m) => Object.keys(m).length > 0), [planEdit, feeEdit, covEdit, couponEdit]);
  const discard = () => { setPlanEdit({}); setFeeEdit({}); setCovEdit({}); setCouponEdit({}); setErr(null); };

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      // Valida tudo antes de gravar qualquer coisa: erro de digitação não deixa estado parcial.
      for (const p of plans.data?.items ?? []) {
        const e = planEdit[p.id];
        if (e) for (const v of [e.unit, e.unlock, e.pause]) if (v !== undefined && !validMoney(v)) throw new Error('Informe os valores em reais, por exemplo 0,79');
      }
      for (const f of fees.data?.items ?? []) {
        const e = feeEdit[f.id];
        if (e?.amount !== undefined && !validMoney(e.amount)) throw new Error('Informe os valores em reais, por exemplo 15,00');
      }
      for (const c of cov.data?.items ?? []) {
        const e = covEdit[c.coverage];
        if (e?.premium !== undefined && !validMoney(e.premium)) throw new Error('Informe o preço do seguro em reais, por exemplo 2,00');
      }
      const steps: SaveStep[] = [];
      const labels: Record<string, string> = {};
      const add = (key: string, label: string, run: () => Promise<unknown>) => { steps.push({ key, label, run }); labels[key] = label; };
      for (const p of plans.data?.items ?? []) {
        const e = planEdit[p.id];
        if (!e) continue;
        add(`plan:${p.id}`, `Plano ${PLAN_LABEL[p.code] ?? p.name}`, () => unwrap(api.PUT('/pricing/plans/{id}', { params: { path: { id: p.id } }, body: {
          code: p.code, name: p.name, description: p.description, unit: p.unit, recurring: p.recurring,
          unitPriceCents: e.unit !== undefined ? toCents(e.unit) : p.unitPriceCents,
          unlockFeeCents: e.unlock !== undefined ? toCents(e.unlock) : p.unlockFeeCents,
          pausePerMinuteCents: e.pause !== undefined ? toCents(e.pause) : p.pausePerMinuteCents,
          active: e.active ?? p.active,
        } })));
      }
      for (const f of fees.data?.items ?? []) {
        const e = feeEdit[f.id];
        if (!e) continue;
        add(`fee:${f.id}`, `Taxa ${f.name}`, () => unwrap(api.PUT('/pricing/fees/{id}', { params: { path: { id: f.id } }, body: { code: f.code, name: f.name, description: f.description, amountCents: e.amount !== undefined ? toCents(e.amount) : f.amountCents, active: e.active ?? f.active } })));
      }
      for (const c of cov.data?.items ?? []) {
        const e = covEdit[c.coverage];
        if (!e) continue;
        add(`cov:${c.coverage}`, `Seguro ${c.name}`, () => unwrap(api.PUT('/insurance/coverages/{coverage}', { params: { path: { coverage: c.coverage } }, body: { ...(e.premium !== undefined ? { premiumCents: toCents(e.premium) } : {}), ...(e.active !== undefined ? { active: e.active } : {}) } })));
      }
      for (const c of coupons.data?.items ?? []) {
        if (couponEdit[c.id] === undefined) continue;
        add(`coupon:${c.id}`, `Cupom ${c.code}`, () => unwrap(api.PUT('/pricing/coupons/{id}', { params: { path: { id: c.id } }, body: {
          code: c.code, description: c.description, discountType: c.discountType, percentOff: c.percentOff, amountOffCents: c.amountOffCents, planCodes: c.planCodes,
          validFrom: c.validFrom, validUntil: c.validUntil, maxRedemptions: c.maxRedemptions, maxRedemptionsPerCustomer: c.maxRedemptionsPerCustomer, active: couponEdit[c.id],
        } })));
      }
      const report = await runSaveSteps(steps);
      // Itens salvos saem do rascunho; os que falharam continuam editáveis para tentar de novo.
      const keep = (m: Record<string, unknown>, prefix: string) => Object.fromEntries(Object.entries(m).filter(([k]) => !report.saved.includes(`${prefix}:${k}`)));
      setPlanEdit((m) => keep(m, 'plan') as typeof m); setFeeEdit((m) => keep(m, 'fee') as typeof m);
      setCovEdit((m) => keep(m, 'cov') as typeof m); setCouponEdit((m) => keep(m, 'coupon') as typeof m);
      await Promise.all(['plans', 'fees', 'coverages', 'coupons'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      const msg = reportMessage(report, labels);
      if (msg) { setErr(new Error(msg)); toast(msg, 'danger'); }
      else toast('Preços salvos · log de auditoria atualizado');
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  const sec = (t: string, d: string, c: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <div><div style={{ font: '700 18px/1.25 var(--font-sans)' }}>{t}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d}</div></div>
      {c}
    </div>
  );

  return (
    <Page style={{ gap: 26 }}>
      <PageHeader title="Preços e planos" subtitle="Alterações valem para novos aluguéis">
        {canEdit && <>
          <Button size="sm" variant="ghost" disabled={!dirty || busy} onClick={discard}>Descartar</Button>
          <Button size="sm" icon="Check" testId="save-settings" disabled={!dirty || busy} onClick={save}>Salvar alterações</Button>
        </>}
      </PageHeader>
      {!canEdit && <Alert tone="info" icon="Info">Seu perfil só visualiza preços e planos.</Alert>}
      <ErrorNote error={err ?? plans.error ?? fees.error} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, alignItems: 'start' }}>
        {sec('Planos', 'Preço por período, taxa de desbloqueio e pausa (em reais)', (
          <DataTable<S<'PricingPlan'>> loading={plans.isLoading} rows={plans.data?.items ?? []}
            columns={[
              { key: 'name', label: 'Plano', render: (p) => PLAN_LABEL[p.code] ?? p.name },
              { key: 'unit', label: 'Preço', align: 'right', render: (p) => canEdit ? <MiniInput label={`Preço ${p.name}`} width={84} value={planEdit[p.id]?.unit ?? toReais(p.unitPriceCents)} onChange={(v) => setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], unit: v } }))} /> : toReais(p.unitPriceCents) },
              { key: 'unitLabel', label: 'Unidade', render: (p) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{UNIT_SUFFIX[p.unit]}</span> },
              { key: 'unlock', label: 'Desbloqueio', align: 'right', render: (p) => canEdit ? <MiniInput label={`Desbloqueio ${p.name}`} width={76} value={planEdit[p.id]?.unlock ?? toReais(p.unlockFeeCents)} onChange={(v) => setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], unlock: v } }))} /> : toReais(p.unlockFeeCents) },
              { key: 'pause', label: 'Pausa/min', align: 'right', render: (p) => canEdit ? <MiniInput label={`Pausa ${p.name}`} width={76} value={planEdit[p.id]?.pause ?? toReais(p.pausePerMinuteCents)} onChange={(v) => setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], pause: v } }))} /> : toReais(p.pausePerMinuteCents) },
              { key: 'active', label: 'Ativo', align: 'right', render: (p) => <Switch label="" disabled={!canEdit} checked={planEdit[p.id]?.active ?? p.active} onChange={(v: boolean) => setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], active: v } }))} /> },
            ]} />
        ))}
        {sec('Taxas', 'Cobranças fixas', (
          <Card padding={6}>
            {(fees.data?.items ?? []).map((f) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderBottom: '1px solid var(--ink-100)' }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{f.name}{f.system && <span style={{ marginLeft: 8 }}><Pill>Sistema</Pill></span>}</span>
                {feeSuffix(f.code) && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{feeSuffix(f.code)}</span>}
                {canEdit ? <MiniInput label={f.name} width={110} value={feeEdit[f.id]?.amount ?? toReais(f.amountCents)} onChange={(v) => setFeeEdit((m) => ({ ...m, [f.id]: { ...m[f.id], amount: v } }))} /> : <span style={{ font: '500 13px var(--font-mono)' }}>{toReais(f.amountCents)}</span>}
              </div>
            ))}
            {fees.data?.items.length === 0 && <div style={{ padding: 12, fontSize: 14, color: 'var(--text-secondary)' }}>Nenhuma taxa.</div>}
          </Card>
        ))}
        {sec('Seguros', 'Preço por aluguel e repasse à seguradora', (
          <DataTable<S<'InsuranceCoverageOption'>> rows={(cov.data?.items ?? []).map((c) => ({ ...c, id: c.coverage }) as S<'InsuranceCoverageOption'> & { id: string })} loading={cov.isLoading}
            columns={[
              { key: 'name', label: 'Seguro' },
              { key: 'description', label: 'Cobertura', render: (c) => <span style={{ whiteSpace: 'normal', fontSize: 12 }}>{c.description}</span> },
              { key: 'premiumCents', label: 'Preço', align: 'right', render: (c) => canEdit ? <MiniInput label={`Preço ${c.name}`} width={80} value={covEdit[c.coverage]?.premium ?? toReais(c.premiumCents)} onChange={(v) => setCovEdit((m) => ({ ...m, [c.coverage]: { ...m[c.coverage], premium: v } }))} /> : toReais(c.premiumCents) },
              { key: 'mandatory', label: '', render: (c) => (c.mandatory ? <Pill>Obrigatório</Pill> : null) },
            ]} />
        ))}
        {sec('Cupons e indicação', 'Campanhas ativas', (
          <>
            <DataTable<S<'Coupon'>> rows={coupons.data?.items ?? []} loading={coupons.isLoading} empty="Nenhum cupom."
              columns={[
                { key: 'code', label: 'Código', mono: true },
                { key: 'discount', label: 'Desconto', render: (c) => (c.discountType === 'percent' ? `${c.percentOff}%` : `R$ ${toReais(c.amountOffCents ?? 0)}`) },
                { key: 'redemptions', label: 'Usos', align: 'right' },
                { key: 'active', label: 'Ativo', align: 'right', render: (c) => <Switch label="" disabled={!canEdit} checked={couponEdit[c.id] ?? c.active} onChange={(v: boolean) => setCouponEdit((m) => ({ ...m, [c.id]: v }))} /> },
              ]} />
            {canEdit && <div><Button size="sm" variant="secondary" icon="Plus" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setNewCoupon(true)}>Novo cupom</Button></div>}
          </>
        ))}
      </div>
      {newCoupon && <CouponModal onClose={() => setNewCoupon(false)} />}
    </Page>
  );
}

function CouponModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [type, setType] = useState<S<'DiscountType'>>('percent');
  const [value, setValue] = useState('');
  const [max, setMax] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const submit = async () => {
    try {
      const n = Number(value.replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0) throw new Error('Informe o valor do desconto');
      if (type === 'percent' && n > 100) throw new Error('O desconto percentual vai até 100%');
      await unwrap(api.POST('/pricing/coupons', { body: {
        code: code.trim().toUpperCase(), discountType: type,
        ...(type === 'percent' ? { percentOff: n } : { amountOffCents: Math.round(n * 100) }),
        ...(max.trim() ? { maxRedemptions: Number(max) } : {}), active: true,
      } }));
      toast('Cupom criado'); qc.invalidateQueries({ queryKey: ['coupons'] }); onClose();
    } catch (e) { setErr(e); }
  };
  return (
    <Modal open title="Novo cupom" onClose={onClose}
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" disabled={!code.trim()} onClick={submit}>Criar cupom</Button></>}>
      <Field label="Código"><TextInput value={code} onChange={setCode} placeholder="PRIMEIRA" /></Field>
      <Field label="Tipo de desconto"><Select value={type} onChange={setType} options={[{ value: 'percent', label: 'Percentual (%)' }, { value: 'fixed', label: 'Valor fixo (R$)' }]} /></Field>
      <Field label={type === 'percent' ? 'Percentual' : 'Valor (R$)'}><TextInput value={value} onChange={setValue} /></Field>
      <Field label="Limite de usos (opcional)"><TextInput type="number" value={max} onChange={setMax} /></Field>
      <ErrorNote error={err} />
    </Modal>
  );
}
