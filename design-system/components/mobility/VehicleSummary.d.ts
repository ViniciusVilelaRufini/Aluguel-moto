/**
 * Vehicle hero for the bottom sheet: photo tile + category, name, battery, pricing.
 * @startingPoint section="Mobility" subtitle="Resumo da moto no bottom sheet" viewport="700x260"
 */
export interface VehicleSummaryProps {
  category?: string;
  name?: string;
  level?: number;
  range?: number;
  price?: string;
  promo?: string;
  /** Cut-out vehicle PNG URL; placeholder shown if omitted */
  image?: string;
  onView3d?: () => void;
  style?: React.CSSProperties;
}
export declare function VehicleSummary(props: VehicleSummaryProps): JSX.Element;
