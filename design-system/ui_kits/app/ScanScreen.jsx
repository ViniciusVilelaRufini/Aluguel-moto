
function ScanScreen({ onBack, onUnlocked }) {
  const { IconButton, Button, Icon } = VDS;
  const [state,setState]=React.useState('idle');
  const scan=()=>{ if(state!=='idle')return; setState('unlocking'); setTimeout(onUnlocked,900); };
  const c={position:'absolute',width:34,height:34,borderColor:'var(--green-400)',borderStyle:'solid',borderWidth:0};
  return <div style={{position:'absolute',inset:0,background:'#0d0f10',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',padding:'58px 20px 40px'}}>
    <div style={{display:'flex',width:'100%',justifyContent:'space-between',alignItems:'center'}}>
      <IconButton icon="X" variant="dark" label="Fechar" onClick={onBack} style={{background:'rgba(255,255,255,.12)'}}/>
      <div style={{font:'var(--type-body-strong)'}}>Escanear QR</div>
      <IconButton icon="Flashlight" variant="dark" label="Lanterna" style={{background:'rgba(255,255,255,.12)'}}/>
    </div>
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24}}>
      <button onClick={scan} style={{position:'relative',width:250,height:250,border:0,borderRadius:28,background:'rgba(255,255,255,.04)',cursor:'pointer',color:'rgba(255,255,255,.5)',font:'var(--type-caption)'}}>
        <span style={{...c,top:0,left:0,borderTopWidth:4,borderLeftWidth:4,borderTopLeftRadius:24}}/><span style={{...c,top:0,right:0,borderTopWidth:4,borderRightWidth:4,borderTopRightRadius:24}}/>
        <span style={{...c,bottom:0,left:0,borderBottomWidth:4,borderLeftWidth:4,borderBottomLeftRadius:24}}/><span style={{...c,bottom:0,right:0,borderBottomWidth:4,borderRightWidth:4,borderBottomRightRadius:24}}/>
        {state==='idle' ? 'visor da câmera — toque para simular' : <span style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,color:'#fff',font:'var(--type-label)'}}><span style={{width:56,height:56,borderRadius:'50%',background:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--shadow-brand)'}}><Icon name="LockOpen" size={26}/></span>Moto VT-4821 encontrada</span>}
      </button>
      <div style={{textAlign:'center'}}><div style={{font:'var(--type-heading)'}}>Aponte para o QR no guidão</div><div style={{font:'var(--type-body)',color:'rgba(255,255,255,.6)',marginTop:6}}>Ou digite o número da moto.</div></div>
    </div>
    <Button variant="secondary" size="lg" fullWidth icon="Keyboard" onClick={scan} style={{background:'transparent',color:'#fff',borderColor:'rgba(255,255,255,.3)'}}>Digitar número da moto</Button>
  </div>;
}
window.ScanScreen=ScanScreen;
