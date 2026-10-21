
const AUDIT=[['09:42','Carla (operação)','Limitou a 20 km/h','Zona escolar'],['09:15','Sistema','Bloqueio gradual','Saiu da área há 5 min'],['08:58','Rafael (campo)','Modo serviço','Troca de bateria']];
function FleetView() {
  const { FleetStatus, Button, IconButton, BatteryPill, Card, Badge, Icon, Toast } = VDS;
  const [filter,setFilter]=React.useState(null);
  const [sel,setSel]=React.useState('VT-4821');
  const [toast,setToast]=React.useState(null);
  const counts=FLEET.reduce((a,v)=>(a[v.st]=(a[v.st]||0)+1,a),{});
  const v=FLEET.find(x=>x.id===sel);
  const cmd=(t)=>{setToast(t);setTimeout(()=>setToast(null),2400)};
  const kv=(k,val,mono)=><div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--ink-100)',font:'var(--type-label)',fontWeight:500}}><span style={{color:'var(--text-secondary)'}}>{k}</span><span style={{fontFamily:mono?'var(--font-mono)':undefined}}>{val}</span></div>;
  return <div style={{flex:1,display:'flex',minWidth:0}}>
    <div style={{flex:1,position:'relative',minWidth:0}}>
      <AdminMap>{sz=>FLEET.filter(f=>!filter||f.st===filter).map(f=><div key={f.id} style={{position:'absolute',left:sz.w/2+f.x*sz.w,top:sz.h/2+f.y*sz.h,transform:'translate(-50%,-50%)'}}><FleetPin v={f} selected={f.id===sel} onClick={()=>setSel(f.id)}/></div>)}</AdminMap>
      <div style={{position:'absolute',top:16,left:16,right:16,display:'flex',gap:6,flexWrap:'wrap'}}>
        <FleetStatus status="free" count={counts.free} selected={filter==='free'} onClick={()=>setFilter(filter==='free'?null:'free')} style={{boxShadow:'var(--shadow-1)'}}/>
        {['rented','reserved','paused','blocked','maintenance','offline'].map(s=><FleetStatus key={s} status={s} count={counts[s]||0} selected={filter===s} onClick={()=>setFilter(filter===s?null:s)} style={{boxShadow:'var(--shadow-1)'}}/>)}
      </div>
      {toast && <Toast style={{position:'absolute',left:'50%',bottom:24,transform:'translateX(-50%)',minWidth:320}}>{toast}</Toast>}
    </div>
    {v && <aside style={{width:360,flexShrink:0,background:'var(--surface-card)',borderLeft:'1px solid var(--border-subtle)',overflow:'auto',padding:20,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{flex:1}}><div style={{font:'var(--fw-bold) 22px/1.1 var(--font-mono)'}}>{v.id}</div><div style={{marginTop:6}}><FleetStatus status={v.st} variant="dot"/></div></div>
        <IconButton icon="X" variant="soft" size={32} label="Fechar" onClick={()=>setSel(null)}/>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}><BatteryPill level={v.bat} range={Math.round(v.bat/4.5)}/><Badge tone="neutral" icon="Gauge">{v.spd} km/h</Badge></div>
      <div>{kv('Último sinal',v.last)}{kv('GPS / 4G',v.sig)}{kv('Cliente',v.user||'—')}{kv('Posição','-23.5874, -46.6575',true)}{kv('Km desde revisão','412 km')}</div>
      <div><div style={{font:'var(--type-label)',marginBottom:8}}>Comandos remotos</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <Button size="sm" variant="danger" icon="Lock" onClick={()=>cmd('Bloqueio enviado · reduz potência e trava abaixo de 3 km/h')}>Bloquear</Button>
          <Button size="sm" variant="secondary" icon="LockOpen" onClick={()=>cmd('Desbloqueio enviado')}>Desbloquear</Button>
          <Button size="sm" variant="secondary" icon="Megaphone" style={{color:'var(--text-primary)',borderColor:'var(--border-strong)'}} onClick={()=>cmd('Buzina acionada')}>Buzina</Button>
          <Button size="sm" variant="secondary" icon="Gauge" style={{color:'var(--text-primary)',borderColor:'var(--border-strong)'}} onClick={()=>cmd('Limite de 20 km/h aplicado')}>Limitar vel.</Button>
        </div>
        <Button size="sm" variant="dark" icon="ShieldAlert" fullWidth style={{marginTop:8}} onClick={()=>cmd('Modo roubada: bloqueio + posição a cada 5 s')}>Modo roubada</Button>
        <div style={{font:'var(--type-caption)',color:'var(--text-secondary)',marginTop:8}}>Sem sinal, o comando fica pendente e é aplicado ao reconectar.</div>
      </div>
      <div style={{display:'flex',gap:8}}><Button size="sm" variant="ghost" icon="Play" style={{paddingLeft:0}}>Replay de trajeto</Button><Button size="sm" variant="ghost" icon="History">Histórico</Button></div>
      <div><div style={{font:'var(--type-label)',marginBottom:6}}>Log de auditoria</div>
        {AUDIT.map(([t,who,what,why])=><div key={t} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid var(--ink-100)'}}><span style={{font:'var(--fw-medium) 12px/1.4 var(--font-mono)',color:'var(--text-secondary)'}}>{t}</span><div><div style={{font:'var(--type-label)'}}>{what}</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>{who} · {why}</div></div></div>)}
      </div>
    </aside>}
  </div>;
}
window.FleetView=FleetView;
