/** Segmented one-time code field (SMS). */
export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  style?: React.CSSProperties;
}
export declare function OtpInput(props: OtpInputProps): JSX.Element;
