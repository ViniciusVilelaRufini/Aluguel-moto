/** Pill quick-action / filter chip (Tocar, Navegar, Reportar problema). */
export interface ChipProps {
  children?: React.ReactNode;
  icon?: string;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function Chip(props: ChipProps): JSX.Element;
