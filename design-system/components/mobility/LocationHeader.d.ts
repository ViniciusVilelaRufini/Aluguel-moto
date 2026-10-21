/** Top-of-map header: avatar, current location, notifications. */
export interface LocationHeaderProps {
  initials?: string;
  label?: string;
  address?: string;
  hasNotification?: boolean;
  onAvatar?: () => void;
  onBell?: () => void;
  style?: React.CSSProperties;
}
export declare function LocationHeader(props: LocationHeaderProps): JSX.Element;
