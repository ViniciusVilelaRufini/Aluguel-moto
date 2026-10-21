
function TeamView(){
  const { DataTable, Badge, Button } = VDS;
  const R={'Administrador':'dark','Operação':'success','Financeiro':'info','Suporte':'warning'};
  return <div style={{flex:1,overflow:'auto',padding:28,display:'flex',flexDirection:'column',gap:18}}>
    <div style={{display:'flex',alignItems:'center',gap:16}}><div style={{flex:1}}><div style={{font:'var(--type-title)',letterSpacing:'-.02em'}}>Equipe e acessos</div><div style={{font:'var(--type-caption)',color:'var(--text-secondary)'}}>Cada perfil vê só o que precisa · 2FA obrigatório</div></div><Button size="sm" icon="UserPlus">Convidar</Button></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12}}>{[['Administrador','Tudo, incluindo acessos'],['Operação','Frota, cercas, alertas, tarefas'],['Financeiro','Receita, preços, estornos'],['Suporte','Clientes, chat, sinistros']].map(([r,d])=><div key={r} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',padding:16,boxShadow:'var(--shadow-1)'}}><Badge size="sm" tone={R[r]}>{r}</Badge><div style={{font:'var(--type-caption)',color:'var(--text-secondary)',marginTop:10}}>{d}</div></div>)}</div>
    <DataTable columns={[{key:'n',label:'Pessoa'},{key:'e',label:'E-mail'},{key:'r',label:'Perfil',render:r=><Badge size="sm" tone={R[r.r]}>{r.r}</Badge>},{key:'f',label:'2FA',render:r=><Badge size="sm" tone="success" icon="ShieldCheck">Ativo</Badge>},{key:'l',label:'Último acesso',align:'right'}]}
      rows={[{id:1,n:'Vinicius R.',e:'vinicius@volti.app',r:'Administrador',l:'agora'},{id:2,n:'Carla M.',e:'carla@volti.app',r:'Operação',l:'agora'},{id:3,n:'Paulo S.',e:'paulo@volti.app',r:'Financeiro',l:'ontem'},{id:4,n:'Marina T.',e:'marina@volti.app',r:'Suporte',l:'12 min'}]}/>
  </div>;
}
window.TeamView=TeamView;
