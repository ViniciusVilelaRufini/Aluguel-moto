/**
 * Dark sidebar for the web admin panel.
 * @startingPoint section="Admin" subtitle="Navegação lateral do painel" viewport="700x420"
 */
export interface SideNavItem { value: string; label: string; icon: string; badge?: number; }
export interface SideNavProps {
  items: SideNavItem[];
  value?: string;
  onChange?: (value: string) => void;
  footer?: React.ReactNode;
  brand?: string;
  style?: React.CSSProperties;
}
export declare function SideNav(props: SideNavProps): JSX.Element;
