/** Dark transient message bar. */
export interface ToastProps {
  children?: React.ReactNode;
  tone?: 'success' | 'info' | 'warning' | 'danger';
  action?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
