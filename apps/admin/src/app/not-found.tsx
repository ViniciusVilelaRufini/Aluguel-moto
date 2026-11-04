import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/ds/Icon';
import { LogoMark } from '@/ds/LogoMark';

export const metadata: Metadata = { title: 'Página não encontrada · Volti' };

/** Rota desconhecida (exportação estática: vira 404.html). Sem hooks: funciona dentro e fora do painel. */
export default function NotFound() {
  return (
    <main data-testid="not-found" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--surface-app)', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <LogoMark size={44} />
        <div style={{ font: '700 13px/1 var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '.08em' }}>404</div>
        <h1 style={{ font: '700 24px/1.25 var(--font-sans)', margin: 0 }}>Página não encontrada</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', margin: 0, textWrap: 'pretty' }}>O endereço não existe ou foi movido. Volte à frota para continuar.</p>
        <Link href="/fleet/" data-testid="not-found-home"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 48, padding: '0 20px', borderRadius: 'var(--radius-pill)', background: 'var(--brand)', color: 'var(--on-brand)', boxShadow: 'var(--shadow-brand)', font: 'var(--fw-semibold) 15px/1 var(--font-sans)', textDecoration: 'none' }}>
          <Icon name="Map" size={20} />Voltar à frota
        </Link>
      </div>
    </main>
  );
}
