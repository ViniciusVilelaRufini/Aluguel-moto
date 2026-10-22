# Evoluções além do design system (app do cliente)

Data: 2026-10-21 · Branch `design/app`. Cada item vai além do que `design-system/` define hoje e precisa de revisão. Status: **aplicado** (no código, com testes) ou **proposto** (não implementado; motivo indicado). Problemas que motivam cada item estão em `auditoria-app.md`.

Princípios mantidos: verde `#34C25C` continua a cor da marca (o fundo dos botões preenchidos usa o tom de ação mais escuro, E-12); coral só para urgência/SOS; cores de status e bateria intocadas; reduced motion mostra o estado final no primeiro frame; nada muda no contrato da API.

## Aplicadas

| ID | Evolução | Por quê | Telas | Peça nova |
|---|---|---|---|---|
| E-01 | **Esqueletos no formato do conteúdo** com luz que cruza em 1,4 s | Spinner genérico faz a tela "pular" quando os dados chegam; o esqueleto antecipa o layout | Histórico, suporte, carteira, assinaturas, plano (planos, seguros, resumo), mapa (cartão), devolução (zona) | `VoltiSkeleton`, `VoltiSkeletonBox`; `AsyncView(loading:)` |
| E-02 | **Cartão da moto arrasta para fechar** com física de mola (dispensa por distância > 96 px ou velocidade > 700 px/s; resistência para cima) e grabber | Gesto esperado em bottom sheets; antes só fechava pelo X | Mapa | `VoltiDragToDismiss` |
| E-03 | **Háptica semântica** (seleção, toque, aviso, alerta, sucesso) | Quem está andando não olha a tela; confirma ações sem ruído visual | Mapa (pin, reservar), plano (seleções), scan, Pix, corrida (zona, queda, SOS, pausa), reserva (último minuto), devolução, recibo, puxar para atualizar | `VoltiHaptics` |
| E-04 | **Números que rolam** só nos dígitos que mudam; **total que conta** | Valores ao vivo mudavam "a seco"; o rolar mostra o que mudou sem piscar a linha | Corrida (cronômetro, custo, bateria), plano (total estimado), recibo (total), carteira (saldo) | `VoltiTicker`, `VoltiCountUp` |
| E-05 | **Medidor de velocidade × limite** no HUD: arco de 270°, verde até 85% do limite, sol de 85% a 100%, coral acima | Leitura em meio segundo de "estou perto do limite?" sem ler números | Corrida | `VoltiSpeedGauge` |
| E-06 | **Estados vazios ricos**: disco tonal com ícone, título, texto, próximo passo e slot de ilustração | Linha de texto solta não orienta; slot pronto para a arte de personagem (aguardando, ver ICONOGRAPHY) | Histórico, suporte, reserva, mapa (versão compacta) | `VoltiEmptyState` |
| E-07 | **Puxar para atualizar** verde da marca com háptica leve | Listas da conta não tinham como atualizar sem sair | Histórico, suporte, carteira, assinaturas | `VoltiRefresh` |
| E-08 | **Faixas de status animadas** (tamanho + fade, cross-fade ao trocar texto, live region) | Banner de zona e aviso de conexão apareciam com salto em cima do mapa | Corrida (zona, sem tempo real) | `VoltiStatusBanner` (tons info, warning, danger, offline) |
| E-09 | **Barra de progresso da reserva** que esvazia sem degraus | O cronômetro sozinho não mostra quanto do tempo já passou | Reserva | `ReservationBanner(totalSeconds:)` (opcional, compatível) |
| E-10 | **Coreografia de sucesso**: check → título → total contando; Pix mostra check antes de fechar; trava com cadeado pulsando | Os momentos de conclusão (pagar, travar, recibo) não tinham fechamento | Pix, devolução, recibo | reuso de `VoltiSuccessCheck`, `VoltiPulse`, `VoltiCountUp` |
| E-11 | **Tinta forte para texto em banners**: `warningInkStrong` #9A4A0F e `dangerInkStrong` #B0352B | `warningInk`/`dangerInk` sobre fundo suave ficam em 3,9:1 e 3,5:1 (abaixo de 4,5:1) | Todos os `NoticeBanner` e `VoltiStatusBanner` | 2 tokens em `VoltiColors` (sugestão para `tokens/colors.css`: `--warning-ink-strong`, `--danger-ink-strong`) |
| E-13 | **Alvo de toque de 44 px nos chips**: o visual continua com 36 px e ganha 4 px invisíveis acima e abaixo (largura mínima de 44); a semântica cobre a área toda | O DS pede alvo mínimo de 44 | Mapa (filtro), corrida (Reportar problema, Compartilhar trajeto), operador | `VoltiChip` (o layout fica 8 px mais alto) |
| E-14 | **Selo ao vivo/pausada** na marca (pílula verde suave com ponto piscando; sol suave com ícone de pausa) e chips da marca nas ações da corrida | `Chip`/`ActionChip` do Material destoavam | Corrida | local na tela |
| E-12 | **Tom de ação para botões preenchidos**: `VoltiColors.brandAction` #1C7F38 atrás de texto branco (5,07:1, AA). `#34C25C` segue como cor da marca em pins, chips, seleção, ícones, contornos | Branco sobre #34C25C = 2,3:1 (abaixo de 4,5:1) | Todos os `VoltiButton` primários e `VoltiIconButton` `brand`, **nos dois apps (cliente e operador)** | token `brandAction`/`onBrandAction` e `VoltiColors.contrast()` (WCAG) em `volti_flutter`; sugestão para `tokens/colors.css`: `--brand-action: #1C7F38`. Aprovado pelo usuário em 2026-10-22 (lote D) |
| E-12a | **Extensão do E-12 ao botão secundário (contorno)**: texto e borda em `brandAction` #1C7F38 (5,07:1 sobre branco; antes `#34C25C` = 2,3:1) | O texto verde da marca sobre branco também ficava abaixo de 4,5:1 | `VoltiButton` secundário nos dois apps (cliente e operador) | sem token novo; teste calcula o contraste. Decisão da revisão do lote D, 2026-10-22 |
| E-15 | **Transição compartilhada pin → cartão → scan → plano**: um disco sai do pin tocado e vira a mídia do cartão (voo em overlay, segue o cartão que sobe); a mídia é um `Hero` (`vehicle-media-<código>`) que voa para o visor do scan ("Procurando VT-4821" / "Moto VT-4821 encontrada") e para o cabeçalho do plano | Continuidade espacial entre a moto escolhida e a contratação | Mapa, scan, plano | `SharedFlight`, `VehicleHero` (cliente); `VehicleSummaryCard(heroTag:)`, `VehicleThumb` (`volti_flutter`). Reduced motion: sem voo (`HeroMode` desligado). Aprovado em 2026-10-22 |
| E-17 | **Faixa global "Sem conexão"** no topo de todas as telas: pílula escura com ícone, entra deslizando, some sozinha quando a rede volta; não bloqueia toques e é live region | Antes só havia erro pontual por tela | Todas (cliente) | `connectivity_plus` + `onlineProvider`/`OfflineBanner` no `builder` do `MaterialApp`. Reduced motion: aparece e some sem deslizar. Aprovado em 2026-10-22 |

