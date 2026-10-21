/** Selectable radio card for plans, insurance, payment method. */
export interface OptionCardProps {
  title: string;
  description?: string;
  price?: string;
  priceNote?: string;
  /** Small tag next to title, e.g. "Obrigatório" */
  badge?: string;
  icon?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function OptionCard(props: OptionCardProps): JSX.Element;
