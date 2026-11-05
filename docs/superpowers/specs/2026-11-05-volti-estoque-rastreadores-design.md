# Volti — estoque de rastreadores e instalação na moto pelo painel

Data: 2026-11-05. Status: abordagem escolhida pelo dono (A); demais decisões do coordenador.

## Por quê

Hoje um rastreador GT06/J16 só entra no sistema pelo script `gt06.sh provision` (CloudShell + SSM), que grava o
`Tracker`, vincula à moto e cria o aparelho no Traccar com a senha de admin. O dono cadastra o rastreador **antes** e o
**instala** numa moto depois (estoque, como o chip). Ele quer fazer isso pelo painel, de forma **fácil e didática**,
sem nada complexo.

## Objetivos

1. **Aba "Rastreadores"** na área Motos: lista dos rastreadores GT06 com IMEI, modelo, chip, moto onde está instalado
   (ou "No estoque") e sinal (online/offline, último sinal).
2. **Cadastrar rastreador** (assistente de 2 passos, texto explicativo em cada passo):
   1. Aparelho: IMEI (15 dígitos, com dica "está na etiqueta do aparelho ou no `PARAM#`") e modelo (lista; hoje só "J16").
   2. Chip: escolher um chip do estoque, cadastrar um novo ali mesmo, ou "Pular — vincular depois".
3. **Ficha da moto (painel lateral de Motos e ficha da Frota ao vivo)**, bloco **"Rastreador e chip"**:
   - Sem rastreador: "Esta moto não tem rastreador." + botão **Instalar rastreador** (escolhe um do estoque; atalho
     "Cadastrar novo" abre o mesmo assistente e instala ao final).
   - Com rastreador: IMEI, modelo, chip, sinal + botões **Trocar** (escolhe outro do estoque; o atual volta ao estoque) e
     **Remover** (volta ao estoque). Confirmação em linguagem simples antes de trocar/remover.
   - As seções **Chip** e **Console do rastreador** (já existentes na Frota ao vivo) passam a aparecer também no painel
     lateral de Motos.
4. **Traccar automático:** ninguém mais precisa do CloudShell para um J16 novo. A ponte cria/renomeia o aparelho no
   Traccar sozinha.

## Não objetivos

- Rastreadores `speed_control` (MQTT, certificado X.509): continuam pelo script de provisionamento.
- Excluir rastreador do sistema (só "remover da moto" → estoque). Baixa definitiva fica para depois.
- Integração com operadora; leitura de IMEI por câmera/QR.

## Anti-objetivos

- Instalar, trocar ou remover rastreador de moto **em aluguel ou reserva em uso** (perderia trava remota no meio do uso):
  recusado, como o script faz hoje.
- Instalar/trocar com **trava em andamento** na moto: recusado.
- Rastreador com o mesmo IMEI em duas motos, ou duas motos com o mesmo rastreador.
- Senha de admin do Traccar na API.
- Tela complicada: no máximo 2 passos, linguagem de operação ("instalar", "estoque"), sem termos como thingName.

## Restrições

- Contrato primeiro (`packages/contracts`), decisão em `docs/decisoes.md`; pt-BR na interface; logs sem dados pessoais
  (IMEI mascarado: só os 4 últimos dígitos, como no script); auditoria em toda escrita.
- Permissões: listar rastreadores — `admin`, `operacao`, `suporte`; cadastrar/instalar/trocar/remover — `admin`,
  `operacao` (instalação é trabalho de operação de campo); console continua só `admin`.

## Abordagens consideradas

- **A (escolhida pelo dono):** aba Rastreadores (estoque) + bloco "Rastreador e chip" na ficha da moto.
- B: campo "Rastreador" dentro de Cadastrar/Editar moto — não mostra estoque, mistura cadastro de moto e aparelho.
- C: só um assistente "Instalar" na ficha — rápido, mas sem estoque (contra o jeito de trabalhar do dono).

## Como (decidido)

**Identidade.** `Tracker.thingName` continua único e é o nome usado na ponte/MQTT. Rastreador **no estoque** recebe
`thingName = gt06-<IMEI>` e `vehicleId = null`. Ao **instalar**, `thingName` passa a ser o `Vehicle.thingName` da moto
(formato `moto-NNNN`, que a moto já tem) e `vehicleId` = moto. Ao **remover**, volta a `gt06-<IMEI>` e `vehicleId = null`.
Trocar = remover o atual + instalar o novo numa única transação.

**Regras (API, dentro da transação, como o `provision-gt06`):** recusar (409, mensagem pt-BR) se a moto tem aluguel aberto
ou reserva ativa/em entrega; se há trava em andamento (mesma checagem do script no Redis da API); se o rastreador já está
em outra moto; se a moto já tem outro rastreador (usar "Trocar"); IMEI repetido no cadastro. Rastreador antigo com
`certificateArn` (MQTT) não aparece nem pode ser trocado por aqui.

