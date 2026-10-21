/** iOS-proportioned toggle, green when on. */
export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}
export declare function Switch(props: SwitchProps): JSX.Element;
