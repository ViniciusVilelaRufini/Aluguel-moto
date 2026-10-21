
const VEHICLES=[{id:1,x:100,y:300,level:90,range:20,name:'Volti Flash'},{id:2,x:290,y:240,level:62,range:13,name:'Volti Urban'},{id:3,x:330,y:470,level:35,range:7,name:'Volti Flash'},{id:4,x:170,y:520,level:88,range:19,name:'Volti Cargo'},{id:5,x:80,y:600,level:15,range:2,name:'Volti Urban'},{id:6,x:270,y:640,level:74,range:15,name:'Volti Flash'}];
function TopOverlay({ onPass, onAvatar }) {
  const { LocationHeader, PassCard, Chip } = VDS;
  const [f,setF]=React.useState('all');
  return <div style={{position:'absolute',top:0,left:0,right:0,zIndex:20,paddingTop:58}}>
    <div style={{padding:'0 20px'}}><LocationHeader initials="AL" address="Av. Paulista, 1578" onAvatar={onAvatar}/></div>
    <div style={{display:'flex',gap:10,overflowX:'auto',padding:'14px 20px 8px',scrollbarWidth:'none'}}>
      <PassCard title="Desbloqueie seu passe" subtitle="Ande mais, pague menos" tone="sun" onClick={onPass}/>
      <PassCard title="1ª corrida grátis" subtitle="Até 15 minutos" icon="Gift" tone="coral"/>
      <PassCard title="Indique e ganhe" subtitle="R$ 10 por amigo" icon="Users" tone="sky"/>
    </div>
    <div style={{display:'flex',gap:8,padding:'2px 20px',overflowX:'auto',scrollbarWidth:'none'}}>
      {[['all','Todas','Bike'],['r10','Autonomia 10+ km','Zap'],['pick','Pontos de retirada','MapPinned'],['swap','Troca de bateria','BatteryCharging']].map(([k,l,i])=><Chip key={k} icon={i} selected={f===k} onClick={()=>setF(k)} style={{boxShadow:'var(--shadow-1)',border:f===k?undefined:'1px solid transparent'}}>{l}</Chip>)}
    </div>
  </div>;
}
function VehicleSheet({ v, onClose, onReserve, onScan }) {
  const { BottomSheet, VehicleSummary, Chip, Card, ListRow, Button, IconButton } = VDS;
  return <BottomSheet open={!!v} padding="10px 20px 30px">
    {v && <>
      <IconButton icon="X" variant="soft" size={32} label="Fechar" onClick={onClose} style={{position:'absolute',top:16,right:16}}/>
      <VehicleSummary name={v.name} level={v.level} range={v.range} onView3d={()=>{}}/>
      <div style={{display:'flex',gap:8,margin:'18px 0 12px',overflowX:'auto'}}><Chip icon="Megaphone">Buzinar e piscar</Chip><Chip icon="Navigation">Navegar</Chip><Chip icon="CircleAlert">Reportar problema</Chip></div>
      <Card variant="sunken" padding={6} style={{marginBottom:16}}><ListRow icon="Ticket" iconTone="sun" title="Cupom promocional" onClick={()=>{}}/></Card>
      <div style={{display:'flex',gap:10}}><Button size="lg" icon="ScanQrCode" style={{flex:1}} onClick={onScan}>Escanear QR</Button><Button size="lg" variant="secondary" icon="Bookmark" style={{flex:1}} onClick={onReserve}>Reservar</Button></div>
    </>}
  </BottomSheet>;
}
function HomeScreen({ onReserve, onScan, onAccount, onList, toast, initialSel=null }) {
  const { VehicleMarker, Button, IconButton, Toast } = VDS;
  const [sel,setSel]=React.useState(initialSel);
  const v=VEHICLES.find(x=>x.id===sel);
  return <div style={{position:'absolute',inset:0}}>
    <MapView>
      {VEHICLES.map(x=><Pin key={x.id} x={x.x} y={x.y}><VehicleMarker level={x.level} selected={x.id===sel} onClick={()=>setSel(x.id)}/></Pin>)}
      <UserDot x={200} y={430}/>
    </MapView>
    <TopOverlay onAvatar={onAccount}/>
    {!v && <div style={{position:'absolute',left:20,right:20,bottom:40,zIndex:20,display:'flex',flexDirection:'column',gap:16,alignItems:'flex-end'}}>
      {toast && <Toast style={{width:'100%',boxSizing:'border-box'}}>{toast}</Toast>}
      <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}><VDS.Chip icon="List" onClick={onList} style={{height:44,padding:'0 16px',boxShadow:'var(--shadow-1)',border:'1px solid transparent'}}>Escolher moto</VDS.Chip><IconButton icon="LocateFixed" iconColor="var(--brand)" label="Minha localização"/></div>
      <Button size="lg" fullWidth icon="ScanQrCode" onClick={onScan}>Escanear para andar</Button>
    </div>}
    <VehicleSheet v={v} onClose={()=>setSel(null)} onReserve={()=>onReserve(v)} onScan={onScan}/>
  </div>;
}
Object.assign(window,{HomeScreen,TopOverlay,VEHICLES});
