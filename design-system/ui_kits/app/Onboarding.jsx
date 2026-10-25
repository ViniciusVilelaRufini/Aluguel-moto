
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
  if (step===0) {
    const { VehicleMarker } = VDS;
    const glass={background:'rgba(255,255,255,.9)',backdropFilter:'var(--blur-glass)',WebkitBackdropFilter:'var(--blur-glass)',boxShadow:'var(--shadow-2)'};
    const float=(d,dl)=>({animation:'vt-pop-in 520ms var(--ease-spring) '+dl+'ms both, vt-float '+d+'s var(--ease-in-out) '+(dl+520)+'ms infinite'});
    return <div style={{position:'absolute',inset:0,background:'var(--ink-900)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <style>{'@keyframes vt-float{50%{transform:translateY(-7px)}}@keyframes vt-grow{from{transform:scaleX(0)}}'}</style>
      <div style={{position:'relative',flex:1,minHeight:0,overflow:'hidden'}}>
        <MapView tiles="light_nolabels"/>
        <div style={{position:'absolute',inset:0,zIndex:7,background:'radial-gradient(circle at 50% 46%,rgba(52,194,92,.16) 0,rgba(52,194,92,0) 46%)'}}/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(21,24,26,.6) 0%,rgba(21,24,26,0) 30%)',zIndex:8}}/>
        <div className="vt-drop" style={{position:'absolute',top:62,left:24,right:24,zIndex:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,font:'800 30px/1 var(--font-sans)',letterSpacing:'-.045em',color:'#fff'}}><img src="../../assets/logo/logo-mark-white.svg" width="36" height="36" alt=""/>volti</div>
          <div style={{display:'flex',alignItems:'center',gap:6,height:30,padding:'0 12px',borderRadius:999,...glass,font:'var(--fw-semibold) 12px/1 var(--font-sans)',color:'var(--ink-900)'}}><span style={{width:7,height:7,borderRadius:4,background:'var(--brand)',animation:'vt-live 1.4s ease-in-out infinite'}}/>108 motos perto</div>
        </div>
        <div style={{position:'absolute',left:'50%',top:'46%',zIndex:8,pointerEvents:'none'}}>{[90,150,210].map((r,i)=><span key={r} style={{position:'absolute',left:-r,top:-r,width:r*2,height:r*2,borderRadius:'50%',border:'1.5px solid rgba(52,194,92,'+(.45-i*.12)+')',animation:'vt-pop-in 700ms var(--ease-out) '+(150+i*120)+'ms both'}}/>)}</div>
        <svg style={{position:'absolute',left:0,top:0,zIndex:9,pointerEvents:'none',overflow:'visible'}} width="402" height="500"><path d="M96 362 C 96 300, 150 300, 160 270 S 190 228, 201 222" fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 9" pathLength="1"/><path d="M96 362 C 96 300, 150 300, 160 270 S 190 228, 201 222" fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" style={{animation:'vt-draw 1.4s var(--ease-in-out) 500ms forwards'}}/></svg>
        <UserDot x={96} y={362}/>
        <div style={{position:'absolute',left:'50%',top:'46%',transform:'translate(-50%,-80%)',zIndex:10}}><VehicleMarker selected level={92} delay={200}/></div>
        <div style={{position:'absolute',left:56,top:'30%',zIndex:9,opacity:.75}}><VehicleMarker level={64} delay={320}/></div>
        <div style={{position:'absolute',right:48,top:'60%',zIndex:9,opacity:.75}}><VehicleMarker level={88} delay={420}/></div>
        <div style={{position:'absolute',left:118,top:'60%',zIndex:10,display:'flex',alignItems:'center',gap:6,height:30,padding:'0 12px 0 8px',borderRadius:999,background:'var(--ink-900)',color:'#fff',font:'var(--fw-semibold) 12px/1 var(--font-sans)',boxShadow:'var(--shadow-2)',...float(3.8,900)}}><Icon name="Footprints" size={14} color="var(--green-300)"/>2 min a pé</div>
        <div style={{position:'absolute',right:20,top:'26%',zIndex:11,width:168,padding:12,borderRadius:20,...glass,...float(4.4,700)}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{font:'var(--fw-semibold) 11px/1 var(--font-sans)',color:'var(--warning)'}}>Moto elétrica</span><Badge size="sm" tone="success">Livre</Badge></div>
          <div style={{font:'var(--fw-bold) 16px/1.2 var(--font-sans)',color:'var(--ink-900)',margin:'6px 0 8px'}}>Volti Flash</div>
          <div style={{height:6,borderRadius:3,background:'var(--ink-100)',overflow:'hidden'}}><div style={{width:'92%',height:'100%',borderRadius:3,background:'var(--brand)',transformOrigin:'left',animation:'vt-grow 900ms var(--ease-out) 900ms both'}}/></div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6,font:'var(--fw-medium) 11px/1 var(--font-sans)',color:'var(--text-secondary)'}}><span>92% · ~20 km</span><span style={{color:'var(--ink-900)',fontWeight:700}}>R$ 0,79/min</span></div>
        </div>
      </div>
      <div className="vt-stagger" style={{position:'relative',zIndex:12,marginTop:-28,background:'var(--surface-card)',borderRadius:'28px 28px 0 0',padding:'26px 22px 36px',display:'flex',flexDirection:'column',boxShadow:'var(--shadow-sheet)'}}>
        <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>{[['Sem CNH','BadgeCheck'],['Sem placa','Ban'],['18+','ShieldCheck']].map(([t,i])=><Badge key={t} tone="success" icon={i}>{t}</Badge>)}<Badge tone="danger" icon="Gift">1ª corrida grátis</Badge></div>
        <div style={{font:'800 32px/1.05 var(--font-sans)',letterSpacing:'-.035em',color:'var(--ink-900)',textWrap:'balance'}}>Pegue uma moto <span style={{color:'var(--brand)'}}>e vá.</span></div>
        <div style={{font:'var(--type-body)',color:'var(--text-secondary)',margin:'10px 0 22px',textWrap:'pretty'}}>Por minuto, hora, dia ou semana. Liberada pelo app em segundos.</div>
        <Button size="lg" fullWidth shine icon="Smartphone" iconRight="ArrowRight" onClick={()=>setStep(1)}>Continuar com celular</Button>
        <div style={{display:'flex',alignItems:'center',gap:12,margin:'16px 0',font:'var(--type-caption)',color:'var(--text-tertiary)'}}><span style={{flex:1,height:1,background:'var(--border-subtle)'}}/>ou entre com<span style={{flex:1,height:1,background:'var(--border-subtle)'}}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          {[['Apple','var(--ink-900)','#fff','transparent'],['Google','#fff','var(--ink-900)','var(--border-strong)'],['E-mail','var(--surface-sunken)','var(--ink-900)','transparent']].map(([l,bg,fg,bd])=><button key={l} onClick={()=>setStep(1)} style={{height:52,borderRadius:16,border:'1.5px solid '+bd,background:bg,color:fg,font:'var(--fw-semibold) 14px/1 var(--font-sans)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>{l==='E-mail'&&<Icon name="Mail" size={16}/>}{l}</button>)}
        </div>
        <div style={{font:'var(--type-caption)',color:'var(--text-tertiary)',textAlign:'center',marginTop:16,textWrap:'pretty'}}>Ao continuar, você aceita os <a href="#" onClick={e=>e.preventDefault()}>termos de uso</a> e a <a href="#" onClick={e=>e.preventDefault()}>política de privacidade</a>.</div>
      </div>
    </div>;
  }
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
