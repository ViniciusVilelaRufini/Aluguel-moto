# Volti — retirada em galpão (design)

Data: 2026-10-22 · Status: aprovado em conversa, aguardando revisão da spec escrita
Spec mãe: `docs/superpowers/specs/2026-10-21-volti-plataforma-design.md` (continua valendo onde esta não muda nada)

## 1. Por que

A Volti não é um serviço de achar moto na rua. As motos ficam num galpão da empresa: o cliente escolhe a moto no app, escolhe plano e seguro, retira no galpão e troca bateria no galpão ou nas estações. Esta spec troca o fluxo de "rua" (mapa com motos, escanear para andar, reserva de 15 min com rota a pé) pelo fluxo de galpão.

## 2. Decisões do usuário (2026-10-22)

| Tema | Decisão |
|---|---|
| Galpões | Um agora; o sistema nasce preparado para vários (todo dado carrega `depotId`). |
| Planos | Todos continuam: diário, semanal e mensal em destaque; minuto e hora em "Outras opções". Semanal e mensal seguem como assinatura (contrato v2). |
| Retirada | "Retirar agora" (moto separada por prazo curto) **ou** "Agendar" dia e hora. |
| Liberação | Operador separa e faz checklist de saída com fotos; o cliente confirma no app; aí a moto destrava. |
| Devolução | No galpão (checklist de chegada) **ou** num ponto verde (como hoje). |
| Bateria | Troca no galpão ou nas estações de bateria (`/swap-stations`, contrato v2). |
| Rua | Moto devolvida em ponto verde fica indisponível até o operador recolher ao galpão. A home não mostra motos na rua nem "Escanear para andar". |
| Design | Todas as telas seguem o Volti Design System do app (tokens, componentes, motion, pt-BR). Telas sem desenho pronto são compostas com componentes existentes, sem estilo novo. |

Padrões assumidos (o usuário não mudou): prazo de "retirar agora" = 120 min; agenda até 7 dias à frente; tolerância de 30 min após o horário agendado; o plano é cobrado na entrega, não na reserva.

Abordagem escolhida: **A — galpão como entidade própria, reserva de retirada e entrega formal** (alternativas B "reaproveitar zona/tarefa" e C "estação especial" rejeitadas por misturar conceitos e gerar retrabalho na expansão).

## 3. Fluxo do cliente (apps/cliente)

1. **Home** — mapa com o galpão (pino destacado, endereço, "Aberto até 20h"), pontos verdes de devolução e estações de bateria; sem motos na rua. Cartão fixo: "Galpão Volti · <bairro> · N motos disponíveis" + botão principal **Escolher moto**. Com vários galpões, o cartão vira seletor (mais perto primeiro). Com aluguel ativo, a home mostra o aluguel (tempo do plano, bateria, Trocar bateria, Devolver).
2. **Escolher moto** — lista do galpão (`GET /depots/{id}/vehicles`): foto e categoria do modelo, código, bateria/autonomia, preço por modelo. Sem distância a pé. Filtros por modelo. Botão **Continuar com <modelo> · <código>** (não reserva ainda).
3. **Plano** — diário, semanal, mensal em destaque com preço do período; "Outras opções" (por minuto, por hora) recolhidas. Semanal/mensal mostram "renova automaticamente, cancele quando quiser".
4. **Seguro** — tela própria: básico obrigatório pré-marcado e não removível; completo opcional; o que cada um cobre.
5. **Retirada** — "Retirar agora (até HH:MM)" ou "Agendar" (dia e hora dentro do funcionamento, até 7 dias). Resumo (plano, seguro, caução) e escolha da caução (cartão ou Pix; Pix pré-selecionado se não houver cartão). **Confirmar reserva** bloqueia a caução; o plano não é cobrado.
6. **Reserva confirmada** — QR da reserva, endereço com "Como chegar" (abre o app de mapas, iniciado pelo cliente), horário/prazo, Cancelar reserva (grátis até o horário). Push 30 min antes de vencer.
7. **Confira sua moto** — ao operador criar a entrega, o app recebe o evento e mostra fotos, checklist e bateria; **Aceitar e destravar** ou **Apontar problema** (abre suporte). Ao aceitar: aluguel começa, plano é cobrado, moto destrava, abre a corrida.
8. **Durante o aluguel** — corrida como hoje (velocímetro com limite, SOS, zonas). **Trocar bateria** lista galpão e estações.
9. **Devolução** — no galpão: operador faz checklist de chegada; cliente vê resultado e recibo. Em ponto verde: foto + travar, como hoje.

