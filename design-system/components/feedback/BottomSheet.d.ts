/** Map-overlay sheet anchored to the bottom, 28px top radius with grabber. */
export interface BottomSheetProps {
  children?: React.ReactNode;
  open?: boolean;
  padding?: string | number;
  style?: React.CSSProperties;
}
export declare function BottomSheet(props: BottomSheetProps): JSX.Element;
