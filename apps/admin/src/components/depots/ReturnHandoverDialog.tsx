'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { hasCounterBalance } from '@/lib/counter';
import { emptyChecklist, initialBattery, type ChecklistState } from '@/lib/pickup-handover';
import { ARRIVAL_CHECKLIST, buildReturnBody, defaultReturnDepot, missingForReturn, returnErrorMessage } from '@/lib/return-handover';
import { useSubmitGuard } from '@/lib/submit-guard';
import type { S } from '@/lib/types';
import { counterBalanceQuery } from '@/components/CounterSettleDialog';
import { Field, Modal, Select, useToast } from '@/components/ui';
import { Alert } from '@/ds/Alert';
import { Button } from '@/ds/Button';
import { BatteryFields, ChecklistFields, PhotoFields, useHandoverPhotos } from './HandoverInspection';

export type ReturnVehicle = Pick<S<'Vehicle'>, 'id' | 'code' | 'depotId' | 'batteryPct' | 'batteryKnown'>;

/**
 * "Receber no galpão": o cliente devolve a moto no balcão e o atendente registra a chegada do aluguel `rentalId`
 * (`POST /handovers`, `return_depot`) com o checklist de chegada, as fotos e a bateria. O galpão vem o da moto (entre
 * os ativos). A API só aceita com a moto a até 150 m do galpão e com posição ao vivo. Depois, `onDone` diz se o
 * cliente tem algo a acertar no balcão (`GET /rentals/{id}/counter-balance`). Sem `Idempotency-Key` no contrato: a
 * repetição da mesma chegada devolve a entrega existente, e o botão fica travado durante o envio.
 */
export function ReturnHandoverDialog({ rentalId, vehicle, onClose, onDone }: {
  rentalId: string;
  vehicle: ReturnVehicle;
  onClose: () => void;
  onDone: (r: { rentalId: string; settle: boolean }) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { busy, run } = useSubmitGuard();
  const depotsQ = useQuery({ queryKey: ['depots', 'active'], queryFn: () => unwrap(api.GET('/depots')) });
  const depots = (depotsQ.data?.items ?? []).filter((d) => d.active);
  const [picked, setPicked] = useState<string | null>(null);
  const depotId = picked ?? defaultReturnDepot(depots, vehicle.depotId);
  const [checklist, setChecklist] = useState<ChecklistState>(() => emptyChecklist(ARRIVAL_CHECKLIST));
  const [battery, setBattery] = useState(() => initialBattery(vehicle));
  const [serial, setSerial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const photoState = useHandoverPhotos(setError);
  const { photos, uploading } = photoState;
  const batteryKnown = vehicle.batteryKnown !== false;

  const draft = { rentalId, depotId, checklist, photoKeys: photos.map((p) => p.key), battery, batterySerial: serial };
  const missing = missingForReturn(draft);
  const body = buildReturnBody(draft);
  const anyIssue = ARRIVAL_CHECKLIST.some((i) => checklist[i.code]?.ok === false);

  const submit = () => run(async () => {
    if (!body) return;
    setError(null);
    try {
      await unwrap(api.POST('/handovers', { body }));
    } catch (e) {
      setError(returnErrorMessage(e));
      return;
    }
    toast(anyIssue ? 'Chegada registrada — a moto foi para a manutenção' : 'Chegada registrada — aluguel encerrado');
    for (const key of [['rental', rentalId], ['rentals'], ['fleet'], ['vehicles'], ['vehicle', vehicle.id], ['handovers'], ['depots'], ['counter-balance', rentalId]]) {
      qc.invalidateQueries({ queryKey: key });
    }
    // O saldo do balcão só existe depois do fechamento; sem ele (erro), não abre o acerto.
    let settle = false;
    try { settle = hasCounterBalance(await qc.fetchQuery(counterBalanceQuery(rentalId))); } catch { settle = false; }
    onDone({ rentalId, settle });
  });

  const canSubmit = !!body && !uploading && !busy;

  return (
    <Modal open width={600} title="Receber no galpão" onClose={onClose} testId="return-handover-dialog"
      actions={<>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button size="sm" variant="dark" icon="PackageCheck" testId="return-handover-submit" disabled={!canSubmit} busy={busy} onClick={submit}>{busy ? 'Registrando...' : 'Registrar chegada'}</Button>
      </>}>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        Moto <strong style={{ fontFamily: 'var(--font-mono)' }}>{vehicle.code}</strong>. A moto precisa estar no galpão (até 150 m) e com sinal. Ao registrar, o aluguel é encerrado; com algum item com problema, a moto vai para a manutenção.
      </div>

      <Field label="Galpão">
        <Select testId="return-depot" value={depotId} onChange={setPicked}
          options={[...(depotId ? [] : [{ value: '', label: depotsQ.isLoading ? 'Carregando galpões...' : 'Escolha o galpão' }]), ...depots.map((d) => ({ value: d.id, label: d.name }))]} />
      </Field>

      <ChecklistFields prefix="return" label="Checklist de chegada" items={ARRIVAL_CHECKLIST} value={checklist} onChange={setChecklist} />
      <PhotoFields prefix="return" state={photoState} />
      <BatteryFields prefix="return" known={batteryKnown} battery={battery} onBattery={setBattery} serial={serial} onSerial={setSerial} />

      {!body && missing.length > 0 && (
        <div data-testid="return-missing" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Falta: {missing.join(' · ')}.</div>
      )}
      {error && <Alert tone="danger" testId="return-handover-error">{error}</Alert>}
    </Modal>
  );
}
