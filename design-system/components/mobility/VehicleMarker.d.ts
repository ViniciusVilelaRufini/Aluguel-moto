/** Map pin for an available moto with battery tick underneath. */
export interface VehicleMarkerProps {
  level?: number;
  selected?: boolean;
  /** Entrance delay in ms — stagger markers when the map loads */
  delay?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function VehicleMarker(props: VehicleMarkerProps): JSX.Element;
