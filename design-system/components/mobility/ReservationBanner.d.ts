/** Coral reservation countdown with swipe-to-cancel. */
export interface ReservationBannerProps {
  /** Remaining seconds */
  seconds?: number;
  label?: string;
  swipeLabel?: string;
  onCancel?: () => void;
  style?: React.CSSProperties;
}
export declare function ReservationBanner(props: ReservationBannerProps): JSX.Element;
