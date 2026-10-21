# Volti — Painel admin (referência v2)

Fonte: `Volti Painel Admin.html` (bundle exportado, aberto direto no navegador: `volti-painel-admin.html`).
Os arquivos `.jsx` foram extraídos do bundle e são a **referência de layout e comportamento** do painel (`apps/admin`).
Usam os componentes do design system via `window.VDS` (`design-system/components/**`).

- `AdminApp.jsx` — casca: `SideNav` ink-900 com 8 itens (Frota ao vivo, Alertas, Cercas e regras, Clientes, Operação, Financeiro, Preços e planos, Equipe e acessos), rodapé com avatar/grupo/2FA e sair; header branco 64px com título da seção, busca pill "Buscar moto, cliente ou aluguel" e badge de motos/sem sinal.
- `LoginView.jsx` — login em etapas com OTP (2FA).
- `FleetAndAuditView.jsx` — `FleetView` (mapa ao vivo + painel lateral da moto + comandos) e dados de auditoria.
- `AdminMap.jsx` — mapa (tiles OSM dessaturados).
- `AlertsView.jsx`, `ZonesView.jsx`, `CustomersView.jsx`, `OperationsView.jsx` (kanban de tarefas), `FinanceView.jsx`, `PricingView.jsx`, `TeamView.jsx`.
