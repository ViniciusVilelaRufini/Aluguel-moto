/** Segmented progress bar for multi-step flows (cadastro, devolução). */
export interface ProgressStepsProps {
  total?: number;
  /** 0-based index of the current step */
  current?: number;
  label?: string;
  style?: React.CSSProperties;
}
export declare function ProgressSteps(props: ProgressStepsProps): JSX.Element;
