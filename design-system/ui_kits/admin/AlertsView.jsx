
const ALERTS=[
 {id:1,sev:'danger',ic:'Activity',t:'Queda detectada',moto:'VT-7002',d:'Cliente não respondeu em 30 s · suporte acionado',when:'agora'},
 {id:2,sev:'danger',ic:'ShieldAlert',t:'Moto em movimento sem aluguel',moto:'VT-1077',d:'14 km/h · Av. Rebouças',when:'2 min'},
 {id:3,sev:'warning',ic:'WifiOff',t:'Rastreador desconectado',moto:'VT-3310',d:'Último sinal há 38 min',when:'38 min'},
 {id:4,sev:'warning',ic:'BatteryWarning',t:'Bateria crítica',moto:'VT-3310',d:'12% · tarefa criada para Rafael',when:'41 min'},
 {id:5,sev:'info',ic:'Hourglass',t:'Aluguel muito longo',moto:'VT-4821',d:'5 h 12 min · plano por minuto',when:'1 h'},
 {id:6,sev:'info',ic:'MapPin',t:'Parada fora do ponto',moto:'VT-0912',d:'Há 3 h · R. Haddock Lobo',when:'3 h'},
];
function AlertsView(){
  const { DataTable, Badge, Button, Icon, SegmentedControl, Alert } = VDS;
  const [f,setF]=React.useState('Abertos');
  const [ack,setAck]=React.useState([]);
  const sevL={danger:'Crítico',warning:'Atenção',info:'Info'};
  const rows=ALERTS.filter(a=>f==='Abertos'?!ack.includes(a.id):ack.includes(a.id));
  return <div style={{flex:1,overflow:'auto',padding:28,display:'flex',flexDirection:'column',gap:18}}>
    <div style={{display:'flex',alignItems:'center',gap:16}}><div style={{flex:1}}><div style={{font:'var(--type-title)',letterSpacing:'-.02em'}}>Alertas</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>Gerados pelo rastreador e pelas regras de área</div></div><SegmentedControl options={['Abertos','Resolvidos']} value={f} onChange={setF} style={{width:260}}/></div>
    <Alert tone="danger" title="2 alertas críticos" icon="Siren">Queda detectada e moto em movimento sem aluguel exigem ação imediata.</Alert>
    <DataTable rowKey="id" columns={[
      {key:'sev',label:'Nível',render:r=><Badge size="sm" tone={r.sev} icon={r.ic}>{sevL[r.sev]}</Badge>},
      {key:'t',label:'Alerta',render:r=><div><div style={{fontWeight:600}}>{r.t}</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)',whiteSpace:'normal'}}>{r.d}</div></div>},
      {key:'moto',label:'Moto',mono:true},{key:'when',label:'Quando',align:'right'},
      {key:'a',label:'',align:'right',render:r=>f==='Abertos'?<div style={{display:'flex',gap:6,justifyContent:'flex-end'}}><Button size="sm" variant="secondary" style={{color:'var(--text-primary)',borderColor:'var(--border-strong)'}}>Ver no mapa</Button><Button size="sm" variant="dark" onClick={()=>setAck([...ack,r.id])}>Resolver</Button></div>:<Badge size="sm" tone="neutral">Resolvido</Badge>}
    ]} rows={rows}/>
  </div>;
}
window.AlertsView=AlertsView;
