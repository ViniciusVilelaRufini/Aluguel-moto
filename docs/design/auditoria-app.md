# Auditoria de UI/UX do app do cliente

Data: 2026-10-21 · Branch `design/app` · Base: `main` (79f3818, motion v2 já aplicado)

Escopo: `apps/cliente` + `packages/volti_flutter`. Critérios: hierarquia, ritmo de espaçamento, estados (vazio, carregando, erro, offline), retorno de ação, microinterações, transições, háptica, acessibilidade (contraste ≥ 4,5:1, alvo de 44 px, rótulos de Semantics, texto a 200% sem estouro, reduced motion) e texto conforme CONTENT FUNDAMENTALS (pt-BR, "você", caixa de frase, sem emoji, nunca km rodados).

O que já está bom: transições de tela (push 440 ms e modal do scan com recuo), cascata nas listas, queda de pins com mola, pulso do pin selecionado, rota desenhada, check de sucesso no recibo, `VoltiButton` com ripple e brilho, e reduced motion respeitado em todos os primitivos de motion.

## Problemas por impacto

Legenda: **A** alto (bloqueia, confunde ou é arriscado), **M** médio (atrito perceptível), **B** baixo (polimento). A coluna "Status" aponta o commit que resolve ou se ficou proposto.

### Alto impacto

| # | Tela | Problema | Status |
|---|---|---|---|
| A1 | Corrida (HUD) | A velocidade é só um número; nada mostra quão perto você está do limite. Em zona de 6 km/h o aviso some no meio do mapa. Falta leitura rápida e segura enquanto anda. | aplicado: `VoltiSpeedGauge` (arco velocidade/limite, muda para sol perto do limite e coral acima) |
| A2 | Corrida | O custo acumulado e o cronômetro trocam de valor "a seco" a cada evento; o banner de zona e o aviso de tempo real aparecem e somem sem transição (salto de layout em cima do mapa). | aplicado: `VoltiTicker` no custo, `VoltiStatusBanner` animado (tamanho + fade) para zona e conexão |
| A3 | Corrida e Retorno | Nenhuma háptica em eventos críticos: entrar em zona de limite reduzido, detecção de queda, SOS, moto travada. Quem está andando não olha a tela. | aplicado: `VoltiHaptics` (aviso, alerta, sucesso, seleção) |
| A4 | Corrida | Rótulo do botão SOS fixo em código (`'SOS'`) e sem dica do que acontece; `GestureDetector` sem retorno de toque. | aplicado: rótulo e dica localizados, `VoltiPressable` e háptica |
| A5 | Meu plano | Tocar numa assinatura cancela a renovação na hora, sem confirmação. Ação destrutiva com um toque. | aplicado: diálogo de confirmação |
| A6 | Plano | "por minute"/"por hour": a unidade do plano é mostrada pelo nome do enum em inglês. | aplicado: unidade localizada |
| A7 | Texto a 200% | Com `textScaler` 2.0 os chips de ação da corrida (`VoltiChip`, altura fixa de 36 px) estouram, confirmado em teste. O HUD (número de velocidade, bateria e SOS numa linha rígida) e as linhas de valor do recibo não tinham folga para crescer. | aplicado: chip com altura mínima, HUD reorganizado com `Expanded`/`FittedBox`, linhas de valor com espaçamento; testes de 200% em corrida, mapa, histórico e recibo |
| A9 | Motion (todas) | `VoltiFadeUp`/`VoltiEnter` remontavam o filho ao terminar a entrada: estado interno era perdido (contador do recibo reiniciava, pulsos recomeçavam, gesto em andamento era solto). | aplicado: `GlobalKey` no filho (fix em `volti_flutter`) |
| A10 | Leitores de tela | Todo `VoltiButton`/`VoltiChip` era lido duas vezes ("Entrar Entrar"): rótulo do `VoltiPressable` + texto interno. | aplicado: semântica interna excluída quando há rótulo |
| A8 | Carregamento | Listas e mapa usam `CircularProgressIndicator`/`LinearProgressIndicator` genéricos: a tela "pula" quando os dados chegam. | aplicado: `VoltiSkeleton` no formato do conteúdo (histórico, suporte, carteira, planos, assinaturas, mapa) |

### Médio impacto

