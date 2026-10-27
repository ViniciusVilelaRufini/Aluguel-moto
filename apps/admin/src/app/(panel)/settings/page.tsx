'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, unwrap } from '@/lib/api';
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
import { parseReais, toCents, toReais, validMoney } from '@/lib/money';
import { ModelsSection } from '@/components/ModelsSection';
import { useNarrow } from '@/lib/use-narrow';
import { useSubmitGuard } from '@/lib/submit-guard';
import { couponLimitsError } from '@/lib/coupon';
import { formatDate, dayEndIso, dayStartIso } from '@/lib/format';
import { activePlanForCode, buildFeeCreate, buildPlanCreate, firstFreePlanCode, EMPTY_FEE_FORM, EMPTY_PLAN_FORM, PLAN_UNIT_BY_CODE, type FeeForm, type PlanForm } from '@/lib/admin-forms';

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
  const [newPlan, setNewPlan] = useState(false);
  const [newFee, setNewFee] = useState(false);
  const [tried, setTried] = useState(false);
  const narrow = useNarrow();
  const bad = (v?: string) => (tried && v !== undefined && !validMoney(v) ? 'Valor inválido' : undefined);

  const dirty = useMemo(() => [planEdit, feeEdit, covEdit, couponEdit].some((m) => Object.keys(m).length > 0), [planEdit, feeEdit, covEdit, couponEdit]);
  const discard = () => { setTried(false); setPlanEdit({}); setFeeEdit({}); setCovEdit({}); setCouponEdit({}); setErr(null); };

  const save = async () => {
    setBusy(true); setErr(null); setTried(true);
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

  const sec = (t: string, d: string, c: React.ReactNode, wide = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, ...(wide ? { gridColumn: '1 / -1' } : null) }}>
      <div><div style={{ font: '700 18px/1.25 var(--font-sans)' }}>{t}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d}</div></div>
      {c}
    </div>
  );

  return (
    <Page style={{ gap: 26 }}>
      <PageHeader subtitle="Alterações valem para novos aluguéis">
        {canEdit && <>
          <Button size="sm" variant="ghost" disabled={!dirty || busy} onClick={discard}>Descartar</Button>
          <Button size="sm" icon="Check" testId="save-settings" disabled={!dirty || busy} onClick={save}>Salvar alterações</Button>
        </>}
      </PageHeader>
      {!canEdit && <Alert tone="info" icon="Info">Seu perfil só visualiza preços e planos.</Alert>}
      <ErrorNote error={err ?? plans.error ?? fees.error} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 24, alignItems: 'start' }}>
        {sec('Planos', 'Preço por período, taxa de desbloqueio e pausa (em reais)', (
          <>
          {narrow ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(plans.data?.items ?? []).map((p) => {
              const e = planEdit[p.id];
              const money = (k: 'unit' | 'unlock' | 'pause', label: string, cents: number) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                  {canEdit ? <MiniInput label={`${label} ${p.name}`} width="100%" value={e?.[k] ?? toReais(cents)} error={bad(e?.[k])} onChange={(v) => setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], [k]: v } }))} />
                    : <span style={{ font: '500 13px var(--font-mono)' }}>{toReais(cents)}</span>}
                </div>
              );
              return (
                <Card key={p.id} padding={12}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontWeight: 600 }}>{PLAN_LABEL[p.code] ?? p.name} <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{UNIT_SUFFIX[p.unit]}</span></span>
                    <Switch ariaLabel={`Plano ${PLAN_LABEL[p.code] ?? p.name} ativo`} disabled={!canEdit} checked={e?.active ?? p.active} onChange={(v: boolean) => setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], active: v } }))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    {money('unit', 'Preço', p.unitPriceCents)}{money('unlock', 'Desbloqueio', p.unlockFeeCents)}{money('pause', 'Pausa', p.pausePerMinuteCents)}
                  </div>
                </Card>
              );
            })}
          </div>
          ) : (
          <DataTable<S<'PricingPlan'>> dense loading={plans.isLoading} rows={plans.data?.items ?? []}
            columns={[
              { key: 'name', label: 'Plano', render: (p) => PLAN_LABEL[p.code] ?? p.name },
              { key: 'unit', label: 'Preço (por unidade)', align: 'right', render: (p) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{canEdit ? <MiniInput label={`Preço ${p.name}`} width={84} value={planEdit[p.id]?.unit ?? toReais(p.unitPriceCents)} error={bad(planEdit[p.id]?.unit)} onChange={(v) => setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], unit: v } }))} /> : toReais(p.unitPriceCents)}<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{UNIT_SUFFIX[p.unit]}</span></span> },
              { key: 'unlock', label: 'Desbloqueio', align: 'right', render: (p) => canEdit ? <MiniInput label={`Desbloqueio ${p.name}`} width={76} value={planEdit[p.id]?.unlock ?? toReais(p.unlockFeeCents)} error={bad(planEdit[p.id]?.unlock)} onChange={(v) => setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], unlock: v } }))} /> : toReais(p.unlockFeeCents) },
              { key: 'pause', label: 'Pausa/min', align: 'right', render: (p) => canEdit ? <MiniInput label={`Pausa ${p.name}`} width={76} value={planEdit[p.id]?.pause ?? toReais(p.pausePerMinuteCents)} error={bad(planEdit[p.id]?.pause)} onChange={(v) => setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], pause: v } }))} /> : toReais(p.pausePerMinuteCents) },
              { key: 'active', label: 'Ativo', align: 'right', pin: true, render: (p) => <Switch label="" ariaLabel={`Plano ${PLAN_LABEL[p.code] ?? p.name} ativo`} disabled={!canEdit} checked={planEdit[p.id]?.active ?? p.active} onChange={(v: boolean) => setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], active: v } }))} /> },
            ]} />
          )}
          {canEdit && <div><Button size="sm" variant="secondary" icon="Plus" testId="new-plan" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setNewPlan(true)}>Novo plano</Button></div>}
          </>
        ), true)}
        {sec('Taxas', 'Cobranças fixas', (
          <>
          <Card padding={6}>
            {(fees.data?.items ?? []).map((f) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderBottom: '1px solid var(--ink-100)' }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{f.name}{f.system && <span style={{ marginLeft: 8 }}><Pill>Sistema</Pill></span>}</span>
                {feeSuffix(f.code) && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{feeSuffix(f.code)}</span>}
                {canEdit ? <MiniInput label={f.name} width={110} value={feeEdit[f.id]?.amount ?? toReais(f.amountCents)} error={bad(feeEdit[f.id]?.amount)} onChange={(v) => setFeeEdit((m) => ({ ...m, [f.id]: { ...m[f.id], amount: v } }))} /> : <span style={{ font: '500 13px var(--font-mono)' }}>{toReais(f.amountCents)}</span>}
              </div>
            ))}
            {fees.data?.items.length === 0 && <div style={{ padding: 12, fontSize: 14, color: 'var(--text-secondary)' }}>Nenhuma taxa.</div>}
          </Card>
          {canEdit && <div><Button size="sm" variant="secondary" icon="Plus" testId="new-fee" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setNewFee(true)}>Nova taxa</Button></div>}
          </>
        ))}
        {sec('Seguros', 'Preço por aluguel e repasse à seguradora', narrow ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(cov.data?.items ?? []).map((c) => (
              <Card key={c.coverage} padding={12}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>{c.mandatory && <Pill>Obrigatório</Pill>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 10px' }}>{c.description}</div>
                {canEdit ? <MiniInput label={`Preço ${c.name}`} width="100%" value={covEdit[c.coverage]?.premium ?? toReais(c.premiumCents)} error={bad(covEdit[c.coverage]?.premium)} onChange={(v) => setCovEdit((m) => ({ ...m, [c.coverage]: { ...m[c.coverage], premium: v } }))} />
                  : <span style={{ font: '500 13px var(--font-mono)' }}>{toReais(c.premiumCents)}</span>}
              </Card>
            ))}
          </div>
        ) : (
          <DataTable<S<'InsuranceCoverageOption'>> rows={(cov.data?.items ?? []).map((c) => ({ ...c, id: c.coverage }) as S<'InsuranceCoverageOption'> & { id: string })} loading={cov.isLoading}
            columns={[
              { key: 'name', label: 'Seguro' },
              { key: 'description', label: 'Cobertura', render: (c) => <span style={{ whiteSpace: 'normal', fontSize: 12 }}>{c.description}</span> },
              { key: 'premiumCents', label: 'Preço', align: 'right', render: (c) => canEdit ? <MiniInput label={`Preço ${c.name}`} width={80} value={covEdit[c.coverage]?.premium ?? toReais(c.premiumCents)} error={bad(covEdit[c.coverage]?.premium)} onChange={(v) => setCovEdit((m) => ({ ...m, [c.coverage]: { ...m[c.coverage], premium: v } }))} /> : toReais(c.premiumCents) },
              { key: 'mandatory', label: '', render: (c) => (c.mandatory ? <Pill>Obrigatório</Pill> : null) },
            ]} />
        ))}
        {sec('Modelos', 'Catálogo "Escolha sua moto": foto, preço por minuto e desbloqueio por modelo', (
          <div className="stack-cells"><ModelsSection minuteUnlockCents={plans.data?.items.find((p) => p.code === 'minute')?.unlockFeeCents} /></div>
        ))}
        {sec('Cupons e indicação', 'Campanhas ativas', (
          <>
            <div className="stack-cells"><DataTable<S<'Coupon'>> rows={coupons.data?.items ?? []} loading={coupons.isLoading} empty="Nenhum cupom."
              columns={[
                { key: 'code', label: 'Código', mono: true },
                { key: 'discount', label: 'Desconto', render: (c) => (c.discountType === 'percent' ? `${c.percentOff}%` : `R$ ${toReais(c.amountOffCents ?? 0)}`) + (c.planCodes?.length ? ` · ${c.planCodes.map((p) => PLAN_LABEL[p]).join(', ')}` : '') },
                { key: 'validUntil', label: 'Validade', render: (c) => <span style={{ fontSize: 12 }}>{c.validUntil ? `até ${formatDate(c.validUntil)}` : 'Sem prazo'}</span> },
                { key: 'redemptions', label: 'Usos', align: 'right', render: (c) => <span style={{ fontFamily: 'var(--font-mono)' }}>{c.redemptions.toLocaleString('pt-BR')}{c.maxRedemptions ? ` / ${c.maxRedemptions.toLocaleString('pt-BR')}` : ''}</span> },
                { key: 'active', label: 'Ativo', align: 'right', pin: true, render: (c) => <Switch label="" ariaLabel={`Cupom ${c.code} ativo`} disabled={!canEdit} checked={couponEdit[c.id] ?? c.active} onChange={(v: boolean) => setCouponEdit((m) => ({ ...m, [c.id]: v }))} /> },
              ]} /></div>
            {canEdit && <div><Button size="sm" variant="secondary" icon="Plus" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setNewCoupon(true)}>Novo cupom</Button></div>}
          </>
        ), true)}
      </div>
      {newCoupon && <CouponModal onClose={() => setNewCoupon(false)} />}
      {newPlan && (
        <PlanModal plans={plans.data?.items ?? []} onClose={() => setNewPlan(false)}
          onEdit={() => { setNewPlan(false); toast('Edite o preço do plano na tabela e salve as alterações'); }}
          onDeactivate={(p) => { setPlanEdit((m) => ({ ...m, [p.id]: { ...m[p.id], active: false } })); setNewPlan(false); toast(`Plano ${PLAN_LABEL[p.code] ?? p.name} marcado como inativo. Salve as alterações e crie o novo plano.`); }} />
      )}
      {newFee && <FeeModal onClose={() => setNewFee(false)} />}
    </Page>
  );
}

