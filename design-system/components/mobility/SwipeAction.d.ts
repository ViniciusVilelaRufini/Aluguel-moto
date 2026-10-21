/** Drag-to-confirm track for destructive or committing actions. */
export interface SwipeActionProps {
  label?: string;
  tone?: 'danger' | 'brand';
  /** Fires when the knob passes 85% of the track */
  onComplete?: () => void;
  style?: React.CSSProperties;
}
export declare function SwipeAction(props: SwipeActionProps): JSX.Element;
