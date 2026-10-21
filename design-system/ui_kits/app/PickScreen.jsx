
const PICK=[
 {id:1,code:'VT-0458',model:'Volti Flash',cat:'Urbana',level:91,range:20,walk:'120 m · 2 min',price:'R$ 0,79/min',promo:true},
 {id:2,code:'VT-4821',model:'Volti Flash',cat:'Urbana',level:84,range:18,walk:'310 m · 5 min',price:'R$ 0,79/min'},
 {id:3,code:'VT-7190',model:'Volti Cargo',cat:'Com baú · entregas',level:88,range:19,walk:'450 m · 6 min',price:'R$ 0,99/min'},
 {id:4,code:'VT-0912',model:'Volti Urban',cat:'Assento duplo',level:66,range:13,walk:'600 m · 8 min',price:'R$ 0,89/min'},
 {id:5,code:'VT-6104',model:'Volti Urban',cat:'Assento duplo',level:35,range:7,walk:'800 m · 10 min',price:'R$ 0,89/min'},
];
function PickScreen({ onBack, onReserve, onMap }) {
  const { IconButton, Chip, BatteryPill, Badge, Button, SegmentedControl, Icon } = VDS;
  const [model,setModel]=React.useState('Todas');
  const [sel,setSel]=React.useState(1);
  const list=PICK.filter(p=>model==='Todas'||p.model===model);
  const v=PICK.find(p=>p.id===sel);
  return <div style={{position:'absolute',inset:0,background:'var(--surface-app)',display:'flex',flexDirection:'column'}}>
    <div style={{padding:'58px 20px 0',display:'flex',alignItems:'center',gap:12}}>
      <IconButton icon="ArrowLeft" label="Voltar" onClick={onBack}/>
      <div style={{flex:1}}><div style={{font:'var(--type-heading)'}}>Escolha sua moto</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>{list.length} disponíveis perto de você</div></div>
      <IconButton icon="Map" label="Ver no mapa" onClick={onMap}/>
    </div>
    <div style={{display:'flex',gap:8,padding:'14px 20px 6px',overflowX:'auto',scrollbarWidth:'none',flexShrink:0}}>
      {['Todas','Volti Flash','Volti Urban','Volti Cargo'].map(m=><Chip key={m} selected={model===m} onClick={()=>setModel(m)}>{m}</Chip>)}
    </div>
    <div className="vt-stagger" style={{flex:1,overflow:'auto',scrollbarWidth:'none',padding:'8px 20px 16px',display:'flex',flexDirection:'column',gap:10}}>
      {list.map(p=>{const on=p.id===sel;return <div key={p.id} role="radio" aria-checked={on} onClick={()=>setSel(p.id)} style={{display:'flex',gap:14,padding:10,borderRadius:'var(--radius-lg)',background:on?'var(--brand-soft)':'var(--surface-card)',border:'1.5px solid '+(on?'var(--brand)':'transparent'),boxShadow:on?'none':'var(--shadow-1)',cursor:'pointer',transform:on?'scale(1.01)':'none',transition:'all var(--dur-spring) var(--ease-spring)'}}>
        <div style={{width:96,height:96,borderRadius:16,background:'var(--surface-media)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',font:'var(--type-caption)',color:'var(--blue-600)',textAlign:'center'}}><span>foto<br/>{p.model.split(' ')[1]}</span></div>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:6,justifyContent:'center'}}>
          <div style={{display:'flex',alignItems:'baseline',gap:8}}><span style={{font:'var(--type-body-strong)'}}>{p.model}</span><span style={{font:'var(--fw-medium) 11px/1 var(--font-mono)',color:'var(--text-secondary)'}}>{p.code}</span></div>
          <div style={{font:'var(--fw-semibold) 12px/1 var(--font-sans)',color:'var(--warning)'}}>{p.cat}</div>
          <div><BatteryPill level={p.level} range={p.range}/></div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}><Badge size="sm" tone="neutral" icon="Footprints">{p.walk}</Badge><Badge size="sm" tone="info">{p.price}</Badge>{p.promo&&<Badge size="sm">1ª grátis</Badge>}</div>
        </div>
        <span style={{width:22,height:22,borderRadius:'50%',flexShrink:0,alignSelf:'center',border:'1.5px solid '+(on?'var(--brand)':'var(--border-strong)'),background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>{on&&<span style={{width:12,height:12,borderRadius:'50%',background:'var(--brand)',animation:'vt-check-pop 320ms var(--ease-spring) both'}}/>}</span>
      </div>})}
    </div>
    <div style={{padding:'14px 20px 40px',background:'var(--surface-card)',boxShadow:'var(--shadow-sheet)',display:'flex',flexDirection:'column',gap:10}}>
      {v&&<div style={{display:'flex',alignItems:'center',gap:8,font:'var(--type-caption)',color:'var(--text-secondary)'}}><Icon name="Clock" size={14}/>A moto fica reservada por 10 min, sem custo.</div>}
      <Button size="lg" fullWidth icon="Bookmark" disabled={!v} onClick={()=>onReserve(v)}>{v?'Reservar '+v.model+' · '+v.code:'Selecione uma moto'}</Button>
    </div>
  </div>;
}
window.PickScreen=PickScreen;