/** Exemplo de preço por plano (placeholder do campo). */
const PRICE_PLACEHOLDER: Partial<Record<string, string>> = { minute: '0,79', hour: '14,90', day: '49,90', weekly: '249,00', monthly: '699,00' };

function CouponModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [type, setType] = useState<S<'DiscountType'>>('percent');
  const [value, setValue] = useState('');
  const [max, setMax] = useState('');
  const [perCustomer, setPerCustomer] = useState('1');
  const [description, setDescription] = useState('');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [plans, setPlans] = useState<S<'PlanCode'>[]>([]);
  const [err, setErr] = useState<unknown>(null);
  const { busy, run } = useSubmitGuard();
  const submit = () => run(async () => {
    setErr(null);
    try {
      const n = type === 'percent' ? Number(value.replace(',', '.')) : (parseReais(value) ?? NaN);
      if (!Number.isFinite(n) || n <= 0) throw new Error('Informe o valor do desconto');
      if (type === 'percent' && (n > 100 || !Number.isInteger(n))) throw new Error('O desconto percentual é um inteiro de 1 a 100');
      if (!/^[A-Z0-9_-]{3,32}$/.test(code.trim().toUpperCase())) throw new Error('Código com 3 a 32 letras, números, _ ou -');
      if (from && until && until < from) throw new Error('A validade termina antes de começar');
      const limits = couponLimitsError(max, perCustomer);
      if (limits) throw new Error(limits);
      await unwrap(api.POST('/pricing/coupons', { body: {
        code: code.trim().toUpperCase(), discountType: type,
        ...(type === 'percent' ? { percentOff: n } : { amountOffCents: toCents(value) }),
        ...(max.trim() ? { maxRedemptions: Number(max) } : {}),
        ...(perCustomer.trim() ? { maxRedemptionsPerCustomer: Number(perCustomer) } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(from ? { validFrom: dayStartIso(from) } : {}),
        ...(until ? { validUntil: dayEndIso(until) } : {}),
        ...(plans.length ? { planCodes: plans } : {}),
        active: true,
      } }));
      toast('Cupom criado'); qc.invalidateQueries({ queryKey: ['coupons'] }); onClose();
    } catch (e) { setErr(e); }
  });
  return (
    <Modal open title="Novo cupom" onClose={onClose}
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" busy={busy} disabled={busy || !code.trim()} onClick={submit}>Criar cupom</Button></>}>
      <Field label="Código"><TextInput value={code} onChange={setCode} placeholder="PRIMEIRA" /></Field>
      <Field label="Tipo de desconto"><Select value={type} onChange={setType} options={[{ value: 'percent', label: 'Percentual (%)' }, { value: 'fixed', label: 'Valor fixo (R$)' }]} /></Field>
      <Field label={type === 'percent' ? 'Percentual' : 'Valor (R$)'}><TextInput value={value} onChange={setValue} /></Field>
      <Field label="Descrição (opcional)"><TextInput value={description} onChange={setDescription} placeholder="15 min grátis na primeira corrida" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 12 }}>
        <Field label="Limite de usos (opcional)"><TextInput type="number" value={max} onChange={setMax} /></Field>
        <Field label="Usos por cliente"><TextInput type="number" value={perCustomer} onChange={setPerCustomer} /></Field>
        <Field label="Válido de (opcional)"><TextInput type="date" value={from} onChange={setFrom} /></Field>
        <Field label="Válido até (opcional)"><TextInput type="date" value={until} onChange={setUntil} /></Field>
      </div>
      <Field label="Planos" hint="Nenhum marcado = todos os planos.">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(PLAN_LABEL) as S<'PlanCode'>[]).map((p) => {
            const on = plans.includes(p);
            return <Button key={p} size="sm" variant={on ? 'dark' : 'secondary'} style={on ? undefined : { color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => setPlans((l) => (on ? l.filter((x) => x !== p) : [...l, p]))}>{PLAN_LABEL[p]}</Button>;
          })}
        </div>
      </Field>
      <ErrorNote error={err} />
    </Modal>
  );
}

