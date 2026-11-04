'use client';

import { useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { ReasonDialog, useToast } from './ui';

/**
 * "Encerrar aluguel à força" (`POST /rentals/{id}/force-end`): no detalhe do aluguel e na ficha da moto. A API encerra e liquida
 * na hora (aceita `ending`, sem esperar a trava): é a saída quando a moto não trava (ex.: sem GPS em local coberto).
 */
export function ForceEndRentalDialog({ rentalId, vehicleId, open, onClose }: { rentalId: string; vehicleId?: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  return (
    <ReasonDialog
      open={open}
      title="Encerrar aluguel à força"
      description="O aluguel é encerrado e liquidado agora. Fora da zona de devolução só o admin pode encerrar, e a taxa de encerramento forçado é somada."
      confirmLabel="Encerrar aluguel"
      danger
      onClose={onClose}
      onConfirm={async (reason) => {
        await unwrap(api.POST('/rentals/{id}/force-end', { params: { path: { id: rentalId } }, body: { reason } }));
        toast('Aluguel encerrado');
        qc.invalidateQueries({ queryKey: ['rental', rentalId] });
        qc.invalidateQueries({ queryKey: ['rentals'] });
        if (vehicleId) qc.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      }}
    />
  );
}
