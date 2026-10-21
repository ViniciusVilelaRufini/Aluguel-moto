/** Rounded 20px container. */
export interface CardProps {
  children?: React.ReactNode;
  variant?: 'elevated' | 'outline' | 'sunken' | 'media';
  padding?: number | string;
  radius?: number | string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
