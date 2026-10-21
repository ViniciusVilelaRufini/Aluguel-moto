/** Dark pill showing battery % and estimated range. Ring color follows level. */
export interface BatteryPillProps {
  /** 0–100 */
  level?: number;
  /** Estimated range in km */
  range?: number;
  style?: React.CSSProperties;
}
export declare function BatteryPill(props: BatteryPillProps): JSX.Element;
