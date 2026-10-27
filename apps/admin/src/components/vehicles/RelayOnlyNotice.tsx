import { RELAY_ONLY_SPEED_HINT, type TrackerControlMode } from '@/lib/tracker';

/** Ficha da moto com rastreador só relé: explica por que o limite não é comandável e como o bloqueio funciona. */
export function RelayOnlyNotice({ mode }: { mode: TrackerControlMode | undefined }) {
  if (mode !== 'relay_only') return null;
  return (
    <div data-testid="relay-only-hint" role="note" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
      {RELAY_ONLY_SPEED_HINT}. O bloqueio só corta com a moto parada; limites de zona são avisos ao cliente.
    </div>
  );
}
