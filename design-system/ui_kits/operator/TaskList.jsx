
const TASKS=[
 {id:1,type:'battery',t:'Trocar bateria',moto:'VT-3310',bat:12,addr:'R. Augusta, 1020',dist:'350 m',pri:'Alta'},
 {id:2,type:'collect',t:'Recolher moto',moto:'VT-1077',bat:52,addr:'Av. Rebouças, 880 · fora do ponto há 3 h',dist:'1,2 km',pri:'Média'},
 {id:3,type:'maint',t:'Levar para manutenção',moto:'VT-2209',bat:70,addr:'Freio reportado por cliente',dist:'2,0 km',pri:'Alta'},
 {id:4,type:'move',t:'Reposicionar',moto:'VT-0458',bat:91,addr:'Para: Pç. Oswaldo Cruz (demanda alta)',dist:'2,6 km',pri:'Baixa'},
];
const TASK_ICON={battery:['BatteryCharging','info'],collect:['Truck','sun'],maint:['Wrench','danger'],move:['MapPinned','brand']};
function TaskList({ onOpen, done }) {
  const { SegmentedControl, ListRow, Card, Badge, StatTile, IconButton } = VDS;
  const [tab,setTab]=React.useState('Hoje');
  const list=tab==='Hoje'?TASKS.filter(t=>!done.includes(t.id)):TASKS.filter(t=>done.includes(t.id));
  return <div style={{position:'absolute',inset:0,background:'var(--surface-app)',display:'flex',flexDirection:'column'}}>
    <div style={{background:'var(--ink-900)',color:'#fff',padding:'58px 20px 20px',borderRadius:'0 0 28px 28px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{flex:1}}><div style={{font:'var(--type-caption)',color:'rgba(255,255,255,.6)'}}>Operador de campo · Turno 07–15h</div><div style={{font:'var(--type-title)',letterSpacing:'-.02em'}}>Olá, Rafael</div></div>
        <IconButton icon="Bell" variant="dark" dot label="Notificações" style={{background:'rgba(255,255,255,.1)'}}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:16}}>
        {[['Pendentes',TASKS.length-done.length],['Concluídas',done.length],['Baterias na van','6']].map(([l,v])=><div key={l} style={{padding:'10px 12px',borderRadius:14,background:'rgba(255,255,255,.08)'}}><div style={{font:'var(--fw-bold) 22px/1 var(--font-sans)'}}>{v}</div><div style={{font:'var(--type-caption)',color:'rgba(255,255,255,.6)',marginTop:4}}>{l}</div></div>)}
      </div>
    </div>
    <div style={{padding:'16px 20px 8px'}}><SegmentedControl options={['Hoje','Concluídas']} value={tab} onChange={setTab}/></div>
    <div style={{flex:1,overflow:'auto',scrollbarWidth:'none',padding:'4px 20px 40px',display:'flex',flexDirection:'column',gap:10}}>
      {list.length===0 && <div style={{textAlign:'center',font:'var(--type-body)',color:'var(--text-secondary)',padding:40}}>Nada por aqui.</div>}
      {list.map(t=>{const [ic,tone]=TASK_ICON[t.type];return <Card key={t.id} padding={4} onClick={()=>onOpen(t)}>
        <ListRow icon={ic} iconTone={tone} title={t.t+' · '+t.moto} subtitle={t.addr} trailing="chevron"/>
        <div style={{display:'flex',gap:6,padding:'0 14px 12px 62px'}}><Badge size="sm" tone={t.pri==='Alta'?'danger':t.pri==='Média'?'warning':'neutral'}>{t.pri}</Badge><Badge size="sm" tone="neutral">{t.dist}</Badge><Badge size="sm" tone={t.bat<=20?'danger':'success'}>{t.bat}%</Badge></div>
      </Card>})}
    </div>
  </div>;
}
Object.assign(window,{TaskList,TASKS,TASK_ICON});
