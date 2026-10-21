
const PLANS=[{id:'min',t:'Por minuto',d:'Trajetos curtos',p:'R$ 0,79',n:'/min'},{id:'hora',t:'Por hora',d:'Até 60 min corridos',p:'R$ 29,90',n:'/hora'},{id:'dia',t:'Diária',d:'24 h com a mesma moto',p:'R$ 79,90',n:'/dia'},{id:'sem',t:'Semanal',d:'Para entregadores · moto fixa',p:'R$ 299',n:'/semana'},{id:'mes',t:'Mensal',d:'Cobrança recorrente',p:'R$ 990',n:'/mês'}];
function PlanScreen({ onBack, onConfirm }) {
  const { IconButton, OptionCard, Button, Card, ListRow, Badge } = VDS;
  const [plan,setPlan]=React.useState('min');
  const [ins,setIns]=React.useState('basic');
  const insP=ins==='basic'?1.5:4.9;
  const row=(l,v,b)=><div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',font:b?'var(--type-body-strong)':'var(--type-caption)',color:b?'var(--text-primary)':'var(--text-secondary)'}}><span>{l}</span><span style={{color:'var(--text-primary)',fontWeight:600}}>{v}</span></div>;
  return <div style={{position:'absolute',inset:0,background:'var(--surface-app)',display:'flex',flexDirection:'column'}}>
    <div style={{padding:'58px 20px 12px',display:'flex',alignItems:'center',gap:12}}><IconButton icon="ArrowLeft" variant="surface" size={40} label="Voltar" onClick={onBack}/><div><div style={{font:'var(--type-heading)'}}>Escolha seu plano</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>VT-4821 · Volti Flash · 90%</div></div></div>
    <div className="vt-stagger" style={{flex:1,overflow:'auto',scrollbarWidth:'none',padding:'4px 20px 16px',display:'flex',flexDirection:'column',gap:8}}>
      {PLANS.map(p=><OptionCard key={p.id} title={p.t} description={p.d} price={p.p} priceNote={p.n} selected={plan===p.id} onClick={()=>setPlan(p.id)}/>)}
      <div style={{font:'var(--type-label)',margin:'14px 0 2px'}}>Seguro</div>
      <OptionCard icon="Shield" title="Básico" badge="Obrigatório" description="Danos a terceiros e acidentes pessoais" price="R$ 1,50" priceNote="/aluguel" selected={ins==='basic'} onClick={()=>setIns('basic')}/>
      <OptionCard icon="ShieldCheck" title="Completo" description="Básico + danos à moto, furto e franquia zero" price="R$ 4,90" priceNote="/aluguel" selected={ins==='full'} onClick={()=>setIns('full')}/>
      <Card variant="elevated" padding={4} style={{marginTop:8}}><ListRow icon="Ticket" iconTone="sun" title="Cupom ou crédito" value="R$ 12,00" trailing="chevron"/></Card>
      <Card style={{marginTop:4,padding:'10px 16px'}}>
        {row('Desbloqueio','R$ 1,00')}{row('Plano',PLANS.find(p=>p.id===plan).p+PLANS.find(p=>p.id===plan).n)}{row('Seguro','R$ '+insP.toFixed(2).replace('.',','))}{row('Caução (pré-autorização, devolvida)','R$ 150,00')}
      </Card>
    </div>
    <div style={{padding:'12px 20px 40px',background:'var(--surface-card)',boxShadow:'var(--shadow-sheet)'}}><Button size="lg" fullWidth icon="LockOpen" onClick={onConfirm}>Confirmar e destravar</Button></div>
  </div>;
}
window.PlanScreen=PlanScreen;
