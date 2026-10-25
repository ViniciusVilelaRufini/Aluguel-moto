'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { formatBRL } from '@/lib/format';
import { ReasonDialog, useToast } from './ui';

/**
 * Task 14: o financeiro registra a quitação da inadimplência paga fora do app (`POST /customers/{id}/delinquency/clear`).
 * Mostra quanto está em aberto (`Customer.debtCents`); o motivo vai para a auditoria.
 */
export function DelinquencyClearDialog({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const customer = useQuery({ queryKey: ['customer', customerId], queryFn: () => unwrap(api.GET('/customers/{id}', { params: { path: { id: customerId } } })) });
  const c = customer.data;
  const debt = c?.debtCents;
  return (
    <ReasonDialog
      open
      testId="delinquency-clear"
      title="Registrar quitação"
      confirmLabel="Registrar quitação"
      onClose={onClose}
      description={
        <span data-testid="delinquency-debt">
          {debt !== undefined && debt > 0
            ? <>Em aberto: <strong style={{ color: 'var(--text-primary)' }}>{formatBRL(debt)}</strong>. </>
            : null}
          Use quando o cliente pagou fora do app (transferência, acordo). As dívidas em aberto ficam quitadas e o cliente volta a alugar. Informe como foi pago.
        </span>
      }
      onConfirm={async (reason) => {
        await unwrap(api.POST('/customers/{id}/delinquency/clear', { params: { path: { id: customerId } }, body: { reason } }));
        toast('Quitação registrada. O cliente pode alugar de novo.');
        qc.invalidateQueries({ queryKey: ['customer', customerId] });
        qc.invalidateQueries({ queryKey: ['customers'] });
        qc.invalidateQueries({ queryKey: ['wallet-customers'] });
        qc.invalidateQueries({ queryKey: ['payments'] });
      }}
    />
  );
}
