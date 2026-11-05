'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { can } from '@/lib/permissions';
import { imeiLast4, trackerRefetchInterval, trackerStatusLabel, type TrackerDevice } from '@/lib/trackers';
import { useNow } from '@/lib/use-now';
import type { S, StaffGroup } from '@/lib/types';
import { Button } from '@/ds/Button';
import { ErrorNote, KV, Modal, Pill, SectionTitle } from '../ui';
import { SimCardSection } from '../tracker/SimCardSection';
import { CreateTrackerWizard } from './CreateTrackerWizard';
import { TrackerPicker } from './TrackerPicker';

type Dialog = 'install' | 'swap' | 'remove' | 'create' | null;

export const INSTALLED_NOTICE = 'Instalado. O rastreador aparece online em até 1 minuto. Se ele chegar destravado, a moto será travada automaticamente quando estiver parada.';
export const INSTALL_BEFORE_CONFIRM = 'Instale o aparelho na moto antes de confirmar.';

/** Topo do diálogo de instalar/trocar (N4): lembra de instalar o aparelho antes de confirmar; na troca, o atual volta ao estoque. */
export function TrackerPickIntro({ swapping, vehicleCode, current }: { swapping: boolean; vehicleCode: string; current?: Pick<TrackerDevice, 'imei'> }) {
  return (
    <>
      {swapping && current && (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Trocar o rastreador da {vehicleCode}? O rastreador atual (final {imeiLast4(current.imei)}) volta para o estoque.
        </div>
      )}
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }} data-testid="tracker-install-hint">{INSTALL_BEFORE_CONFIRM}</div>
    </>
  );
}

/**
 * Abrir/fechar os diálogos (M1): abrir e cancelar limpam o erro/sucesso de instalar e remover (a mensagem de uma tentativa
 * antiga não aparece no diálogo seguinte); concluir (`finish`, depois do sucesso ou do assistente) não limpa — o aviso de
 * instalado e o erro de instalar depois de "Cadastrar novo" continuam visíveis.
 */
export function trackerDialogControls(setDialog: (d: Dialog) => void, setPickedId: (id: string | null) => void, mutations: Array<{ reset: () => void }>) {
  const reset = () => mutations.forEach((m) => m.reset());
  return {
    open: (d: Exclude<Dialog, null>) => { reset(); setPickedId(null); setDialog(d); },
    close: () => { reset(); setPickedId(null); setDialog(null); },
    finish: () => { setPickedId(null); setDialog(null); },
  };
}

/**
 * Bloco "Rastreador e chip" da ficha da moto (o chip aparece só aqui). Todo perfil com acesso à ficha vê os dados;
 * só admin e operação instalam, trocam e removem (`tracker.manage`); o chip segue as regras do `SimCardSection` (admin).
 * Rastreador MQTT (`speed_control` com rastreador cadastrado) é gerenciado fora do painel (provisionamento).
 */