Correções de base que acompanharam (não são evoluções, mas mudam `volti_flutter`): `VoltiChip` agora tem altura mínima de 36 px que cresce com o texto; `VoltiPressable` com rótulo não repete o texto interno para leitores de tela; `VoltiFadeUp`/`VoltiEnter` preservam o estado do filho ao terminar.

## Propostas (não aplicadas)

| ID | Evolução | Por quê | Telas | Motivo de não aplicar agora |
|---|---|---|---|---|
| E-16 | Bottom sheet com pontos de encaixe (recolhido/meio/expandido) na corrida | Mais mapa visível durante a corrida | Corrida | Precisa de teste de uso com gente andando; o sheet atual já limita a 62% da altura e rola |
| E-18 | Chat de suporte com hora, estado de envio e envio otimista | Retorno de envio e contexto temporal | Suporte | Precisa de status por mensagem no contrato |
| E-19 | Ilustrações de personagem em boas-vindas e estados vazios | Referência visual do DS | Boas-vindas, vazios | Aguardando arte; slot `VoltiEmptyState.illustration` já existe |
| E-20 | Preferência "vibração" na conta | Algumas pessoas não querem háptica | Conta | `VoltiHaptics.enabled` já existe; falta persistir a preferência |

## Tokens e componentes novos (resumo para o DS)

- Cores: `--warning-ink-strong: #9A4A0F`, `--danger-ink-strong: #B0352B`, `--brand-action: #1C7F38` (E-12).
- Motion: esqueleto 1,4 s `--ease-in-out` em loop; ticker 280 ms `--ease-out` (entra de baixo, sai por cima); faixa de status 320 ms (`--dur-slow`) com `--ease-screen` no tamanho; contagem do recibo 900 ms após 700 ms; mola do arrastar (massa 1, rigidez 520, amortecimento 34).
- Componentes: Skeleton, Ticker/CountUp, SpeedGauge, EmptyState, StatusBanner, Refresh, DragToDismiss, Haptics (intenções).