| # | Tela | Problema | Status |
|---|---|---|---|
| M1 | Histórico, Suporte, Mapa, Reserva | Estados vazios são uma linha de texto solta no meio da tela, sem ícone nem próximo passo. | aplicado: `VoltiEmptyState` (ícone em disco tonal, título, texto, ação e espaço para ilustração) |
| M2 | Histórico, Suporte, Carteira, Assinaturas | Sem puxar para atualizar. | aplicado: `VoltiRefresh` (indicador verde da marca, háptica ao disparar) |
| M3 | Reserva | A contagem regressiva não mostra quanto do tempo já passou; o último minuto não chama atenção. | aplicado: barra de progresso animada no `ReservationBanner` (`totalSeconds`, opcional) e háptica de aviso no último minuto |
| M4 | Mapa | O cartão da moto só fecha pelo X; não dá para arrastar para baixo. Selecionar um pin não tem retorno tátil. | aplicado: arrastar para fechar com física (snap de volta ou dispensa por velocidade) e háptica de seleção |
| M5 | Retorno | "Aguardando a moto travar" usa spinner genérico; é o momento de maior ansiedade do fluxo. | aplicado: cadeado com pulso e texto ao vivo; háptica de sucesso ao travar |
| M6 | Recibo | O total aparece estático; a coreografia termina no check. | aplicado: total sobe com `VoltiTicker` depois do check; háptica de sucesso |
| M7 | Pix | Pagamento confirmado fecha o sheet sem nenhum retorno. | aplicado: háptica de sucesso; check animado antes de fechar |
| M8 | Mapa | Aviso de KYC é um `GestureDetector` sem papel de botão para leitores de tela. | aplicado: `Semantics(button: true)` + `VoltiPressable` |
| M9 | Avaliação | "1 estrelas" e "1 mensagens novas": plural quebrado. | aplicado: plural ICU no ARB |
| M10 | Rede | Fora da corrida não existe aviso de "sem conexão" persistente; só erros pontuais. | proposto: `VoltiStatusBanner` já serve, falta um provider de conectividade (nova dependência `connectivity_plus`) |

### Baixo impacto

| # | Tela | Problema | Status |
|---|---|---|---|
| B0 | Chips | `VoltiChip` com altura fixa de 36 px estoura com texto a 200%; e 36 px fica abaixo do alvo de 44 px. | aplicado: altura mínima que cresce com o texto e área de toque invisível de 44 px (E-13) |
| B1 | Corrida | `Chip`/`ActionChip` do Material destoam dos chips da marca (`VoltiChip`). | aplicado: `VoltiChip` nas ações e no selo ao vivo |
| B2 | Recibo | Estrelas são `IconButton` com 48 px; ok, mas sem háptica. | aplicado: háptica de seleção |
| B3 | Pix | "Aguardando o pagamento..." com três pontos. | aplicado: reticências tipográficas (…) |
| B4 | Ajuda | `ExpansionTile` padrão do Material sem o ritmo dos cartões. | proposto (baixo retorno) |
| B5 | Suporte (chat) | Bolhas sem hora nem estado de envio; envio sem retorno visual otimista. | proposto (precisa de status por mensagem no contrato) |
| B6 | Login/Boas-vindas | Espaço reservado para ilustração de personagem ainda vazio. | proposto (aguardando arte; `VoltiEmptyState.illustration` serve de slot) |

## Contraste verificado

- Branco sobre `#34C25C` (CTA): 2,4:1. Identidade aprovada do DS (texto 600, 15–17 px); registrado como risco conhecido em `evolucoes-app.md` (E-12, proposto).
- Texto de banners: `warningInk` sobre `warningSoft` = 3,9:1 e `dangerInk` sobre `dangerSoft` = 3,5:1 — **abaixo de 4,5:1** para legenda de 12 px. Aplicado: tokens `warningInkStrong` (#9A4A0F, 5,6:1) e `dangerInkStrong` (#B0352B, 5,5:1) para o texto; ícones mantêm o tom original (E-11).
- `infoInk` sobre `infoSoft`: 4,9:1 (ok). Branco sobre `ink900` (faixa offline, toasts): 17:1.
- Medidor de velocidade: sinal redundante (cor + número + texto "limite N" + Semantics), não depende só de cor.

## Texto (CONTENT FUNDAMENTALS)

Sem emoji, "você" em toda parte, caixa de frase respeitada. Correções aplicadas: A6 (unidade em inglês), M9 (plural), B3 (reticências). Nenhuma tela mostra km rodados; o recibo continua só com duração e valores.
