/** Inline contextual banner (zona de velocidade, limite de área, verificação pendente). */
export interface AlertProps {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children?: React.ReactNode;
  icon?: string;
  action?: string;
  onAction?: () => void;
  /** Filled color for floating over the map */
  solid?: boolean;
  style?: React.CSSProperties;
}
export declare function Alert(props: AlertProps): JSX.Element;
