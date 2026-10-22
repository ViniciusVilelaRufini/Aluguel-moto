'use client';

import { commandSteps, stepProgress, type StepState } from '@/lib/command-steps';
import type { CommandStatus, CommandStatusReason } from '@/lib/types';
import { Icon } from '@/ds/Icon';

/**
 * Cores dos pontos com contraste de ícone >= 3:1 (WCAG 1.4.11): tinta ink-900 sobre verde (7,7:1)
 * e laranja (6,4:1); branco sobre azul info (4,0:1) e sobre coral escuro --danger-ink (3,9:1).
 */
const DOT: Record<StepState, { bg: string; fg: string; ring?: string; icon?: string }> = {
  done: { bg: 'var(--brand)', fg: 'var(--ink-900)', icon: 'Check' },
  active: { bg: 'var(--info)', fg: '#fff', ring: 'var(--info)' },
  waiting: { bg: 'var(--warning)', fg: 'var(--ink-900)', ring: 'var(--warning)', icon: 'WifiOff' },
  todo: { bg: 'var(--surface-card)', fg: 'var(--ink-500)' },
  failed: { bg: 'var(--danger-ink)', fg: '#fff', icon: 'X' },
};

/**
 * Estado do comando remoto ao vivo: três passos ligados por uma linha que se preenche
 * (`--ease-out`); o passo atual pulsa (vt-pulse-ring, parado com movimento reduzido).
 */
export function CommandTimeline({ status, reason }: { status: CommandStatus; reason?: CommandStatusReason }) {
  const steps = commandSteps(status, reason);
  const fill = stepProgress(steps);
  const failed = status === 'failed';
  return (
    <ol data-testid="command-timeline" aria-label="Andamento do comando" style={{ listStyle: 'none', margin: 0, padding: '4px 0 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', position: 'relative' }}>
      <span aria-hidden style={{ position: 'absolute', top: 15, left: '16.66%', right: '16.66%', height: 2, borderRadius: 1, background: 'var(--ink-200)' }} />
      <span aria-hidden style={{ position: 'absolute', top: 15, left: '16.66%', width: `calc(66.66% * ${fill})`, height: 2, borderRadius: 1, background: failed ? 'var(--danger)' : 'var(--brand)', transition: 'width var(--dur-slow) var(--ease-out), background var(--dur-base)' }} />
      {steps.map((s) => {
        const d = DOT[s.state];
        const current = s.state === 'active' || s.state === 'waiting';
        return (
          <li key={s.key} aria-current={current ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
            <span style={{ position: 'relative', width: 22, height: 22, marginTop: 1 }}>
              {d.ring && <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: d.ring, animation: 'vt-pulse-ring 1.6s var(--ease-out) infinite' }} />}
              <span key={s.state} style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: d.bg, color: d.fg, border: s.state === 'todo' ? '2px solid var(--ink-200)' : '2px solid #fff', boxShadow: s.state === 'todo' ? 'none' : 'var(--shadow-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', animation: s.state === 'done' || s.state === 'failed' ? 'vt-check-pop 360ms var(--ease-spring) backwards' : undefined }}>
                {d.icon ? <Icon name={d.icon} size={11} strokeWidth={3} /> : current ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.fg }} /> : null}
              </span>
            </span>
            <span style={{ font: 'var(--type-caption)', fontWeight: current || s.state === 'failed' ? 600 : 500, color: s.state === 'todo' ? 'var(--text-tertiary)' : s.state === 'failed' ? 'var(--danger-ink)' : 'var(--text-primary)', textAlign: 'center' }}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