/** Criar plano (`POST /pricing/plans`, só admin): valores em reais, enviados em centavos. Um plano ativo por código. */
function PlanModal({ plans, onClose, onEdit, onDeactivate }: { plans: S<'PricingPlan'>[]; onClose: () => void; onEdit: () => void; onDeactivate: (p: S<'PricingPlan'>) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const free = firstFreePlanCode(plans, Object.keys(PLAN_LABEL) as S<'PlanCode'>[]);
  const [f, setF] = useState<PlanForm>(() => (free ? { ...EMPTY_PLAN_FORM, code: free, unit: PLAN_UNIT_BY_CODE[free], recurring: free === 'weekly' || free === 'monthly' } : EMPTY_PLAN_FORM));
  const existing = activePlanForCode(plans, f.code);
  const [err, setErr] = useState<unknown>(null);
  // Trava síncrona (duplo clique não cria dois planos), como no cupom.
  const { busy, run } = useSubmitGuard();
  const submit = () => run(async () => {
    setErr(null);
    if (existing) return;
    const built = buildPlanCreate(f);
    if (!built.ok) { setErr(new Error(built.error)); return; }
    try {
      await unwrap(api.POST('/pricing/plans', { body: built.body }));
      toast('Plano criado · log de auditoria atualizado'); qc.invalidateQueries({ queryKey: ['plans'] }); onClose();
    } catch (e) {
      // 409: outro admin criou o plano nesse meio-tempo; a mensagem do servidor traz o código interno, então usamos o nome em pt-BR.
      setErr(e instanceof ApiError && e.status === 409 ? new Error(`Já existe um plano ativo para ${PLAN_LABEL[f.code]}. Atualize a página e edite ou desative o existente.`) : e);
    }
  });
  return (
    <Modal open title="Novo plano" onClose={onClose} testId="plan-form"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="plan-save" busy={busy} disabled={busy || !!existing} onClick={submit}>Criar plano</Button></>}>
      <Field label="Código" hint="Só pode haver um plano ativo por código.">
        <Select<S<'PlanCode'>> testId="plan-code" value={f.code} onChange={(code) => setF((x) => ({ ...x, code, unit: PLAN_UNIT_BY_CODE[code], recurring: code === 'weekly' || code === 'monthly' }))}
          options={(Object.keys(PLAN_LABEL) as S<'PlanCode'>[]).map((c) => ({ value: c, label: PLAN_LABEL[c] }))} />
      </Field>
      {existing && (
        <Alert tone="warning" icon="Info">
          <div data-testid="plan-conflict" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span>Já existe um plano ativo para {PLAN_LABEL[f.code]}{existing.name.trim().toLowerCase() === PLAN_LABEL[f.code].toLowerCase() ? '' : ` (${existing.name})`}. Só pode haver um por código: edite o preço dele ou desative-o antes de criar outro.</span>
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" variant="secondary" testId="plan-conflict-edit" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={onEdit}>Editar o existente</Button>
              <Button size="sm" variant="secondary" testId="plan-conflict-deactivate" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }} onClick={() => onDeactivate(existing)}>Desativar o existente</Button>
            </span>
          </div>
        </Alert>
      )}
      <Field label="Nome"><TextInput testId="plan-name" value={f.name} onChange={(name) => setF((x) => ({ ...x, name }))} placeholder="Diária" /></Field>
      <Field label="Descrição (opcional)"><TextInput value={f.description} onChange={(description) => setF((x) => ({ ...x, description }))} /></Field>
      <Field label="Unidade de cobrança"><Select<S<'PlanUnit'>> testId="plan-unit" value={f.unit} onChange={(unit) => setF((x) => ({ ...x, unit }))} options={(Object.keys(UNIT_SUFFIX) as S<'PlanUnit'>[]).map((u) => ({ value: u, label: UNIT_SUFFIX[u].slice(1) }))} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 12 }}>
        <Field label="Preço (R$)"><TextInput testId="plan-price" value={f.unitPrice} onChange={(unitPrice) => setF((x) => ({ ...x, unitPrice }))} placeholder={PRICE_PLACEHOLDER[f.code] ?? '0,00'} /></Field>
        <Field label="Desbloqueio (R$)"><TextInput testId="plan-unlock" value={f.unlock} onChange={(unlock) => setF((x) => ({ ...x, unlock }))} /></Field>
        <Field label="Pausa/min (R$)"><TextInput testId="plan-pause" value={f.pause} onChange={(pause) => setF((x) => ({ ...x, pause }))} /></Field>
      </div>
      <Switch label="Cobrança recorrente (assinatura)" checked={f.recurring} onChange={(recurring: boolean) => setF((x) => ({ ...x, recurring }))} />
      <ErrorNote error={err} />
    </Modal>
  );
}

