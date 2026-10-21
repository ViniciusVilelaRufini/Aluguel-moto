
const SCREENS=[['onboarding','Cadastro'],['home','Mapa'],['pick','Escolher moto'],['reserved','Reserva'],['scan','QR'],['plan','Plano e seguro'],['ride','Corrida'],['return','Devolução'],['summary','Recibo'],['account','Conta']];
function ClientApp() {
  const [s,setS]=React.useState(()=>localStorage.getItem('volti-kit-screen')||'home');
  const [veh,setVeh]=React.useState(VEHICLES[0]);
  const [toast,setToast]=React.useState(null);
  const go=(x,t)=>{setS(x);localStorage.setItem('volti-kit-screen',x);if(t){setToast(t);setTimeout(()=>setToast(null),2800)}};
  let screen;
  if(s==='onboarding') screen=<Onboarding onDone={()=>go('home','Cadastro enviado. Verificação em até 2 min.')}/>;
  else if(s==='home') screen=<HomeScreen toast={toast} onAccount={()=>go('account')} onList={()=>go('pick')} onReserve={v=>{setVeh(v);go('reserved')}} onScan={()=>go('scan')}/>;
  else if(s==='pick') screen=<PickScreen onBack={()=>go('home')} onMap={()=>go('home')} onReserve={v=>{setVeh(v);go('reserved')}}/>;
  else if(s==='reserved') screen=<ReservedScreen vehicle={veh} onCancel={()=>go('home','Reserva cancelada')} onScan={()=>go('scan')}/>;
  else if(s==='scan') screen=<ScanScreen onBack={()=>go('home')} onUnlocked={()=>go('plan')}/>;
  else if(s==='plan') screen=<PlanScreen onBack={()=>go('scan')} onConfirm={()=>go('ride')}/>;
  else if(s==='ride') screen=<RideScreen onEnd={()=>go('return')}/>;
  else if(s==='return') screen=<ReturnScreen onBack={()=>go('ride')} onDone={()=>go('summary')}/>;
  else if(s==='account') screen=<AccountScreen onBack={()=>go('home')}/>;
  else screen=<SummaryScreen onDone={()=>go('home','Obrigado por andar de Volti')}/>;
  return <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,padding:'24px 0'}}>
    <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',maxWidth:560}}>{SCREENS.map(([k,l])=><VDS.Chip key={k} selected={k===s} onClick={()=>go(k)}>{l}</VDS.Chip>)}</div>
    <IOSDevice><div data-screen-label={s} style={{position:'relative',height:'100%',overflow:'hidden',fontFamily:'var(--font-sans)',color:'var(--text-primary)'}}>{screen}</div></IOSDevice>
  </div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<ClientApp/>);