## 4. Dados e contrato (packages/contracts, só acréscimos)

### 4.1 Galpão — `Depot`
Campos: `id`, `name`, `address`, `lat`, `lng`, `timezone` (`America/Sao_Paulo`), `openingHours` (lista por dia da semana: `weekday` 0–6, `opensAt`/`closesAt` "HH:MM"; dia ausente = fechado), `pickupNowWindowMinutes` (padrão 120), `maxScheduleDays` (padrão 7), `scheduledGraceMinutes` (padrão 30), `swapStationId?`, `active`.
Endpoints: `GET /depots`, `GET /depots/{id}` (cliente e interno); `POST /depots`, `PATCH /depots/{id}` (admin, operacao); `GET /depots/{id}/vehicles` (cliente: só disponíveis; interno: todas, com filtro de status); `GET /depots/{id}/pickups?date=` (operacao, campo: agenda de retiradas).

### 4.2 Moto
- `Vehicle.depotId?` (galpão de origem/atual).
- Disponível no galpão = `status: free` com `depotId` preenchido (não cria status novo para não quebrar clientes).
- Novo valor em `VehicleStatus`: `awaiting_pickup` (devolvida em ponto verde, esperando recolhimento; não alugável).
- `reserved` passa a significar "separada para uma reserva de galpão".
- `GET /vehicles/nearby` deixa de ser usado pelo app do cliente (continua no contrato para o painel).

### 4.3 Reserva (estende `Reservation` / `ReservationCreate`)
- Novos campos: `depotId`, `pickupMode` (`now` | `scheduled`), `pickupAt?` (obrigatório em `scheduled`), `planCode`, `coverage`, `depositMethod` (`card` | `pix`), `cardId?`, `pickupCode` (QR assinado, curto, sem dado pessoal; só na resposta ao dono).
- `expiresAt`: `now` → criação + `pickupNowWindowMinutes`; `scheduled` → `pickupAt` + `scheduledGraceMinutes`.
- Validações no servidor: galpão ativo; horário dentro do funcionamento e de `maxScheduleDays`; moto `free` no `depotId`; KYC aprovado; cliente sem aluguel/reserva aberta; consentimento de localização para começar a corrida (regra existente).
- Confirmar: caução bloqueada (cartão: pré-autorização; Pix: depósito, regra existente) e moto `free → reserved` numa única transição condicional (corrida entre dois clientes → 409 `vehicle-unavailable`).
- Cancelar ou expirar (job): caução liberada, moto `reserved → free`. Cancelamento grátis.
- `ReservationStatus` ganha `handover` (entrega aberta) além de `active`, `converted`, `canceled`, `expired`.

### 4.4 Entrega — `Handover` (novo)
- Campos: `id`, `type` (`pickup` | `return_depot`), `depotId`, `reservationId?`, `rentalId?`, `vehicleId`, `operatorId`, `checklist` (itens `{ code, ok, note? }`), `photoKeys[]` (S3, prefixo `handovers/`), `batteryPct`, `batterySerial?`, `status` (`pending_customer` | `accepted` | `disputed` | `canceled`), `createdAt`, `respondedAt?`.
- Saída: operador lê o `pickupCode` → `POST /handovers` (operacao, campo) com checklist e fotos (upload presignado). Evento WebSocket `handover.pending` para o cliente.
- Cliente: `POST /handovers/{id}/accept` (Idempotency-Key) ou `POST /handovers/{id}/dispute` (motivo; abre ticket de suporte).
- Aceite (transação + idempotência por `handoverId`): cria o aluguel com o plano e o seguro da reserva, cobra o plano (assinatura para semanal/mensal), converte a reserva, publica o comando de destravar, moto `reserved → rented`. Falha de pagamento: nada muda, entrega continua `pending_customer` com o motivo; o operador vê. Resultado ambíguo do gateway: reconciliação existente.
- Chegada no galpão: `POST /handovers` com `type: return_depot` e `rentalId` encerra o aluguel (fechamento existente); moto → `free` no galpão, ou `maintenance` se o checklist apontar problema. O cliente vê o resumo e o recibo.