/** Criar taxa (`POST /pricing/fees`, só admin). */
function FeeModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState<FeeForm>(EMPTY_FEE_FORM);
  const [err, setErr] = useState<unknown>(null);
  const { busy, run } = useSubmitGuard();
  const submit = () => run(async () => {
    setErr(null);
    const built = buildFeeCreate(f);
    if (!built.ok) { setErr(new Error(built.error)); return; }
    try {
      await unwrap(api.POST('/pricing/fees', { body: built.body }));
      toast('Taxa criada · log de auditoria atualizado'); qc.invalidateQueries({ queryKey: ['fees'] }); onClose();
    } catch (e) { setErr(e); }
  });
  return (
    <Modal open title="Nova taxa" onClose={onClose} testId="fee-form"
      actions={<><Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button><Button size="sm" variant="dark" testId="fee-save" busy={busy} disabled={busy} onClick={submit}>Criar taxa</Button></>}>
      <Field label="Código" hint="Letras minúsculas, números e _ (exemplo: taxa_limpeza)"><TextInput testId="fee-code" value={f.code} onChange={(code) => setF((x) => ({ ...x, code }))} /></Field>
      <Field label="Nome"><TextInput testId="fee-name" value={f.name} onChange={(name) => setF((x) => ({ ...x, name }))} placeholder="Taxa de limpeza" /></Field>
      <Field label="Descrição (opcional)"><TextInput value={f.description} onChange={(description) => setF((x) => ({ ...x, description }))} /></Field>
      <Field label="Valor (R$)"><TextInput testId="fee-amount" value={f.amount} onChange={(amount) => setF((x) => ({ ...x, amount }))} placeholder="15,00" /></Field>
      <ErrorNote error={err} />
    </Modal>
  );
}
