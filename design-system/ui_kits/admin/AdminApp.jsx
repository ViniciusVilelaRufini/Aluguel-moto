
const NAV=[{value:'fleet',label:'Frota ao vivo',icon:'Map'},{value:'alerts',label:'Alertas',icon:'Siren',badge:6},{value:'zones',label:'Cercas e regras',icon:'Hexagon'},{value:'customers',label:'Clientes',icon:'Users'},{value:'tasks',label:'Operação',icon:'ClipboardList'},{value:'finance',label:'Financeiro',icon:'ChartColumn'},{value:'settings',label:'Preços e planos',icon:'SlidersHorizontal'},{value:'team',label:'Equipe e acessos',icon:'KeyRound'}];
function AdminApp(){
  const [auth,setAuth]=React.useState(()=>localStorage.getItem('volti-admin-auth')!=='0');
  const [v,setV]=React.useState(()=>localStorage.getItem('volti-admin-view')||'fleet');
  const go=x=>{setV(x);localStorage.setItem('volti-admin-view',x)};
  const login=x=>{setAuth(x);localStorage.setItem('volti-admin-auth',x?'1':'0')};
  if(!auth) return <LoginView onDone={()=>login(true)}/>;
  const V={fleet:FleetView,alerts:AlertsView,zones:ZonesView,customers:CustomersView,tasks:OperationsView,finance:FinanceView,settings:PricingView,team:TeamView}[v]||FleetView;
  return <div style={{height:'100vh',display:'flex',fontFamily:'var(--font-sans)',color:'var(--text-primary)',background:'var(--surface-app)'}}>
    <VDS.SideNav items={NAV} value={v} onChange={go} footer={<div style={{display:'flex',alignItems:'center',gap:10,padding:12,borderRadius:12,background:'rgba(255,255,255,.06)'}}><div style={{width:32,height:32,borderRadius:'50%',background:'var(--sun-300)',color:'var(--ink-900)',display:'flex',alignItems:'center',justifyContent:'center',font:'var(--fw-bold) 12px/1 var(--font-sans)'}}>CM</div><div style={{flex:1}}><div style={{font:'var(--type-label)'}}>Carla M.</div><div style={{font:'var(--type-caption)',color:'rgba(255,255,255,.55)'}}>Operação · 2FA</div></div><button onClick={()=>login(false)} aria-label="Sair" style={{border:0,background:'transparent',color:'rgba(255,255,255,.6)',cursor:'pointer',padding:6}}><VDS.Icon name="LogOut" size={16}/></button></div>}/>
    <main style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
      <header style={{height:64,flexShrink:0,display:'flex',alignItems:'center',gap:16,padding:'0 24px',background:'var(--surface-card)',borderBottom:'1px solid var(--border-subtle)'}}>
        <div style={{font:'var(--type-heading)',flex:1}}>{NAV.find(n=>n.value===v).label}</div>
        <div style={{display:'flex',alignItems:'center',gap:8,height:40,padding:'0 14px',borderRadius:999,background:'var(--surface-sunken)',width:280,color:'var(--text-tertiary)',font:'var(--type-label)',fontWeight:500}}><VDS.Icon name="Search" size={16}/>Buscar moto, cliente ou aluguel</div>
        <VDS.Badge tone="success" icon="Wifi">108 motos · 2 sem sinal</VDS.Badge>
      </header>
      <div style={{flex:1,display:'flex',minHeight:0}}><V/></div>
    </main>
  </div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<AdminApp/>);
