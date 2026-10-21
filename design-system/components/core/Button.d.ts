/**
 * Pill-shaped action button. Primary = green fill with green glow.
 * @startingPoint section="Core" subtitle="Botões pill: primário, secundário, escuro" viewport="700x300"
 */
export interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Lucide icon name, leading */
  icon?: string;
  iconRight?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Spinner replaces the leading icon; button is inert */
  loading?: boolean;
  /** Periodic light sweep — use only on the single main CTA of a screen */
  shine?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
