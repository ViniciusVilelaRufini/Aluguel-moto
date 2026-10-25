'use client';

import { useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { buildHandoverCancel } from '@/lib/admin-forms';
import type { S } from '@/lib/types';
import { ReasonDialog, useToast } from './ui';

/** Cancelar a saída (`POST /handovers/{id}/cancel`): confirmação com motivo obrigatório. */
export function CancelHandoverDialog({ handover, onClose }: { handover: S<'Handover'> | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  return (
    <ReasonDialog open={!!handover} testId="cancel-handover-dialog" title="Cancelar entrega" danger confirmLabel="Cancelar entrega" cancelLabel="Voltar" onClose={onClose}
      description="A reserva volta a ficar ativa se ainda estiver no prazo; fora do prazo ela expira, a caução é liberada e a moto volta a ficar livre no galpão."
      onConfirm={async (reason) => {
        const built = buildHandoverCancel(reason);
        if (!built.ok) throw new Error(built.error);
        await unwrap(api.POST('/handovers/{id}/cancel', { params: { path: { id: handover!.id } }, body: built.body }));
        toast('Entrega cancelada');
        qc.invalidateQueries({ queryKey: ['handovers'] });
        qc.invalidateQueries({ queryKey: ['handover', handover!.id] });
      }} />
  );
}
