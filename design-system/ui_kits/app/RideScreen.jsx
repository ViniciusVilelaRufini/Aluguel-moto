
function RideScreen({ onEnd }) {
  const { BottomSheet, Button, BatteryPill, Dialog, Icon, Badge, Alert, IconButton, Chip } = VDS;
  const [sec,setSec]=React.useState(734);
  const [paused,setPaused]=React.useState(false);
  const [zone,setZone]=React.useState(false);
  const [fall,setFall]=React.useState(false);
  const [sos,setSos]=React.useState(false);
  const [report,setReport]=React.useState(false);
  React.useEffect(()=>{const t=setInterval(()=>!paused&&setSec(s=>s+1),1000);return()=>clearInterval(t)},[paused]);
  const mm=String(Math.floor(sec/60)).padStart(2,'0'), ss=String(sec%60).padStart(2,'0');
  const cost=(1+sec/60*0.79).toFixed(2).replace('.',',');
  const speed=paused?0:zone?20:24, limit=zone?20:32;
  const stat=(l,v)=><div style={{flex:1}}><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>{l}</div><div style={{font:'var(--type-heading)',marginTop:2}}>{v}</div></div>;
  return <div style={{position:'absolute',inset:0}}>
    <MapView offsetY={-120}>
      <Route points="200,420 200,360 260,330 300,250 300,150" color="var(--brand)"/>
      <UserDot x={200} y={420} heading/>
    </MapView>
    <div style={{position:'absolute',top:58,left:20,right:20,zIndex:20,display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',gap:10}}>
        <div style={{flex:1,padding:'12px 16px',borderRadius:'var(--radius-lg)',background:'var(--glass-bg)',backdropFilter:'var(--blur-glass)',WebkitBackdropFilter:'var(--blur-glass)',boxShadow:'var(--shadow-1)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{font:'800 34px/1 var(--font-sans)',letterSpacing:'-.03em'}}>{speed}</div>
          <div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>km/h<br/>limite {limit}</div>
          <div style={{flex:1}}/><BatteryPill level={84} range={17}/>
        </div>
        <button onClick={()=>setSos(true)} aria-label="SOS" style={{width:64,borderRadius:'var(--radius-lg)',border:0,background:'var(--danger)',color:'#fff',font:'var(--fw-black) 15px/1 var(--font-sans)',boxShadow:'var(--shadow-coral)',cursor:'pointer'}}>SOS</button>
      </div>
      {zone && <Alert tone="warning" solid icon="Gauge" title="Ciclovia · limite 20 km/h">A moto reduziu a velocidade sozinha.</Alert>}
    </div>
    <div style={{position:'absolute',right:20,bottom:330,zIndex:20,display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
      <Chip icon="Gauge" selected={zone} onClick={()=>setZone(!zone)} style={{boxShadow:'var(--shadow-1)'}}>Simular zona</Chip>
      <Chip icon="Activity" onClick={()=>setFall(true)} style={{boxShadow:'var(--shadow-1)'}}>Simular queda</Chip>
    </div>
    <BottomSheet padding="10px 20px 34px">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>{paused?'Moto travada · pausa':'Em corrida'} · Por minuto · Seguro básico</div><div style={{font:'var(--type-timer)',marginTop:4}}>{mm}:{ss}</div></div>
        <Badge tone={paused?'warning':'success'}>{paused?'R$ 0,20/min':<><span style={{width:6,height:6,borderRadius:3,background:'currentColor',animation:'vt-live 1.4s ease-in-out infinite'}}/>Ao vivo</>}</Badge>
      </div>
      <div style={{display:'flex',gap:12,margin:'16px 0 12px',padding:'14px 16px',borderRadius:'var(--radius-md)',background:'var(--surface-sunken)'}}>{stat('Tarifa',paused?'R$ 0,20/min':'R$ 0,79/min')}{stat('Custo acumulado','R$ '+cost)}{stat('Bateria','84%')}</div>
      <div style={{display:'flex',gap:8,marginBottom:14}}><Chip icon="CircleAlert" onClick={()=>setReport(true)}>Reportar problema</Chip><Chip icon="Share2">Compartilhar trajeto</Chip></div>
      <div style={{display:'flex',gap:10}}><Button size="lg" variant="secondary" icon={paused?'CirclePlay':'Pause'} style={{flex:1}} onClick={()=>setPaused(!paused)}>{paused?'Destravar':'Pausar'}</Button><Button size="lg" variant="dark" style={{flex:1.3}} onClick={onEnd}>Devolver moto</Button></div>
    </BottomSheet>
    <Dialog open={fall} onClose={()=>setFall(false)} title="Você está bem?" icon={<span style={{width:56,height:56,borderRadius:'50%',background:'var(--coral-50)',color:'var(--coral-600)',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon name="Activity" size={26}/></span>}
      actions={<><Button fullWidth onClick={()=>setFall(false)}>Estou bem</Button><Button variant="danger" fullWidth onClick={()=>{setFall(false);setSos(true)}}>Preciso de ajuda</Button></>}>
      Detectamos uma possível queda. Sem resposta em <b style={{color:'var(--text-primary)'}}>30 s</b>, acionamos o suporte.
    </Dialog>
    <Dialog open={sos} onClose={()=>setSos(false)} title="SOS" icon={<span style={{width:56,height:56,borderRadius:'50%',background:'var(--danger)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon name="PhoneCall" size={26}/></span>}
      actions={<><Button variant="danger" fullWidth icon="PhoneCall" onClick={()=>setSos(false)}>Ligar para o suporte</Button><Button variant="secondary" fullWidth icon="Share2" onClick={()=>setSos(false)}>Enviar localização a um contato</Button><Button variant="ghost" fullWidth onClick={()=>setSos(false)}>Cancelar</Button></>}>
      Sua localização em tempo real é compartilhada enquanto o SOS estiver ativo.
    </Dialog>
    <Dialog open={report} onClose={()=>setReport(false)} title="Qual o problema?" actions={<><Button fullWidth onClick={()=>setReport(false)}>Trocar de moto sem nova taxa</Button><Button variant="ghost" fullWidth onClick={()=>setReport(false)}>Cancelar</Button></>}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>{['Pneu','Freio','Bateria','Luzes','Outro'].map((p,i)=><Chip key={p} selected={i===1}>{p}</Chip>)}</div>
    </Dialog>
  </div>;
}
window.RideScreen=RideScreen;
