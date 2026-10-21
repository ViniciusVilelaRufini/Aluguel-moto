# Volti Design System

**Volti** (nome provisório) é um app de aluguel de **motos elétricas que não exigem CNH nem placa** — veículos leves de até 32 km/h, liberados pelo celular via QR code e cobrados por minuto. Três produtos sobre um backend AWS (sa-east-1, rastreadores via IoT Core):
1. **App do cliente** (iOS/Android) — cadastro com verificação facial, mapa, reserva, planos + seguro, corrida, devolução com foto, recibo, conta/LGPD.
2. **App do operador de campo** — tarefas (bateria, recolher, manutenção, reposicionar), modo serviço, checklist.
3. **Painel web do admin** — frota ao vivo, comandos remotos, alertas, cercas/regras, clientes, financeiro.

## Fontes
- Referência visual: `uploads/8f26498453a8dd40398598c025cf4411.jpg` — mockup estilo Dribbble ("Fastgo Scooty") com mapa, bottom sheet do veículo e contagem de reserva. Usada como guia de alto nível (não há código nem Figma).
- Funções e arquitetura: `uploads/infra_file-1792592492426-iuah.docx` ("Aluguel de motos elétricas — funções e arquitetura AWS", Vinicius Vilela Rufini, 21/10/2026). Também referenciado como artifact `https://claude.ai/artifact/3YXZV9GSQLCFKSm8L6hjz8#eea4b31b-920f.mn7fmk476vv.4801` (não acessível).
- **Sem logo fornecido.** A marca é renderizada como texto puro "volti" em Plus Jakarta Sans 800. Não há símbolo.

