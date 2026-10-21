
const SCREENS=[['onboarding','Cadastro'],['home','Mapa'],['pick','Escolher moto'],['reserved','Reserva'],['scan','QR'],['plan','Plano e seguro'],['ride','Corrida'],['return','Devolução'],['summary','Recibo'],['account','Conta']];
const ORDER=SCREENS.map(x=>x[0]);
const T_IN={fwd:['vt-screen-in-right',2],back:['vt-screen-in-left',1],up:['vt-screen-in-up',2],down:['vt-screen-emerge',1]};
const T_OUT={fwd:['vt-screen-out-left',1],back:['vt-screen-out-right',2],up:['vt-screen-recede',1],down:['vt-screen-out-down',2]};
function ClientApp() {
  const [nav,setNav]=React.useState(()=>({cur:localStorage.getItem('volti-kit-screen')||'home',prev:null,dir:'fwd',n:0}));
  const [veh,setVeh]=React.useState(VEHICLES[0]);
  const [toast,setToast]=React.useState(null);
  const navRef=React.useRef(nav); navRef.current=nav;
  const go=(x,t)=>{
    const c=navRef.current; if(x===c.cur) return;
    const dir=x==='scan'?'up':(c.cur==='scan'&&x!=='plan')?'down':ORDER.indexOf(x)>ORDER.indexOf(c.cur)?'fwd':'back';
    const n=c.n+1;
    setNav({cur:x,prev:c.cur,dir,n}); localStorage.setItem('volti-kit-screen',x);
    setTimeout(()=>setNav(p=>p.n===n?{...p,prev:null}:p),480);
    if(t){setToast(t);setTimeout(()=>setToast(null),2800)}
  };
  const render=s=>{
    if(s==='onboarding') return <Onboarding onDone={()=>go('home','Cadastro enviado. Verificação em até 2 min.')}/>;
    if(s==='home') return <HomeScreen toast={toast} onAccount={()=>go('account')} onList={()=>go('pick')} onReserve={v=>{setVeh(v);go('reserved')}} onScan={()=>go('scan')}/>;
    if(s==='pick') return <PickScreen onBack={()=>go('home')} onMap={()=>go('home')} onReserve={v=>{setVeh(v);go('reserved')}}/>;
    if(s==='reserved') return <ReservedScreen vehicle={veh} onCancel={()=>go('home','Reserva cancelada')} onScan={()=>go('scan')}/>;
    if(s==='scan') return <ScanScreen onBack={()=>go('home')} onUnlocked={()=>go('plan')}/>;
    if(s==='plan') return <PlanScreen onBack={()=>go('scan')} onConfirm={()=>go('ride')}/>;
    if(s==='ride') return <RideScreen onEnd={()=>go('return')}/>;
    if(s==='return') return <ReturnScreen onBack={()=>go('ride')} onDone={()=>go('summary')}/>;
    if(s==='account') return <AccountScreen onBack={()=>go('home')}/>;
    return <SummaryScreen onDone={()=>go('home','Obrigado por andar de Volti')}/>;
  };
  const layer=(s,key,anim,z,out)=><div key={key} style={{position:'absolute',inset:0,overflow:'hidden',background:'var(--surface-app)',zIndex:z,pointerEvents:out?'none':undefined,
    animation:anim?anim+' var(--dur-screen) var(--ease-screen) both':'none',boxShadow:anim&&z===2?'0 0 48px rgba(21,24,26,.22)':'none'}}>{render(s)}</div>;
  const animate=nav.n>0;
  const [inA,inZ]=T_IN[nav.dir], [outA,outZ]=T_OUT[nav.dir];
  return <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,padding:'24px 0'}}>
    <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',maxWidth:560}}>{SCREENS.map(([k,l])=><VDS.Chip key={k} selected={k===nav.cur} onClick={()=>go(k)}>{l}</VDS.Chip>)}</div>
    <IOSDevice><div data-screen-label={nav.cur} style={{position:'relative',height:'100%',overflow:'hidden',fontFamily:'var(--font-sans)',color:'var(--text-primary)',background:'#000'}}>
      {nav.prev && layer(nav.prev,nav.prev+'-'+(nav.n-1),outA,outZ,true)}
      {layer(nav.cur,nav.cur+'-'+nav.n,animate?inA:null,animate?inZ:1,false)}
    </div></IOSDevice>
  </div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<ClientApp/>);
