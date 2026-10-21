
function LoginView({ onDone }){
  const { Input, Button, OtpInput, Alert } = VDS;
  const [step,setStep]=React.useState(0);
  const [code,setCode]=React.useState('');
  return <div style={{height:'100vh',display:'flex',fontFamily:'var(--font-sans)',color:'var(--text-primary)'}}>
    <div style={{width:'42%',background:'var(--ink-900)',color:'#fff',padding:56,display:'flex',flexDirection:'column'}}>
      <div style={{font:'800 32px/1 var(--font-sans)',letterSpacing:'-.04em',color:'var(--green-400)'}}>volti</div>
      <div style={{flex:1}}/>
      <div style={{font:'800 48px/1.05 var(--font-sans)',letterSpacing:'-.03em',maxWidth:420}}>Painel de operação</div>
      <div style={{font:'var(--type-body)',color:'rgba(255,255,255,.6)',marginTop:12,maxWidth:380}}>Frota, clientes e finanças em tempo real. Acesso restrito à equipe.</div>
    </div>
    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface-app)'}}>
      <div style={{width:380,display:'flex',flexDirection:'column',gap:16}}>
        {step===0 ? <>
          <div style={{font:'var(--type-title)',letterSpacing:'-.02em'}}>Entrar</div>
          <Input label="E-mail" defaultValue="carla@volti.app" icon="Mail"/>
          <Input label="Senha" type="password" defaultValue="••••••••••" icon="Lock"/>
          <Button size="lg" fullWidth onClick={()=>setStep(1)}>Continuar</Button>
        </> : <>
          <div style={{font:'var(--type-title)',letterSpacing:'-.02em'}}>Verificação em dois fatores</div>
          <div style={{font:'var(--type-body)',color:'var(--text-secondary)'}}>Digite o código do seu app autenticador.</div>
          <OtpInput value={code} onChange={setCode}/>
          <Alert tone="info" icon="ShieldCheck">2FA é obrigatório para todos os perfis.</Alert>
          <Button size="lg" fullWidth disabled={code.length<6} onClick={onDone}>Entrar no painel</Button>
          <Button variant="ghost" fullWidth onClick={()=>{setCode('');setStep(0)}}>Voltar</Button>
        </>}
      </div>
    </div>
  </div>;
}
window.LoginView=LoginView;