## Índice
- `styles.css` — ponto de entrada (só `@import`)
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`
- `assets/fonts/` — Plus Jakarta Sans 400–800, JetBrains Mono 500/700 (woff2)
- `guidelines/` — cards de fundamentos (cores, tipo, espaçamento, raios, sombras, motion, marca, ícones)
- `components/` — primitivos React (abaixo)
- `ui_kits/app/` — app do cliente (9 telas clicáveis)
- `ui_kits/operator/` — app do operador de campo
- `ui_kits/admin/` — painel web do admin (1440×900)
- `SKILL.md` — uso como Agent Skill

## Components
- **core/**: Icon, Button, IconButton, Badge, Chip, Card
- **forms/**: Input, Switch, Checkbox, SegmentedControl, OptionCard, OtpInput
- **feedback/**: Toast, Dialog, BottomSheet, Alert, ProgressSteps
- **mobility/**: LocationHeader, VehicleMarker, BatteryPill, RouteInfoPill, PassCard, ListRow, SwipeAction, ReservationBanner, VehicleSummary, PhotoCapture
- **data/**: FleetStatus (+ `FLEET_STATUS` map), StatTile, DataTable
- **navigation/**: SideNav

Nenhuma fonte definia um inventário de componentes; este é um conjunto padrão dimensionado ao produto. Os componentes de `mobility/` vêm diretamente da referência (pin, pílula de bateria, pílula de rota, card de passe, contagem com deslize).

### Intentional additions
- **Icon** — wrapper do Lucide para renderizar ícones em React sem sprites.
- **SegmentedControl, Switch, Checkbox, Input, Dialog, Toast** — não aparecem na referência; necessários para cadastro, configurações e confirmações.
- **OptionCard, OtpInput, PhotoCapture, ProgressSteps, Alert** — exigidos pelo documento (planos/seguro, SMS, documento/selfie/foto de devolução, avisos de zona).
- **FleetStatus, StatTile, DataTable, SideNav** — painel admin e app do operador.

## CONTENT FUNDAMENTALS
- **Idioma:** português do Brasil. Tratamento por **você**; a marca fala como "a gente/nós" só quando necessário ("Enviamos um código por SMS").
- **Tom:** direto, leve, urbano. Frases curtas, verbo no imperativo: "Escanear para andar", "Deslize para cancelar", "Aponte para o QR no guidão".
- **Caixa:** sentence case em tudo (botões, títulos, labels). Nunca CAPS, exceto o overline de categoria se usado com tracking.
- **Benefício antes de regra:** "Ande sem CNH." / "Você paga só pelos minutos que andar."
- **Sem distância percorrida:** é aluguel — km rodados não são cobrados nem exibidos ao cliente. Só aparecem autonomia da bateria e distância a pé até a moto.
- **Números:** formato BR — "R$ 0,79/min", "12 min", "~20 km" (autonomia da bateria). Contagens em mono: "06 : 23 min".
- **Erros:** dizem o que fazer — "Cupom inválido ou expirado", "Estacione numa área verde".
- **Emoji:** não. Nem em push. Ícones fazem esse trabalho.
- Exemplos: "Desbloqueie seu passe — Ande mais, pague menos", "Grátis na 1ª corrida", "Tempo de reserva restante", "Encerrar corrida?", "Moto travada. Até a próxima!"

## VISUAL FOUNDATIONS
- **Cor:** branco + tinta fria (`--ink-*`) dominam; **verde `#34C25C`** é a única cor de ação (CTA, seleção, foco, localização). Coral `#F2665A` = urgência/tempo (reserva, cancelar). Laranja = categoria do veículo. Azul = preço. Céu `#DDF1FA` atrás de fotos de veículo. Escuro `#15181A` para pílulas de dado (bateria, rota) e toasts.
- **Tipo:** Plus Jakarta Sans (substituta — a referência usa uma grotesca arredondada semelhante a SF/Gilroy). Títulos 700–800 com tracking −2%; corpo 500. JetBrains Mono para cronômetros e códigos.
- **Espaçamento:** gutter de tela 20px; stacks 8/10/12/16; controles 36/48/56; alvo mínimo 44.
- **Fundos:** o **mapa claro full-bleed** é o fundo de todas as telas principais. Sem gradientes decorativos, sem texturas. A única "gradiente" é o cone de direção verde translúcido do usuário.
- **Imagem:** fotos de veículo recortadas (PNG sem fundo) sobre o tile céu; tom claro e limpo. Mapas: tiles OpenStreetMap com filtro `saturate(.55) brightness(1.06) contrast(.92)` (produção: Amazon Location Service, estilo claro). Ilustrações de personagem (como na referência) são bem-vindas em onboarding — aguardando arte.
- **Cantos:** generosos. Badge 6, input 14, card 20, sheet/dialog 28, botões e chips **pill**.
- **Cards:** brancos, sem borda, sombra suave fria (`--shadow-1`). Grupos dentro de sheets usam `--surface-sunken` (cinza) sem sombra. Nunca borda colorida lateral.
- **Sombras:** duas elevações neutras + glow colorido apenas em CTA verde (`--shadow-brand`) e banner coral.
- **Transparência/blur:** cards de passe e o HUD de velocidade flutuam sobre o mapa com vidro branco 82% + blur 16px. Nada mais usa blur.
- **Layout fixo:** header (avatar · localização · sino) no topo; CTA verde pill fixo a 40px da base; botão "localizar" redondo 16px acima do CTA; bottom sheet sobe do rodapé.
- **Motion:** `--ease-out` 200ms padrão; sheets 320ms; spring (`--ease-spring`) em knobs, pins selecionados e switch. Sem bounces gratuitos, sem fades longos.
- **Motion (v2):** presets em `tokens/motion.css` (`vt-*`). Troca de tela: push lateral 440ms `--ease-screen` (avançar entra pela direita, voltar sai pela direita); scan abre como modal de baixo para cima e a tela de trás recua (escala .93, escurece). Conteúdo entra em cascata (`.vt-stagger`, 45ms entre itens). Botões: ripple a partir do toque + spring .97; CTA principal pode ter `shine`. Pins caem com mola em sequência; pin selecionado e posição do usuário pulsam. Rotas se desenham. Sucesso = check com pop + anel. Respeita `prefers-reduced-motion`.
- **Hover/press:** mobile-first — press = escala .97 + brilho −6% em botões, .92 em icon buttons. Hover (web) = mesma cor 1 tom mais escuro (`--brand-hover`).
- **Bordas:** 1–1.5px, só em secundário (verde), chips e inputs focados.
- **Status da frota:** `--status-free` verde, `rented` azul, `reserved` laranja, `paused` sol, `blocked` coral escuro, `maintenance` violeta, `offline` cinza — mesmos em mapa, filtros e tabelas.
- **Superfícies por produto:** cliente = mapa claro + branco; operador = header ink-900 arredondado (sinaliza modo trabalho); admin = SideNav ink-900, conteúdo ink-50, painéis laterais brancos com borda 1px.
- **Emergência:** SOS é o único botão coral sólido permanente; queda/SOS usam Dialog com ícone coral.
- **Estados de bateria:** verde >50, amarelo 21–50, coral ≤20 — sempre em pin e pílula.

## ICONOGRAPHY
- **Lucide** (CDN `unpkg.com/lucide@0.460.0`), traço 2px, cantos arredondados, outline — combina com os ícones da referência. **Substituição sinalizada:** a referência não fornece ícones próprios.
- Renderizar via componente `Icon` (lê `window.lucide.icons`); carregue o script do Lucide antes de `_ds_bundle.js`.
- Tamanhos: 12–16 em pílulas/chips, 20 em botões, 24 em navegação.
- Preenchimento só em: seta de localização (Navigation, Navigation2) e estrelas de avaliação.
- O pin usa "Bike" porque o Lucide não tem patinete/moto — trocar por ícone próprio quando existir.
- Sem emoji, sem caracteres unicode como ícone (exceto "~" e "·" em dados).
