/** Vehicle fleet status indicator (admin & operator). */
export interface FleetStatusProps {
  status?: 'free' | 'rented' | 'reserved' | 'paused' | 'blocked' | 'maintenance' | 'offline';
  count?: number;
  /** pill = filter chip; dot = inline table label */
  variant?: 'pill' | 'dot';
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function FleetStatus(props: FleetStatusProps): JSX.Element;
