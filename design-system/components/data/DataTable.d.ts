/** Simple bordered table for the admin panel. */
export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  mono?: boolean;
  render?: (row: any) => React.ReactNode;
}
export interface DataTableProps {
  columns: DataTableColumn[];
  rows: any[];
  onRowClick?: (row: any) => void;
  selectedKey?: string | number;
  rowKey?: string;
  dense?: boolean;
  style?: React.CSSProperties;
}
export declare function DataTable(props: DataTableProps): JSX.Element;
