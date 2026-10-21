
function AccountScreen({ onBack }) {
  const { IconButton, Card, ListRow, Button, Badge, StatTile } = VDS;
  const group=(title,children)=><div><div style={{font:'var(--type-overline)',letterSpacing:'var(--ls-caps)',color:'var(--text-secondary)',textTransform:'uppercase',margin:'18px 4px 8px'}}>{title}</div><Card padding={4} style={{display:'flex',flexDirection:'column'}}>{children}</Card></div>;
  return <div style={{position:'absolute',inset:0,background:'var(--surface-app)',display:'flex',flexDirection:'column'}}>
    <div style={{padding:'58px 20px 0',display:'flex',alignItems:'center',gap:12}}><IconButton icon="ArrowLeft" label="Voltar" onClick={onBack}/><div style={{font:'var(--type-heading)'}}>Minha conta</div></div>
    <div className="vt-stagger" style={{flex:1,overflow:'auto',scrollbarWidth:'none',padding:'16px 20px 40px'}}>
      <div style={{display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'var(--sun-300)',display:'flex',alignItems:'center',justifyContent:'center',font:'var(--fw-bold) 20px/1 var(--font-sans)'}}>AL</div>
        <div style={{flex:1}}><div style={{font:'var(--type-body-strong)'}}>Ana Lima</div><div style={{display:'flex',gap:6,marginTop:4}}><Badge size="sm" icon="ShieldCheck">Verificada</Badge><Badge size="sm" tone="neutral">18+</Badge></div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:16}}>
        <StatTile icon="Wallet" label="Créditos" value="R$ 38,50"/><StatTile icon="Timer" label="Pacote de minutos" value="120 min"/>
      </div>
      <Button fullWidth variant="secondary" icon="Plus" style={{marginTop:10}}>Recarregar carteira</Button>
      {group('Plano',<><ListRow icon="CalendarClock" iconTone="brand" title="Semanal entregador" subtitle="Próxima cobrança 28/10 · R$ 299" trailing="chevron"/><ListRow icon="BatteryCharging" iconTone="info" title="Estações de troca de bateria" trailing="chevron"/><ListRow icon="Wrench" title="Agendar manutenção" trailing="chevron"/></>)}
      {group('Viagens',<><ListRow icon="History" title="Histórico e recibos" value="23" trailing="chevron"/><ListRow icon="Gift" iconTone="sun" title="Cupons e indicação" subtitle="Ganhe R$ 10 por amigo" trailing="chevron"/><ListRow icon="FileText" title="Contestar cobrança / sinistro" trailing="chevron"/></>)}
      {group('Ajuda',<><ListRow icon="MessageCircle" iconTone="brand" title="Chat com o suporte" trailing="chevron"/><ListRow icon="CircleHelp" title="Central de ajuda" trailing="chevron"/><ListRow icon="Signpost" title="Regras de trânsito para autopropelidos" trailing="chevron"/></>)}
      {group('Privacidade (LGPD)',<><ListRow icon="Download" title="Baixar meus dados" trailing="chevron"/><ListRow icon="Trash2" iconTone="danger" title="Excluir conta" trailing="chevron"/></>)}
    </div>
  </div>;
}
window.AccountScreen=AccountScreen;
