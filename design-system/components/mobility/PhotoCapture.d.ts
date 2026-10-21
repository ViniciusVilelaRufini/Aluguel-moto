/** Dashed capture slot for required photos (documento, selfie, moto estacionada, checklist). */
export interface PhotoCaptureProps {
  label?: string;
  hint?: string;
  done?: boolean;
  icon?: string;
  height?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function PhotoCapture(props: PhotoCaptureProps): JSX.Element;
