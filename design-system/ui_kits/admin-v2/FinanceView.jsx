
function FinanceView(){
  const { StatTile, DataTable, SegmentedControl, Badge, Card } = VDS;
  const [p,setP]=React.useState('7 dias');
  const days=[['Qua',4.1],['Qui',4.6],['Sex',5.8],['Sáb',7.2],['Dom',6.4],['Seg',4.9],['Ter',5.3]];
  return <div style={{flex:1,overflow:'auto',padding:28,display:'flex',flexDirection:'column',gap:18}}>
    <div style={{display:'flex',alignItems:'center',gap:16}}><div style={{flex:1}}><div style={{font:'var(--type-title)',letterSpacing:'-.02em'}}>Financeiro</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>Receita, planos, inadimplência e cauções</div></div><SegmentedControl options={['Hoje','7 dias','30 dias']} value={p} onChange={setP} style={{width:300}}/></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12}}>
      <StatTile icon="Wallet" label="Receita" value="R$ 38,3 mil" delta="+12% vs. período anterior"/>
      <StatTile icon="Gauge" label="Taxa de ocupação" value="68%" delta="+4,2 p.p."/>
      <StatTile icon="Bike" label="Receita/moto/dia" value="R$ 74,10" delta="+R$ 3,20"/>
      <StatTile icon="CircleAlert" label="Inadimplência" value="2,1%" delta="+0,3 p.p." trend="down"/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.4fr) minmax(0,1fr)',gap:12}}>
      <Card padding={20}><div style={{font:'var(--type-label)',marginBottom:16}}>Receita diária (R$ mil)</div>
        <div style={{display:'flex',alignItems:'flex-end',gap:14,height:180}}>{days.map(([d,v],i)=><div key={d} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6,height:'100%',justifyContent:'flex-end'}}><span style={{font:'var(--fw-semibold) 11px/1 var(--font-mono)',color:'var(--text-secondary)'}}>{v.toFixed(1).replace('.',',')}</span><div style={{width:'100%',height:(v/7.2*140)+'px',borderRadius:8,background:i===3?'var(--brand)':'var(--green-200)'}}/><span style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>{d}</span></div>)}</div>
      </Card>
      <DataTable dense columns={[{key:'p',label:'Plano'},{key:'n',label:'Aluguéis',align:'right'},{key:'r',label:'Receita',align:'right'}]} rows={[{id:1,p:'Por minuto',n:'2.184',r:'R$ 18,9 mil'},{id:2,p:'Por hora',n:'312',r:'R$ 5,6 mil'},{id:3,p:'Diária',n:'64',r:'R$ 3,1 mil'},{id:4,p:'Semanal (entregador)',n:'28',r:'R$ 8,4 mil'},{id:5,p:'Mensal',n:'3',r:'R$ 2,3 mil'}]}/>
    </div>
    <DataTable columns={[{key:'k',label:'Cauções e repasses'},{key:'v',label:'Valor',align:'right'},{key:'s',label:'Status',render:r=><Badge size="sm" tone={r.t}>{r.s}</Badge>}]} rows={[{id:1,k:'Cauções retidas (pré-autorização)',v:'R$ 6.300',s:'Em aberto',t:'warning'},{id:2,k:'Repasse à seguradora · outubro',v:'R$ 4.212',s:'Agendado',t:'info'},{id:3,k:'Estornos via Pix',v:'R$ 389',s:'Pago',t:'success'}]}/>
  </div>;
}
window.FinanceView=FinanceView;
