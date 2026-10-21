/** Centered modal with scrim; positions absolutely to fill its nearest positioned parent (e.g. the phone screen). */
export interface DialogProps {
  open?: boolean;
  title?: string;
  children?: React.ReactNode;
  /** Stack of Buttons */
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  onClose?: () => void;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