export function TrackerSection({ vehicleId, vehicleCode, groups, controlMode, trackerId, simCard }: {
  vehicleId: string;
  vehicleCode: string;
  groups: StaffGroup[];
  /** `trackerControlMode` da moto; sem rastreador cadastrado a API também manda `speed_control`. */
  controlMode?: S<'Vehicle'>['trackerControlMode'];
  /** `trackerId` da moto (há rastreador cadastrado, GT06 ou MQTT). */
  trackerId?: string | null;
  /** Chip da moto (`Vehicle.simCard`); ausente = o do rastreador da lista. */
  simCard?: S<'SimCardSummary'> | null;
}) {
  const manage = can(groups, 'tracker.manage');
  const mqtt = controlMode === 'speed_control' && !!trackerId;
  const qc = useQueryClient();
  const now = useNow();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  // Referência da espera do primeiro sinal (N3): a instalação feita aqui ou, sem ela, a abertura da ficha (a API não diz quando foi instalado).
  const [openedAt] = useState(() => Date.now());
  const [installedAt, setInstalledAt] = useState<number | null>(null);
  const since = installedAt ?? openedAt;
  const q = useQuery({
    queryKey: ['trackers', 'vehicle', vehicleId],
    queryFn: () => unwrap(api.GET('/trackers', { params: { query: { vehicleId } } })),
    // Instalado e offline (ex.: logo depois de instalar): recarrega a cada 10 s até aparecer online, por até 5 min.
    refetchInterval: (query) => trackerRefetchInterval(query.state.data?.items[0], Date.now(), since),
  });
  const tracker: TrackerDevice | undefined = q.data?.items[0];
  const chip = simCard !== undefined ? simCard : (tracker?.simCard ?? null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
    qc.invalidateQueries({ queryKey: ['trackers'] });
    qc.invalidateQueries({ queryKey: ['sim-cards'] });
  };
  const done = () => { setPickedId(null); setDialog(null); };
  const install = useMutation({
    mutationFn: async (id: string) => unwrap(api.PUT('/vehicles/{id}/tracker', { params: { path: { id: vehicleId } }, body: { trackerId: id } })),
    onSuccess: () => { setInstalledAt(Date.now()); refresh(); done(); },
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(api.DELETE('/vehicles/{id}/tracker', { params: { path: { id: vehicleId } } })),
    onSuccess: () => { refresh(); done(); },
  });
  const { open, close, finish } = trackerDialogControls(setDialog, setPickedId, [install, remove]);
  const swapping = dialog === 'swap';

  const body = mqtt ? (
    <>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }} data-testid="tracker-mqtt">Rastreador MQTT, gerenciado fora do painel.</div>
      <SimCardSection vehicleId={vehicleId} simCard={chip} groups={groups} embedded />
    </>
  ) : q.isLoading ? (
    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }} data-testid="tracker-loading">Carregando…</div>
  ) : q.error ? (
    <ErrorNote error={q.error} onRetry={() => q.refetch()} />
  ) : tracker ? (
    <>
      <KV k="IMEI" v={tracker.imei} mono />
      <KV k="Modelo" v={tracker.model} />
      <KV k="Sinal" v={<Pill tone={tracker.online ? 'success' : 'neutral'}>{trackerStatusLabel(tracker, now, since)}</Pill>} />
      <SimCardSection vehicleId={vehicleId} simCard={chip} groups={groups} embedded />
      {manage && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <Button size="sm" variant="secondary" icon="Repeat" testId="tracker-swap" onClick={() => open('swap')}>Trocar</Button>
          <Button size="sm" variant="ghost" icon="Unlink" testId="tracker-remove" onClick={() => open('remove')}>Remover</Button>
        </div>
      )}
    </>
  ) : (
    <>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Esta moto não tem rastreador.</div>
      {manage && <Button size="sm" variant="secondary" icon="Plus" testId="tracker-install" style={{ marginTop: 8 }} onClick={() => open('install')}>Instalar rastreador</Button>}
    </>
  );

  return (
    <div data-testid="tracker-section">
      <SectionTitle>Rastreador e chip</SectionTitle>
      {body}
      {!mqtt && dialog === null && install.isSuccess && (
        <div role="status" data-testid="tracker-installed-notice" style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{INSTALLED_NOTICE}</div>
      )}

      {manage && !mqtt && (dialog === 'install' || swapping) && (
        <Modal open title={swapping ? `Trocar o rastreador da ${vehicleCode}` : `Instalar rastreador na ${vehicleCode}`} onClose={close} testId="tracker-pick-modal" actions={<>
          <Button size="sm" variant="ghost" onClick={close}>Cancelar</Button>
          <Button size="sm" variant="secondary" icon="Plus" testId="tracker-create-new" onClick={() => open('create')}>Cadastrar novo</Button>
          <Button size="sm" testId="tracker-confirm" busy={install.isPending} disabled={!pickedId || install.isPending} onClick={() => pickedId && install.mutate(pickedId)}>{swapping ? 'Trocar' : 'Instalar'}</Button>
        </>}>
          <TrackerPickIntro swapping={swapping} vehicleCode={vehicleCode} current={tracker} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Escolha o rastreador do estoque</div>
          <TrackerPicker selectedId={pickedId} onSelect={setPickedId} />
          {install.error && <ErrorNote error={install.error} />}
        </Modal>
      )}
      {/* Falha ao instalar depois de "Cadastrar novo": os diálogos já fecharam, então o erro fica visível aqui. */}
      {dialog === null && install.error && <div data-testid="tracker-install-error" style={{ marginTop: 8 }}><ErrorNote error={install.error} /></div>}
      {manage && !mqtt && dialog === 'create' && (
        <CreateTrackerWizard groups={groups} onClose={finish} onCreated={(t) => install.mutate(t.id)} />
      )}
      {manage && !mqtt && dialog === 'remove' && (
        <Modal open title={`Remover o rastreador da ${vehicleCode}`} onClose={close} testId="tracker-remove-modal" actions={<>
          <Button size="sm" variant="ghost" onClick={close}>Cancelar</Button>
          <Button size="sm" variant="dark" testId="tracker-remove-confirm" busy={remove.isPending} disabled={remove.isPending} onClick={() => remove.mutate()}>Remover</Button>
        </>}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Remover o rastreador da {vehicleCode}? Ele volta para o estoque e a moto fica sem rastreamento até instalar outro.
          </div>
          {remove.error && <ErrorNote error={remove.error} />}
        </Modal>
      )}
    </div>
  );
}
