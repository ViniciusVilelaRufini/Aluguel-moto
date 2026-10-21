
function SummaryScreen({ onDone }) {
  const { Button, Card, ListRow, Icon } = VDS;
  const [stars,setStars]=React.useState(0);
  const row=(l,v,b)=><div style={{display:'flex',justifyContent:'space-between',padding:'9px 0',font:b?'var(--type-heading)':'var(--type-body)',color:b?'var(--text-primary)':'var(--text-secondary)',borderTop:b?'1px solid var(--border-subtle)':0}}><span>{l}</span><span style={{color:'var(--text-primary)',fontWeight:b?700:600}}>{v}</span></div>;
  return <div className="vt-stagger" style={{position:'absolute',inset:0,background:'var(--surface-app)',display:'flex',flexDirection:'column',padding:'64px 20px 40px'}}>
    <div style={{display:'flex',alignItems:'center',gap:14}}>
      <span style={{position:'relative',width:56,height:56,borderRadius:'50%',background:'var(--brand)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--shadow-brand)',flexShrink:0,animation:'vt-check-pop 600ms var(--ease-spring) 300ms both'}}><span style={{position:'absolute',inset:0,borderRadius:'50%',background:'var(--brand)',animation:'vt-pulse-ring 1.1s var(--ease-out) 700ms 2 both'}}/><Icon name="Check" size={28} strokeWidth={3} style={{position:'relative'}}/></span>
      <div><div style={{font:'var(--type-title)',letterSpacing:'-.02em'}}>Corrida finalizada</div><div style={{font:'var(--type-body)',color:'var(--text-secondary)'}}>Moto travada. Caução liberada.</div></div>
    </div>
    <div style={{height:110,borderRadius:'var(--radius-lg)',overflow:'hidden',position:'relative',marginTop:20}}><MapView offsetY={-120}><Route points="200,420 200,360 260,330 300,250 300,150" color="var(--brand)"/></MapView></div>
    <Card style={{marginTop:12,padding:'6px 18px'}}>{row('Duração','12 min 14 s')}{row('Desbloqueio','R$ 1,00')}{row('Minutos (12 × R$ 0,79)','R$ 9,48')}{row('Seguro básico','R$ 1,50')}{row('Cupom','− R$ 2,00')}{row('Total','R$ 9,98',true)}</Card>
    <Card variant="elevated" padding={4} style={{marginTop:10}}><ListRow icon="Receipt" iconTone="brand" title="Recibo e nota fiscal" subtitle="Visa •••• 4821" trailing="chevron"/></Card>
    <div style={{textAlign:'center',marginTop:18,font:'var(--type-label)'}}>Como foi a moto e a viagem?</div>
    <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:6}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setStars(n)} style={{border:0,background:'transparent',cursor:'pointer',padding:4,color:n<=stars?'var(--sun-400)':'var(--ink-300)',transition:'color var(--dur-base)',animation:n<=stars?'vt-check-pop 380ms var(--ease-spring) '+(n-1)*50+'ms both':'none'}}><Icon name="Star" size={28} style={{fill:n<=stars?'var(--sun-400)':'none'}}/></button>)}</div>
    <div style={{flex:1}}/>
    <Button size="lg" fullWidth onClick={onDone}>Concluir</Button>
  </div>;
}
window.SummaryScreen=SummaryScreen;
