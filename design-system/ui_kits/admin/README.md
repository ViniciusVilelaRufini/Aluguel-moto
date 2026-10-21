# Volti — Painel web do admin

Desktop (1440×900). SideNav escura + header com busca. Sair (ícone no rodapé da nav) volta ao login.

- `LoginView.jsx` — e-mail/senha + 2FA obrigatório
- `FleetView.jsx` — mapa ao vivo, filtros por status, ficha da moto, comandos remotos (bloquear, desbloquear, buzina, limitar, modo roubada), replay, auditoria
- `AlertsView.jsx` — queda, movimento sem aluguel, rastreador desconectado, bateria crítica, aluguel longo, parada fora do ponto
- `ZonesView.jsx` — área de operação, pontos de devolução, zonas proibidas/velocidade reduzida, regras automáticas
- `CustomersView.jsx` — busca, verificação (documento, selfie, comparação facial), atendimento (chat, sinistros, contestações, estornos), histórico, bloqueio e lista de restrição
- `OperationsView.jsx` — quadro de tarefas do operador (atribuir) e manutenção preventiva por km/horas
- `FinanceView.jsx` — KPIs, receita diária e por plano, cauções e repasses
- `PricingView.jsx` — planos, taxas, seguros, cupons (editáveis)
- `TeamView.jsx` — perfis Administrador/Operação/Financeiro/Suporte com 2FA
