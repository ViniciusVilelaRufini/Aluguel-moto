/** KPI tile for dashboards. */
export interface StatTileProps {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down';
  icon?: string;
  style?: React.CSSProperties;
}
export declare function StatTile(props: StatTileProps): JSX.Element;
