'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { COLLECT_NO_TASK_NOTICE, collectArrivalError, pickCollectTask, receiveCollectAtDepot } from '@/lib/collect-arrival';
import { defaultReturnDepot } from '@/lib/return-handover';
import { useSubmitGuard } from '@/lib/submit-guard';
import type { S } from '@/lib/types';
import { Field, Modal, Select, TextArea, useToast } from '@/components/ui';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';

type CollectVehicle = Pick<S<'Vehicle'>, 'id' | 'code' | 'depotId' | 'status'>;

/** Tarefa `collect` em aberto da moto (`GET /field-tasks`); só consulta quando a moto aguarda recolhimento e o perfil pode concluir. */
export function useOpenCollectTask(vehicleId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['field-tasks', 'collect', vehicleId],
    enabled,
    queryFn: async () => {
      const page = await unwrap(api.GET('/field-tasks', { params: { query: { vehicleId, type: 'collect', active: true, limit: 20 } } }));
      return pickCollectTask(page.items) ?? null;
    },
  });
}

/**
 * Ação "Recebida no galpão" na ficha de uma moto `awaiting_pickup`: botão quando há tarefa `collect` em aberto;
 * sem ela (dado inconsistente), só o aviso. Nada aparece para quem não é admin/operacao nem para outros status.
 */
export function CollectArrival({ vehicle, testId = 'vehicle-collect-arrive', hideButton = false }: { vehicle: CollectVehicle; testId?: string; hideButton?: boolean }) {
  const { groups } = useAuth();
  const [open, setOpen] = useState(false);
  const enabled = vehicle.status === 'awaiting_pickup' && can(groups, 'collect.arrive');
  const q = useOpenCollectTask(vehicle.id, enabled);
  if (!enabled || q.isLoading || q.error) return null;
  if (!q.data) return <Alert tone="warning" icon="TriangleAlert" testId="collect-no-task">{COLLECT_NO_TASK_NOTICE}</Alert>;
  return (
    <>
      {!hideButton && <Button size="sm" variant="secondary" icon="PackageCheck" testId={testId} onClick={() => setOpen(true)}>Recebida no galpão</Button>}
      {open && <CollectArrivalDialog task={q.data} vehicle={vehicle} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Diálogo "Recebida no galpão": galpão ativo (o da moto, se houver) e nota opcional; conclui a tarefa `collect`. */
export function CollectArrivalDialog({ task, vehicle, onClose }: { task: Pick<S<'FieldTask'>, 'id' | 'status'>; vehicle: Pick<S<'Vehicle'>, 'id' | 'code' | 'depotId'>; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { busy, run } = useSubmitGuard();
  const depotsQ = useQuery({ queryKey: ['depots', 'active'], queryFn: () => unwrap(api.GET('/depots')) });
  const depots = (depotsQ.data?.items ?? []).filter((d) => d.active);
  const [picked, setPicked] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const depotId = picked ?? defaultReturnDepot(depots, vehicle.depotId);

  const submit = () => run(async () => {
    setError(null);
    try {
      await receiveCollectAtDepot(task, { depotId, notes });
    } catch (e) {
      setError(collectArrivalError(e));
      return;
    }
    toast('Moto recebida no galpão');
    for (const key of ['fleet', 'vehicles', 'vehicle', 'field-tasks', 'tasks', 'depots']) qc.invalidateQueries({ queryKey: [key] });
    onClose();
  });

  return (
    <Modal open title="Recebida no galpão" onClose={onClose} testId="collect-arrival-dialog"
      actions={<>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button size="sm" variant="dark" icon="PackageCheck" testId="collect-arrival-submit" disabled={!depotId || busy} busy={busy} onClick={submit}>{busy ? 'Registrando...' : 'Confirmar chegada'}</Button>
      </>}>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        Moto <strong style={{ fontFamily: 'var(--font-mono)' }}>{vehicle.code}</strong>. Conclui o recolhimento: a moto volta a ficar livre no galpão escolhido.
      </div>
      <Field label="Galpão onde a moto chegou">
        <Select testId="collect-depot" value={depotId} onChange={setPicked}
          options={[...(depotId ? [] : [{ value: '', label: depotsQ.isLoading ? 'Carregando galpões...' : 'Escolha o galpão' }]), ...depots.map((d) => ({ value: d.id, label: d.name }))]} />
      </Field>
      <Field label="Observação (opcional)">
        <TextArea testId="collect-notes" value={notes} onChange={setNotes} placeholder="Ex.: trazida pela equipe, sem avarias" />
      </Field>
      {error && <Alert tone="danger" testId="collect-arrival-error">{error}</Alert>}
    </Modal>
  );
}
