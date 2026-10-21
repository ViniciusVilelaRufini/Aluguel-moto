
function ReturnScreen({ onBack, onDone }) {
  const { BottomSheet, Button, PhotoCapture, Alert, IconButton, ProgressSteps, Icon } = VDS;
  const [photo,setPhoto]=React.useState(false);
  const [confirming,setConfirming]=React.useState(false);
  const finish=()=>{setConfirming(true);setTimeout(onDone,1800)};
  const zone=(x,y,w,h)=><div style={{position:'absolute',left:x,top:y,width:w,height:h,borderRadius:16,background:'rgba(52,194,92,.18)',border:'2px solid var(--brand)',zIndex:3}}/>;
  return <div style={{position:'absolute',inset:0}}>
    <MapView offsetY={-80}>
      {zone(150,250,110,90)}{zone(40,120,80,70)}{zone(270,420,90,80)}
      <Pin x={205} y={300}><div style={{width:34,height:34,borderRadius:'50%',background:'var(--brand)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',border:'2.5px solid #fff',boxShadow:'var(--shadow-brand)'}}><Icon name="ParkingSquare" size={18}/></div></Pin>
      <UserDot x={205} y={330} heading/>
    </MapView>
    <div style={{position:'absolute',top:58,left:20,right:20,zIndex:20,display:'flex',gap:12,alignItems:'center'}}>
      <IconButton icon="ArrowLeft" label="Voltar" onClick={onBack}/>
      <div style={{flex:1,padding:'10px 14px',borderRadius:'var(--radius-lg)',background:'var(--glass-bg)',backdropFilter:'var(--blur-glass)',boxShadow:'var(--shadow-1)'}}><div style={{font:'var(--type-label)'}}>Ponto de devolução</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>Pç. Oswaldo Cruz · você está dentro</div></div>
    </div>
    <BottomSheet padding="10px 20px 34px">
      <ProgressSteps total={2} current={photo?1:0} label={photo?'Passo 2 de 2 · Travar':'Passo 1 de 2 · Foto'} style={{marginBottom:14}}/>
      <div style={{font:'var(--type-heading)',marginBottom:12}}>Fotografe a moto estacionada</div>
      <PhotoCapture label="Tirar foto" hint="Mostre a moto inteira e a calçada livre" height={130} done={photo} onClick={()=>setPhoto(true)}/>
      <Alert tone={confirming?'info':'success'} icon={confirming?'RefreshCw':'MapPin'} style={{margin:'12px 0 14px'}}>{confirming?'Aguardando o rastreador confirmar moto parada e travada…':'Fora dos pontos verdes não é possível encerrar sem taxa.'}</Alert>
      <Button size="lg" fullWidth variant="dark" icon="Lock" disabled={!photo||confirming} onClick={finish}>{confirming?'Confirmando…':'Travar e encerrar'}</Button>
    </BottomSheet>
  </div>;
}
window.ReturnScreen=ReturnScreen;
