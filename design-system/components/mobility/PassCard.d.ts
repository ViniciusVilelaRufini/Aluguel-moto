/** Horizontal-scroll promo card over the map ("Desbloqueie seu passe"). */
export interface PassCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  tone?: 'brand' | 'sun' | 'sky' | 'coral';
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function PassCard(props: PassCardProps): JSX.Element;
