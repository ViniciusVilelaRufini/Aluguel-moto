
function ZonesView(){
  const { Card, Switch, Badge, Button, ListRow } = VDS;
  const Z=[['Área de operação','var(--ink-900)','dashed',-.42,-.4,.84,.8],['Ponto · Pç. Oswaldo Cruz','var(--brand)','solid',-.08,-.08,.12,.1],['Ponto · Av. Paulista','var(--brand)','solid',.16,-.3,.1,.1],['Zona proibida · Parque','var(--coral-500)','solid',-.34,.12,.18,.16],['Velocidade reduzida · Escola','var(--orange-500)','solid',.12,.14,.16,.12]];
  return <div style={{flex:1,display:'flex',minWidth:0}}>
    <div style={{flex:1,position:'relative'}}><AdminMap>{sz=>Z.map(([n,c,b,x,y,w,h])=><div key={n} title={n} style={{position:'absolute',left:sz.w/2+x*sz.w,top:sz.h/2+y*sz.h,width:w*sz.w,height:h*sz.h,border:'2.5px '+b+' '+c,borderRadius:18,background:b==='dashed'?'transparent':'color-mix(in oklch, '+c+' 18%, transparent)'}}/>)}</AdminMap>
      <div style={{position:'absolute',top:16,left:16,display:'flex',gap:8}}><Button size="sm" variant="dark" icon="PenTool">Desenhar área</Button><Button size="sm" variant="secondary" icon="Layers" style={{background:'#fff'}}>Camadas</Button></div>
    </div>
    <aside style={{width:360,flexShrink:0,background:'var(--surface-card)',borderLeft:'1px solid var(--border-subtle)',overflow:'auto',padding:20,display:'flex',flexDirection:'column',gap:14}}>
      <div style={{font:'var(--type-heading)'}}>Cercas e regras</div>
      <Card variant="sunken" padding={4}>{Z.map(([n,c])=><div key={n} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px'}}><span style={{width:12,height:12,borderRadius:4,background:c}}/><span style={{flex:1,font:'var(--type-label)',fontWeight:500}}>{n}</span><VDS.Icon name="ChevronRight" size={16} color="var(--text-tertiary)"/></div>)}</Card>
      <div style={{font:'var(--type-label)',marginTop:6}}>Regras automáticas</div>
      {[['Saiu da área','Alerta → após 5 min reduz e bloqueia',true],['Entrou em calçada/ciclovia','Limite 20 km/h',true],['Zona proibida','Não permite encerrar aluguel',true],['Fora do ponto de devolução','Taxa de R$ 15,00',false]].map(([t,d,on])=><div key={t} style={{display:'flex',gap:12,alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--ink-100)'}}><div style={{flex:1}}><div style={{font:'var(--type-label)'}}>{t}</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>{d}</div></div><Switch defaultChecked={on}/></div>)}
    </aside>
  </div>;
}
window.ZonesView=ZonesView;
