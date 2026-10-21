/** Circular icon-only button (bell, locate-me, close). */
export interface IconButtonProps {
  icon: string;
  variant?: 'surface' | 'ghost' | 'soft' | 'brand' | 'dark';
  /** Diameter in px. Default 44 (min hit target). */
  size?: number;
  /** Orange notification dot */
  dot?: boolean;
  label?: string;
  iconColor?: string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
