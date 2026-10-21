/** Filled text field, 52px, green focus ring. */
export interface InputProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: string;
  hint?: string;
  error?: string;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  style?: React.CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;
