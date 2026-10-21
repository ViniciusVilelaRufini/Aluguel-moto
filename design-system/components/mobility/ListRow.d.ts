/** Tappable settings / payment / promo row. */
export interface ListRowProps {
  icon?: string;
  iconTone?: 'neutral' | 'brand' | 'info' | 'sun' | 'danger';
  title: string;
  subtitle?: string;
  value?: string;
  trailing?: 'arrow' | 'chevron' | 'none';
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function ListRow(props: ListRowProps): JSX.Element;
