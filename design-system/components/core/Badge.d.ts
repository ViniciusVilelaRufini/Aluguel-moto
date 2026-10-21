/** Small rectangular status/price label ("Grátis na 1ª corrida", "R$ 0,79/min"). */
export interface BadgeProps {
  children?: React.ReactNode;
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'dark';
  icon?: string;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
