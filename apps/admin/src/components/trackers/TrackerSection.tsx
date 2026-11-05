'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { can } from '@/lib/permissions';
import { imeiLast4, trackerStatusLabel, type TrackerDevice } from '@/lib/trackers';
import { useNow } from '@/lib/use-now';
import type { StaffGroup } from '@/lib/types';
import { Button } from '@/ds/Button';
import { ErrorNote, KV, Modal, Pill, SectionTitle } from '../ui';
import { CreateTrackerWizard } from './CreateTrackerWizard';
import { TrackerPicker } from './TrackerPicker';

type Dialog = 'install' | 'swap' | 'remove' | 'create' | null;

/**
 * Bloco "Rastreador e chip" da ficha da moto. Todo perfil com acesso à ficha vê os dados;
 * só admin e operação instalam, trocam e removem (`tracker.manage`).
 */
export function TrackerSection({ vehicleId, vehicleCode, groups }: { vehicleId: string; vehicleCode: string; groups: StaffGroup[] }) {
  const manage = can(groups, 'tracker.manage');
  const qc = useQueryClient();
  const now = useNow();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['trackers', 'vehicle', vehicleId],
    queryFn: () => unwrap(api.GET('/trackers', { params: { query: { vehicleId } } })),
  });
  const tracker: TrackerDevice | undefined = q.data?.items[0];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
    qc.invalidateQueries({ queryKey: ['trackers'] });
    qc.invalidateQueries({ queryKey: ['sim-cards'] });
  };
  const close = () => { setDialog(null); setPickedId(null); };
  const install = useMutation({
    mutationFn: async (trackerId: string) => unwrap(api.PUT('/vehicles/{id}/tracker', { params: { path: { id: vehicleId } }, body: { trackerId } })),
    onSuccess: () => { refresh(); close(); },
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(api.DELETE('/vehicles/{id}/tracker', { params: { path: { id: vehicleId } } })),
    onSuccess: () => { refresh(); close(); },
  });
  const swapping = dialog === 'swap';

  return (
    <div data-testid="tracker-section">
      <SectionTitle>Rastreador e chip</SectionTitle>
      {tracker ? (
        <>
          <KV k="IMEI" v={tracker.imei} mono />
          <KV k="Modelo" v={tracker.model} />
          <KV k="Chip" v={tracker.simCard ? `${tracker.simCard.carrier} · ${tracker.simCard.iccid}` : 'Sem chip'} mono={!!tracker.simCard} />
          <KV k="Sinal" v={<Pill tone={tracker.online ? 'success' : 'neutral'}>{trackerStatusLabel(tracker, now)}</Pill>} />
          {manage && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Button size="sm" variant="secondary" icon="Repeat" testId="tracker-swap" onClick={() => setDialog('swap')}>Trocar</Button>
              <Button size="sm" variant="ghost" icon="Unlink" testId="tracker-remove" onClick={() => setDialog('remove')}>Remover</Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Esta moto não tem rastreador.</div>
          {manage && <Button size="sm" variant="secondary" icon="Plus" testId="tracker-install" style={{ marginTop: 8 }} onClick={() => setDialog('install')}>Instalar rastreador</Button>}
        </>
      )}

      {manage && (dialog === 'install' || swapping) && (
        <Modal open title={swapping ? `Trocar o rastreador da ${vehicleCode}` : `Instalar rastreador na ${vehicleCode}`} onClose={close} testId="tracker-pick-modal" actions={<>
          <Button size="sm" variant="ghost" onClick={close}>Cancelar</Button>
          <Button size="sm" variant="secondary" icon="Plus" testId="tracker-create-new" onClick={() => setDialog('create')}>Cadastrar novo</Button>
          <Button size="sm" testId="tracker-confirm" busy={install.isPending} disabled={!pickedId || install.isPending} onClick={() => pickedId && install.mutate(pickedId)}>{swapping ? 'Trocar' : 'Instalar'}</Button>
        </>}>
          {swapping && tracker && (
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Trocar o rastreador da {vehicleCode}? O rastreador atual (final {imeiLast4(tracker.imei)}) volta para o estoque.
            </div>
          )}
          <div style={{ fontSize: 14, fontWeight: 600 }}>Escolha o rastreador do estoque</div>
          <TrackerPicker selectedId={pickedId} onSelect={setPickedId} />
          {install.error && <ErrorNote error={install.error} />}
        </Modal>
      )}
      {/* Falha ao instalar depois de "Cadastrar novo": os diálogos já fecharam, então o erro fica visível aqui. */}
      {dialog === null && install.error && <div data-testid="tracker-install-error" style={{ marginTop: 8 }}><ErrorNote error={install.error} /></div>}
      {manage && dialog === 'create' && (
        <CreateTrackerWizard onClose={close} onCreated={(t) => install.mutate(t.id)} />
      )}
      {manage && dialog === 'remove' && (
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
