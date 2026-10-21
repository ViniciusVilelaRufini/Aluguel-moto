/** Lucide icon renderer. Requires lucide UMD (unpkg lucide@0.460.0) loaded before the bundle. */
export interface IconProps {
  /** Lucide name, PascalCase or kebab ("ScanQrCode" | "scan-qr-code") */
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
