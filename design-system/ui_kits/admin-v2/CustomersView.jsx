
const CUSTOMERS=[
 {id:'c1',name:'Ana Lima',cpf:'123.•••.•••-00',ver:'ok',rents:23,bal:'R$ 38,50',st:'Ativa',plan:'Semanal entregador',since:'mar/2026',match:'98%'},
 {id:'c2',name:'Bruno Costa',cpf:'456.•••.•••-11',ver:'pending',rents:0,bal:'R$ 0,00',st:'Em análise',plan:'—',since:'hoje',match:'—'},
 {id:'c3',name:'Carla Souza',cpf:'789.•••.•••-22',ver:'ok',rents:7,bal:'R$ 4,00',st:'Ativa',plan:'Por minuto',since:'set/2026',match:'95%'},
 {id:'c4',name:'Diego Alves',cpf:'321.•••.•••-33',ver:'fail',rents:0,bal:'R$ 0,00',st:'Restrição (fraude)',plan:'—',since:'ontem',match:'41%'},
 {id:'c5',name:'Eduarda Reis',cpf:'654.•••.•••-44',ver:'ok',rents:61,bal:'R$ 112,00',st:'Inadimplente',plan:'Mensal',since:'jan/2026',match:'97%'},
];
const VER={ok:['success','Verificada','ShieldCheck'],pending:['warning','Pendente','Hourglass'],fail:['danger','Reprovada','ShieldAlert']};
const ST_TONE={'Ativa':'success','Em análise':'warning','Restrição (fraude)':'danger','Inadimplente':'danger'};
const TICKETS=[['Contestação','Cobrança em dobro · 18/10','warning','Aberta'],['Sinistro','Queda leve · VT-7002 · BO anexado','danger','Em análise'],['Estorno','Caução R$ 150 via Pix','success','Pago'],['Chat','"A moto não destrava"','info','Respondido']];
function CustomersView(){
  const { DataTable, Badge, Button, SegmentedControl, Input, IconButton, Card, ListRow, PhotoCapture, Icon } = VDS;
  const [f,setF]=React.useState('Todos');
  const [sel,setSel]=React.useState('c1');
  const [tab,setTab]=React.useState('Verificação');
  const rows=CUSTOMERS.filter(c=>f==='Todos'||(f==='Pendentes'&&c.ver==='pending')||(f==='Bloqueados'&&ST_TONE[c.st]==='danger'));
  const c=CUSTOMERS.find(x=>x.id===sel);
  const kv=(k,v)=><div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--ink-100)',font:'var(--type-label)',fontWeight:500}}><span style={{color:'var(--text-secondary)'}}>{k}</span><span>{v}</span></div>;
  return <div style={{flex:1,display:'flex',minWidth:0}}>
    <div style={{flex:1,overflow:'auto',padding:28,display:'flex',flexDirection:'column',gap:16,minWidth:0}}>
      <div style={{display:'flex',alignItems:'center',gap:16}}><div style={{flex:1}}><div style={{font:'var(--type-title)',letterSpacing:'-.02em'}}>Clientes</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>Verificação, bloqueio de conta e lista de restrição</div></div><SegmentedControl options={['Todos','Pendentes','Bloqueados']} value={f} onChange={setF} style={{width:340}}/></div>
      <Input placeholder="Buscar por nome, CPF, e-mail ou telefone" icon="Search"/>
      <DataTable rowKey="id" selectedKey={sel} onRowClick={r=>setSel(r.id)} columns={[
        {key:'name',label:'Cliente',render:r=><div style={{display:'flex',alignItems:'center',gap:10}}><span style={{width:32,height:32,borderRadius:'50%',background:'var(--sun-300)',display:'flex',alignItems:'center',justifyContent:'center',font:'var(--fw-bold) 12px/1 var(--font-sans)'}}>{r.name.split(' ').map(s=>s[0]).join('')}</span><span style={{fontWeight:600}}>{r.name}</span></div>},
        {key:'cpf',label:'CPF',mono:true},
        {key:'ver',label:'Verificação',render:r=><Badge size="sm" tone={VER[r.ver][0]} icon={VER[r.ver][2]}>{VER[r.ver][1]}</Badge>},
        {key:'rents',label:'Aluguéis',align:'right'},{key:'bal',label:'Créditos',align:'right'},
        {key:'st',label:'Conta',render:r=><Badge size="sm" tone={ST_TONE[r.st]}>{r.st}</Badge>}]} rows={rows}/>
    </div>
    {c && <aside style={{width:380,flexShrink:0,background:'var(--surface-card)',borderLeft:'1px solid var(--border-subtle)',overflow:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <span style={{width:48,height:48,borderRadius:'50%',background:'var(--sun-300)',display:'flex',alignItems:'center',justifyContent:'center',font:'var(--fw-bold) 16px/1 var(--font-sans)'}}>{c.name.split(' ').map(s=>s[0]).join('')}</span>
        <div style={{flex:1}}><div style={{font:'var(--type-heading)'}}>{c.name}</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>Cliente desde {c.since}</div></div>
        <IconButton icon="X" variant="soft" size={32} label="Fechar" onClick={()=>setSel(null)}/>
      </div>
      <SegmentedControl options={['Verificação','Atendimento','Histórico']} value={tab} onChange={setTab}/>
      {tab==='Verificação' && <>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><PhotoCapture height={110} label="Documento" icon="IdCard" done={c.ver!=='pending'}/><PhotoCapture height={110} label="Selfie" icon="ScanFace" done={c.ver!=='pending'}/></div>
        <div>{kv('Comparação facial',c.match)}{kv('Prova de vida',c.ver==='fail'?'Falhou':c.ver==='ok'?'Aprovada':'Aguardando')}{kv('Idade','28 anos (18+)')}{kv('Plano',c.plan)}</div>
        {c.ver==='pending' && <div style={{display:'flex',gap:8}}><Button size="sm" style={{flex:1}} icon="Check">Aprovar</Button><Button size="sm" variant="danger" style={{flex:1}} icon="X">Reprovar</Button></div>}
      </>}
      {tab==='Atendimento' && <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {TICKETS.map(([t,d,tone,s])=><div key={t} style={{display:'flex',gap:10,alignItems:'center',padding:'10px 12px',borderRadius:'var(--radius-md)',background:'var(--surface-sunken)'}}><div style={{flex:1}}><div style={{font:'var(--type-label)'}}>{t}</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>{d}</div></div><Badge size="sm" tone={tone}>{s}</Badge></div>)}
        <Button size="sm" variant="secondary" icon="MessageCircle">Abrir chat</Button>
      </div>}
      {tab==='Histórico' && <DataTable dense columns={[{key:'d',label:'Data'},{key:'m',label:'Moto',mono:true},{key:'t',label:'Tempo',align:'right'},{key:'v',label:'Valor',align:'right'}]} rows={[{id:1,d:'21/10',m:'VT-4821',t:'12 min',v:'R$ 9,98'},{id:2,d:'20/10',m:'VT-0458',t:'2 h',v:'R$ 59,80'},{id:3,d:'18/10',m:'VT-7190',t:'34 min',v:'R$ 28,36'}]}/>}
      <div style={{flex:1}}/>
      <div style={{display:'flex',flexDirection:'column',gap:8,paddingTop:8,borderTop:'1px solid var(--border-subtle)'}}>
        <Button size="sm" variant="dark" icon="Ban">Bloquear conta</Button>
        <Button size="sm" variant="ghost" icon="ShieldAlert" style={{color:'var(--danger-ink)'}}>Adicionar à lista de restrição</Button>
      </div>
    </aside>}
  </div>;
}
window.CustomersView=CustomersView;
