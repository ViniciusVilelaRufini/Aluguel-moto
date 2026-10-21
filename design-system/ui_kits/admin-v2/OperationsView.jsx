
const OPS=[
 {id:1,col:'Pendente',t:'Trocar bateria',moto:'VT-3310',who:null,ic:'BatteryCharging',pri:'Alta'},
 {id:2,col:'Pendente',t:'Recolher moto',moto:'VT-1077',who:null,ic:'Truck',pri:'Média'},
 {id:3,col:'Em andamento',t:'Levar para manutenção',moto:'VT-2209',who:'Rafael',ic:'Wrench',pri:'Alta'},
 {id:4,col:'Em andamento',t:'Reposicionar',moto:'VT-0458',who:'Júlia',ic:'MapPinned',pri:'Baixa'},
 {id:5,col:'Concluída',t:'Trocar bateria',moto:'VT-6104',who:'Rafael',ic:'BatteryCharging',pri:'Média'},
];
function OperationsView(){
  const { Badge, Button, Card, DataTable, Icon, SegmentedControl } = VDS;
  const [view,setView]=React.useState('Tarefas');
  const cols=['Pendente','Em andamento','Concluída'];
  return <div style={{flex:1,overflow:'auto',padding:28,display:'flex',flexDirection:'column',gap:18}}>
    <div style={{display:'flex',alignItems:'center',gap:16}}><div style={{flex:1}}><div style={{font:'var(--type-title)',letterSpacing:'-.02em'}}>Operação</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>Tarefas da equipe de campo e manutenção preventiva</div></div><SegmentedControl options={['Tarefas','Manutenção']} value={view} onChange={setView} style={{width:280}}/><Button size="sm" icon="Plus">Nova tarefa</Button></div>
    {view==='Tarefas' ? <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14,alignItems:'start'}}>
      {cols.map(c=><div key={c} style={{background:'var(--surface-sunken)',borderRadius:'var(--radius-lg)',padding:12,display:'flex',flexDirection:'column',gap:10}}>
        <div style={{display:'flex',justifyContent:'space-between',padding:'4px 6px'}}><span style={{font:'var(--type-label)'}}>{c}</span><span style={{font:'var(--fw-bold) 12px/1 var(--font-mono)',color:'var(--text-secondary)'}}>{OPS.filter(o=>o.col===c).length}</span></div>
        {OPS.filter(o=>o.col===c).map(o=><Card key={o.id} padding={14} style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',gap:10,alignItems:'center'}}><span style={{width:32,height:32,borderRadius:10,background:'var(--surface-sunken)',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon name={o.ic} size={16}/></span><div style={{flex:1}}><div style={{font:'var(--type-label)'}}>{o.t}</div><div style={{font:'var(--fw-medium) 12px/1.3 var(--font-mono)',color:'var(--text-secondary)'}}>{o.moto}</div></div></div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}><Badge size="sm" tone={o.pri==='Alta'?'danger':o.pri==='Média'?'warning':'neutral'}>{o.pri}</Badge><span style={{flex:1}}/>{o.who?<span style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>{o.who}</span>:<Button size="sm" variant="ghost" icon="UserPlus" style={{height:28,padding:'0 8px'}}>Atribuir</Button>}</div>
        </Card>)}
      </div>)}
    </div> :
    <DataTable columns={[{key:'m',label:'Moto',mono:true},{key:'km',label:'Km desde revisão',align:'right'},{key:'h',label:'Horas de uso',align:'right'},{key:'n',label:'Próxima revisão'},{key:'s',label:'Situação',render:r=><Badge size="sm" tone={r.t}>{r.s}</Badge>},{key:'a',label:'',align:'right',render:r=><Button size="sm" variant="secondary" style={{color:'var(--text-primary)',borderColor:'var(--border-strong)'}}>Agendar</Button>}]}
      rows={[{id:1,m:'VT-2209',km:'1.012',h:'96 h',n:'Atrasada',s:'Vencida',t:'danger'},{id:2,m:'VT-4821',km:'412',h:'38 h',n:'em 588 km',s:'Em dia',t:'success'},{id:3,m:'VT-7190',km:'870',h:'81 h',n:'em 130 km',s:'Próxima',t:'warning'},{id:4,m:'VT-0912',km:'205',h:'19 h',n:'em 795 km',s:'Em dia',t:'success'}]}/>}
  </div>;
}
window.OperationsView=OperationsView;
