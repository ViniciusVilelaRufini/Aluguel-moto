
function PricingView(){
  const { DataTable, Badge, Button, Input, Switch, Card, Toast } = VDS;
  const [saved,setSaved]=React.useState(false);
  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),2400)};
  const field=(v,w=110)=><input defaultValue={v} style={{width:w,height:34,padding:'0 10px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-subtle)',background:'var(--ink-50)',font:'var(--fw-medium) 13px/1 var(--font-mono)',textAlign:'right',color:'var(--text-primary)'}}/>;
  const sec=(t,d,c)=><div style={{display:'flex',flexDirection:'column',gap:10}}><div><div style={{font:'var(--type-heading)'}}>{t}</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>{d}</div></div>{c}</div>;
  return <div style={{flex:1,overflow:'auto',padding:28,display:'flex',flexDirection:'column',gap:26,position:'relative'}}>
    <div style={{display:'flex',alignItems:'center',gap:16}}><div style={{flex:1}}><div style={{font:'var(--type-title)',letterSpacing:'-.02em'}}>Preços e planos</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>Alterações valem para novos aluguéis</div></div><Button size="sm" variant="ghost">Descartar</Button><Button size="sm" icon="Check" onClick={save}>Salvar alterações</Button></div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(0,1fr)',gap:24,alignItems:'start'}}>
      {sec('Planos','Preço por período',<DataTable columns={[{key:'p',label:'Plano'},{key:'v',label:'Preço',align:'right',render:r=>field(r.v)},{key:'u',label:'Unidade'},{key:'on',label:'Ativo',align:'right',render:r=><Switch defaultChecked={r.on}/>}]} rows={[{id:1,p:'Por minuto',v:'0,79',u:'/min',on:true},{id:2,p:'Por hora',v:'29,90',u:'/hora',on:true},{id:3,p:'Diária',v:'79,90',u:'/dia',on:true},{id:4,p:'Semanal (entregador)',v:'299,00',u:'/semana',on:true},{id:5,p:'Mensal',v:'990,00',u:'/mês',on:false}]}/>)}
      {sec('Taxas','Cobranças fixas',<Card padding={6}>{[['Desbloqueio','1,00'],['Pausa','0,20 /min'],['Reserva (após 10 min)','0,30 /min'],['Devolução fora do ponto','15,00'],['Caução (pré-autorização)','150,00']].map(([k,v])=><div key={k} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderBottom:'1px solid var(--ink-100)'}}><span style={{flex:1,font:'var(--type-label)',fontWeight:500}}>{k}</span>{field(v,120)}</div>)}</Card>)}
      {sec('Seguros','Repasse à seguradora',<DataTable columns={[{key:'s',label:'Seguro'},{key:'c',label:'Cobertura'},{key:'v',label:'Preço',align:'right',render:r=>field(r.v,90)},{key:'o',label:'',render:r=>r.o?<Badge size="sm" tone="neutral">Obrigatório</Badge>:null}]} rows={[{id:1,s:'Básico',c:'Terceiros + acidentes pessoais',v:'1,50',o:true},{id:2,s:'Completo',c:'+ danos à moto, furto, franquia zero',v:'4,90'}]}/>)}
      {sec('Cupons e indicação','Campanhas ativas',<DataTable columns={[{key:'c',label:'Código',mono:true},{key:'d',label:'Desconto'},{key:'u',label:'Usos',align:'right'},{key:'on',label:'Ativo',align:'right',render:r=><Switch defaultChecked={r.on}/>}]} rows={[{id:1,c:'PRIMEIRA',d:'15 min grátis',u:'1.204',on:true},{id:2,c:'INDICA10',d:'R$ 10 cada',u:'388',on:true},{id:3,c:'PASSE10',d:'10% no semanal',u:'52',on:false}]}/>)}
    </div>
    {saved && <Toast style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',minWidth:300}}>Preços salvos · log de auditoria atualizado</Toast>}
  </div>;
}
window.PricingView=PricingView;