**Ponte (traccar-bridge).** (1) Relê o registro (`imei`, `thingName` dos `relay_only` com IMEI) **a cada 30 s**, sem
reiniciar: IMEI novo passa a ser atendido; `thingName` trocado move o mapeamento (pendentes de console daquela moto
falham com `erro`, como na troca de IMEI). (2) Para cada IMEI do registro sem aparelho no Traccar visível ao usuário da
ponte, **cria** o aparelho (`uniqueId = IMEI`, nome = `thingName`); se o nome difere do `thingName`, **renomeia**. O
usuário da ponte no Traccar precisa poder criar/editar aparelhos (sem `deviceReadonly`, limite de aparelhos ilimitado):
`gt06.sh init` passa a garantir isso; o resto do acesso dele não muda.

**Sinal no estoque.** Telemetria de `gt06-<IMEI>` não tem moto: a API já a ignora para trajeto/estado; a lista de
rastreadores mostra online/último sinal a partir do estado ao vivo por `thingName` (mesma fonte do `lastSeenAt` da moto).
Isso permite testar o J16 na bancada antes de instalar.

**Contrato (nomes indicativos; o plano fixa).** `GET /trackers` (filtros: `q` por IMEI, `installed` true/false),
`POST /trackers` (cadastrar: `imei`, `model`, `simCardId?`), `POST /vehicles/{id}/tracker` (instalar/trocar:
`trackerId`), `DELETE /vehicles/{id}/tracker` (remover para o estoque). `Tracker` no contrato: `id`, `imei`, `model`,
`installed`, `vehicleId`, `vehicleCode`, `simCard` (resumo), `online`, `lastSeenAt`. O vínculo de chip continua pelo
`/sim-cards` (que hoje vincula por `vehicleId`; passa a aceitar também `trackerId`, para chip em rastreador do estoque).

**Modelo do aparelho.** Coluna nova `Tracker.model` (texto curto; valores na API: `J16`). Rastreadores existentes GT06
recebem `J16` na migração.

## Fica para o construtor

Layout exato dos passos e dos botões seguindo o design system do painel; textos de ajuda curtos; estado vazio da aba
("Nenhum rastreador cadastrado. Cadastre o primeiro para poder instalar nas motos."); paginação simples se passar de
200 itens.

## Decisões após a leitura do construtor (coordenador)

1. **Sinal no estoque.** A API descarta telemetria de `thingName` sem moto antes do estado ao vivo
   (`telemetry.service.ts`). Em vez de criar estado ao vivo para elas, a API grava `Tracker.lastSeenAt` (coluna nova) quando
   chega telemetria/status de um `thingName` `gt06-…` do estoque, no máximo a cada 15 s por rastreador, sem nenhum outro
   efeito (nada de trava, cerca ou trajeto). Rastreador instalado usa o `lastSeenAt` da moto. Online = sinal nos últimos
   180 s.
2. **Normalização.** A migração renomeia para `gt06-<IMEI>` os `Tracker` `relay_only` com IMEI e sem moto. A lista mostra
   só rastreadores `relay_only` com IMEI e sem `certificateArn`; `speed_control` órfãos ficam como estão, fora da lista.
3. **Edição da moto.** `PATCH /vehicles/{id}` com `thingName` diferente é recusado (409) quando a moto tem rastreador
   instalado.
4. **Ponte.** A releitura já existe (`REGISTRY_REFRESH_MS`, 60 s): o padrão passa a 30 s. Depois de reler, a ponte cria no
   Traccar o aparelho de IMEI sem aparelho visível e renomeia o de nome diferente do `thingName`; criou algum → pede a
   reabertura do WebSocket (respeitando o intervalo mínimo existente), para o aparelho novo passar a chegar. Atraso aceito:
   até ~1 min entre cadastrar e aparecer online. `gt06.sh init` passa a garantir (idempotente, com o admin do Traccar) que
   o usuário da ponte pode criar/editar aparelhos (`deviceReadonly: false`, `deviceLimit: -1`); vale para ambiente já
   existente porque o `init` roda em todo `update`. A ponte não lê `Tracker.model` (sem GRANT novo).
5. **Chips.** `/sim-cards` aceita `trackerId` (vincular a rastreador do estoque); `vehicleId` e `trackerId` juntos → 400.
   Ao remover o rastreador da moto, o chip continua com o rastreador.
6. **Console no painel de Motos.** Oculto para quem não é `admin` (mesma regra da Frota ao vivo).
