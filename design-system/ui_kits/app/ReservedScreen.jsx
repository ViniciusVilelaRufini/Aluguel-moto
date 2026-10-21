
function ReservedScreen({ vehicle, onCancel, onScan }) {
  const { VehicleMarker, RouteInfoPill, ReservationBanner, Button, IconButton, LocationHeader } = VDS;
  const [sec,setSec]=React.useState(600);
  React.useEffect(()=>{const t=setInterval(()=>setSec(s=>Math.max(0,s-1)),1000);return()=>clearInterval(t)},[]);
  return <div style={{position:'absolute',inset:0}}>
    <MapView>
      <Route points="200,500 200,440 250,440 250,360 205,330 160,300 130,300"/>
      <Pin x={130} y={300}><VehicleMarker level={vehicle?.level||90} selected/></Pin>
      <div style={{position:'absolute',left:130,top:236,transform:'translateX(-50%)',zIndex:7}}><RouteInfoPill minutes={5} distance="310 m"/></div>
      <UserDot x={200} y={500} heading/>
    </MapView>
    <div style={{position:'absolute',top:58,left:20,right:20,zIndex:20}}><LocationHeader initials="AL" address="Av. Paulista, 1578"/></div>
    <div style={{position:'absolute',left:20,right:20,bottom:40,zIndex:20,display:'flex',flexDirection:'column',gap:14}}>
      <IconButton icon="LocateFixed" iconColor="var(--brand)" label="Minha localização" style={{alignSelf:'flex-end'}}/>
      <ReservationBanner seconds={sec} onCancel={onCancel}/>
      <Button size="lg" fullWidth icon="ScanQrCode" onClick={onScan}>Escanear QR</Button>
    </div>
  </div>;
}
window.ReservedScreen=ReservedScreen;
