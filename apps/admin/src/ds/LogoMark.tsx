/** Símbolo "Roda" da Volti (design-system/assets/logo/logo-mark.svg), com a cor do traço por parâmetro. */
export function LogoMark({ size = 40, color = 'var(--green-500)' }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width={size} height={size} aria-hidden="true" focusable="false">
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="40" cy="132" r="22" strokeWidth="12" />
        <circle cx="140" cy="132" r="22" strokeWidth="12" />
        <polyline points="62,64 90,124 120,52" strokeWidth="16" />
        <line x1="40" y1="132" x2="70" y2="82" strokeWidth="11" />
        <line x1="120" y1="52" x2="140" y2="132" strokeWidth="11" />
        <line x1="46" y1="62" x2="78" y2="62" strokeWidth="12" />
        <line x1="108" y1="44" x2="138" y2="44" strokeWidth="12" />
      </g>
    </svg>
  );
}
