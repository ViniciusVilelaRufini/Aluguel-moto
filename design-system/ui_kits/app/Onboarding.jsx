
function Onboarding({ onDone, initialStep=0 }) {
  const { Button, Input, Checkbox, IconButton, Icon, OtpInput, ProgressSteps, PhotoCapture, Alert, OptionCard, Badge } = VDS;
  const [step,setStep]=React.useState(initialStep);
  const [code,setCode]=React.useState('48');
  const [age,setAge]=React.useState(true);
  const [doc,setDoc]=React.useState(false), [selfie,setSelfie]=React.useState(false);
  const [pay,setPay]=React.useState('card');
  const shell=(title,sub,body,cta,ctaOk=true,next)=><div style={{position:'absolute',inset:0,background:'var(--surface-card)',display:'flex',flexDirection:'column',padding:'60px 20px 40px'}}>
    <div style={{display:'flex',alignItems:'center',gap:14}}><IconButton icon="ArrowLeft" variant="soft" size={40} label="Voltar" onClick={()=>setStep(step-1)}/><ProgressSteps total={4} current={step-1} style={{flex:1}}/></div>
    <div style={{font:'var(--type-title)',letterSpacing:'-.02em',margin:'22px 0 6px'}}>{title}</div>
    <div style={{font:'var(--type-body)',color:'var(--text-secondary)',marginBottom:22,textWrap:'pretty'}}>{sub}</div>
    <div style={{display:'flex',flexDirection:'column',gap:14,flex:1,overflow:'auto'}}>{body}</div>
    <Button size="lg" fullWidth disabled={!ctaOk} onClick={next||(()=>setStep(step+1))} style={{marginTop:16}}>{cta}</Button>
  </div>;
  if (step===0) return <div style={{position:'absolute',inset:0,background:'var(--surface-card)',display:'flex',flexDirection:'column',padding:'64px 20px 40px'}}>
    <div style={{font:'800 26px/1 var(--font-sans)',letterSpacing:'-.04em',color:'var(--brand)'}}>volti</div>
    <div style={{flex:1,margin:'20px 0',borderRadius:'var(--radius-xl)',background:'var(--sky-100)',display:'flex',alignItems:'center',justifyContent:'center',font:'var(--type-caption)',color:'var(--blue-600)',textAlign:'center'}}>ilustração de boas-vindas<br/>(arte da marca)</div>
    <div style={{display:'flex',gap:8,marginBottom:14}}>{['Sem CNH','Sem placa','18+'].map(t=><Badge key={t} tone="success">{t}</Badge>)}</div>
    <div style={{font:'var(--type-display)',letterSpacing:'-.02em'}}>Pegue uma moto e vá.</div>
    <div style={{font:'var(--type-body)',color:'var(--text-secondary)',margin:'8px 0 22px'}}>Por minuto, hora, dia ou semana. Liberada pelo app em segundos.</div>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <Button size="lg" fullWidth icon="Phone" onClick={()=>setStep(1)}>Continuar com celular</Button>
      <div style={{display:'flex',gap:10}}><Button size="lg" variant="dark" style={{flex:1}} onClick={()=>setStep(1)}>Apple</Button><Button size="lg" variant="secondary" style={{flex:1,color:'var(--text-primary)',borderColor:'var(--border-strong)'}} onClick={()=>setStep(1)}>Google</Button></div>
      <Button variant="ghost" fullWidth icon="Mail" onClick={()=>setStep(1)}>Entrar com e-mail</Button>
    </div>
  </div>;
  if (step===1) return shell('Digite o código','Enviamos 6 dígitos por SMS para (11) 98765-4321.',<>
    <OtpInput value={code} onChange={setCode}/>
    <div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>Não chegou? <a href="#" onClick={e=>e.preventDefault()}>Reenviar em 0:42</a></div></>,'Confirmar',code.length===6);
  if (step===2) return shell('Seus dados','Não pedimos CNH. Só confirmamos que é você.',<>
    <Input label="Nome completo" placeholder="Como no documento" icon="User" defaultValue="Ana Lima"/>
    <Input label="CPF" placeholder="000.000.000-00" icon="IdCard" inputMode="numeric" defaultValue="123.456.789-00"/>
    <Input label="Data de nascimento" placeholder="DD/MM/AAAA" icon="Calendar" defaultValue="14/03/1998" hint="É preciso ter 18 anos ou mais"/>
    <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:4}}>
      <Checkbox checked={age} onChange={setAge} label="Aceito os termos de uso e a política de privacidade"/>
      <Checkbox defaultChecked label="Permito o uso da minha localização durante o aluguel"/>
    </div></>,'Continuar',age);
  if (step===3) return shell('Verificação de identidade','Foto do documento e uma selfie rápida para comparação facial.',<>
    <PhotoCapture label="Foto do documento (RG ou CNH)" hint="Frente, sem reflexo" icon="IdCard" height={140} done={doc} onClick={()=>setDoc(true)}/>
    <PhotoCapture label="Selfie com prova de vida" hint="Pisque quando pedirmos" icon="ScanFace" height={140} done={selfie} onClick={()=>setSelfie(true)}/>
    <Alert tone="info" icon="ShieldCheck">Seus documentos ficam criptografados e servem só para verificação.</Alert></>,'Enviar para análise',doc&&selfie);
  return shell('Forma de pagamento','O cartão garante a caução. A chave Pix é usada para estornos.',<>
    <OptionCard icon="CreditCard" title="Cartão de crédito" description="Visa •••• 4821" selected={pay==='card'} onClick={()=>setPay('card')}/>
    <OptionCard icon="Wallet" title="Pix + carteira Volti" description="Caução por depósito Pix" selected={pay==='pix'} onClick={()=>setPay('pix')}/>
    <Input label="Chave Pix para estornos" placeholder="CPF, e-mail ou celular" icon="KeyRound" defaultValue="123.456.789-00"/></>,'Concluir cadastro',true,onDone);
}
window.Onboarding=Onboarding;