### 4.5 Devolução em ponto verde
Fluxo atual, mas a moto termina em `awaiting_pickup` e nasce uma tarefa de campo `collect` (recolher). Ao chegar no galpão, o operador registra a chegada (checklist curto) e a moto volta a `free` com o `depotId`.

### 4.6 Bateria
Troca no galpão (operador registra pelo número de série, endpoints de bateria do contrato v2) ou em estação (`/swap-stations`). A tela do cliente lista o galpão (via `swapStationId`) e as estações.

### 4.7 O que não muda
Regras de segurança (travar só abaixo de 3 km/h, velocidade desconhecida conta como movimento, 32 km/h, zonas 6/20), LGPD (rastreio só no aluguel com consentimento, trajetos 90 dias, export/exclusão — incluir reservas de galpão e entregas no export), dinheiro em centavos, cobrança idempotente, nenhum dado de cartão no backend.

## 5. Operador (apps/operador)
- Fila **Retiradas de hoje** (agenda do galpão), com reservas `now` e `scheduled` ordenadas por horário.
- **Ler QR da reserva** → checklist de saída com fotos e bateria → enviar; mostra "Aguardando o cliente" / "Aceito" / "Pagamento não aprovado" / "Problema apontado".
- **Chegada** (devolução no galpão e recolhimento da rua): checklist de chegada.
- Tarefas **Recolher** para motos `awaiting_pickup`.
- Só o primeiro nome do cliente.

## 6. Painel (apps/admin)
- Cadastro do galpão (endereço no mapa, horários por dia, prazos).
- **Agenda de retiradas** do dia e motos do galpão por status.
- Entregas com fotos e **disputas** (suporte resolve).
- Mapa da frota mostra galpão e motos `awaiting_pickup` destacadas.
- Grupos: admin/operacao editam o galpão; suporte vê entregas e disputas; financeiro vê cobranças.

## 7. Riscos e tratamento
- Reserva concorrente da mesma moto → transição condicional `free → reserved`; o segundo recebe 409 e volta à lista.
- Aceite duplicado ou rede caindo → idempotência por entrega; um aluguel, uma cobrança.
- Pagamento recusado no aceite → moto não destrava; entrega segue pendente com motivo.
- Horário inválido → servidor recusa com problem+json claro, mesmo que o app só ofereça horários válidos.
- Não comparecimento → job expira, libera caução, moto volta a `free`; push 30 min antes.
- Disputa de dano → fotos de saída e chegada guardadas e ligadas ao aluguel.
- Expansão → tudo com `depotId`; novo galpão é cadastro.

## 8. Testes
- API: unitários das regras (funcionamento, prazos, transições de moto/reserva/entrega, aceite idempotente); e2e do ciclo (reservar agora e agendado → entrega → aceite → corrida → troca de bateria → devolução no galpão; devolução em ponto verde → recolhimento); e2e de corrida (duas reservas simultâneas, aceite duplicado, pagamento recusado no aceite); expiração por job; export LGPD.
- App do cliente: widget tests das telas novas (home do galpão, lista, plano, seguro, retirada, reserva com QR, Confira sua moto), 200% de texto em 360×740, reduce motion, semântica.
- Operador e painel: fila de retiradas, checklist/aceite, cadastro de galpão e horários; Playwright no painel.
- Emulador: fluxo de ponta a ponta, como no teste de 2026-10-22.

## 9. Fora do escopo
Reserva de vários dias para várias motos; entrega em domicílio; galpão com autoatendimento sem operador; rota por ruas (proposta R2 continua aberta).
