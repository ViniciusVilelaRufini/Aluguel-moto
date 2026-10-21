
const CHECKS=['Freio dianteiro e traseiro','Pneus','Luzes','Campainha','Limitador de velocidade'];
function TaskDetail({ task, onBack, onDone }) {
  const { IconButton, Button, Checkbox, PhotoCapture, Input, Card, Badge, BatteryPill, FleetStatus, Toast, Alert } = VDS;
  const [unlocked,setUnlocked]=React.useState(false);
  const [checks,setChecks]=React.useState([]);
  const [photo,setPhoto]=React.useState(false);
  const isBat=task.type==='battery';
  const ok=unlocked&&checks.length===CHECKS.length&&photo;
  const toggle=c=>setChecks(checks.includes(c)?checks.filter(x=>x!==c):[...checks,c]);
  return <div style={{position:'absolute',inset:0,background:'var(--surface-app)',display:'flex',flexDirection:'column'}}>
    <div style={{height:230,position:'relative',flexShrink:0}}>
      <MapView offsetY={-200}><Pin x={200} y={470}><VDS.VehicleMarker level={task.bat} selected/></Pin><UserDot x={150} y={560} heading/></MapView>
      <IconButton icon="ArrowLeft" label="Voltar" onClick={onBack} style={{position:'absolute',top:56,left:20,zIndex:5}}/>
    </div>
    <div style={{flex:1,overflow:'auto',scrollbarWidth:'none',marginTop:-24,position:'relative',zIndex:3,background:'var(--surface-app)',borderRadius:'28px 28px 0 0',padding:'20px 20px 16px',display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{flex:1}}><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>{task.t}</div><div style={{font:'var(--type-title)',fontFamily:'var(--font-mono)',letterSpacing:0}}>{task.moto}</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)',marginTop:2}}>{task.addr}</div></div>
        <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}><BatteryPill level={task.bat} range={Math.round(task.bat/4.5)}/><FleetStatus status={unlocked?'maintenance':'free'} variant="dot"/></div>
      </div>
      {!unlocked ? <Button size="lg" fullWidth variant="dark" icon="Wrench" onClick={()=>setUnlocked(true)}>Destravar em modo serviço</Button>
        : <Alert tone="success" icon="LockOpen" title="Modo serviço ativo">Sem cobrança. A moto some do mapa dos clientes.</Alert>}
      {isBat && <Card padding={14} style={{display:'flex',flexDirection:'column',gap:10}}>
        <div style={{font:'var(--type-label)'}}>Troca de bateria</div>
        <Input label="Nº de série da bateria nova" placeholder="BT-000000" icon="ScanBarcode" defaultValue="BT-208431"/>
        <div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>Retirada: BT-190577 · 12% · 412 ciclos</div>
      </Card>}
      <Card padding={14} style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{font:'var(--type-label)'}}>Checklist de inspeção</span><span style={{font:'var(--fw-bold) 13px/1 var(--font-mono)',color:'var(--text-secondary)'}}>{checks.length}/{CHECKS.length}</span></div>
        {CHECKS.map(c=><Checkbox key={c} checked={checks.includes(c)} onChange={()=>toggle(c)} label={c}/>)}
      </Card>
      <PhotoCapture label="Foto da moto após o serviço" hint="Obrigatória" height={110} done={photo} onClick={()=>setPhoto(true)}/>
    </div>
    <div style={{padding:'12px 20px 40px',background:'var(--surface-card)',boxShadow:'var(--shadow-sheet)',position:'relative',zIndex:4}}><Button size="lg" fullWidth disabled={!ok} icon="ClipboardCheck" onClick={()=>onDone(task)}>Concluir tarefa</Button></div>
  </div>;
}
window.TaskDetail=TaskDetail;
