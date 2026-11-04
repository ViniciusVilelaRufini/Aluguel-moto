# Volti — pré-reserva no app, contrato e pagamento no balcão do galpão (design)

Data: 2026-11-04 · Status: desenho escrito durante o loop da noite; decisões marcadas **(decisão do Claude)** podem ser corrigidas pelo dono.
Spec mãe: `docs/superpowers/specs/2026-10-22-volti-galpao-design.md` (continua valendo onde esta não muda nada).

## 1. Por que

O cliente precisa assinar um contrato de aluguel em papel no galpão. Por isso o app deixa de reservar com pagamento: ele mostra as motos do galpão e faz uma **pré-reserva** (sem caução, sem plano). Contrato, escolha do plano/seguro e pagamento acontecem no **balcão**; o atendente registra isso no sistema e o aluguel começa. Durante o aluguel o app continua como hoje (corrida, pausa, devolução, troca de bateria).

## 2. Decisões do dono (2026-11-03/04, em conversa)

| Tema | Decisão |
|---|---|
| App durante o aluguel | Continua (opção A): corrida, pausa, devolução e troca de bateria pelo app. |
| Início do aluguel | O atendente inicia no galpão depois do contrato assinado e do pagamento; o cliente **não** aceita nada no app. |
| Abordagem | 1 — reaproveitar a reserva de galpão e a entrega (`Handover`) que já existem. |
| Troca de bateria | Continua funcionando como hoje. |

## 3. Decisões do Claude (padrões assumidos; corrigíveis)

1. **Pré-reserva** separa uma moto específica (`free → reserved`) até o horário escolhido (agora = prazo `pickupNowWindowMinutes`; agendado = `pickupAt` + `scheduledGraceMinutes`). Sem caução, cancelamento grátis, expira sozinha (job existente).
2. **Plano e seguro** são escolhidos no balcão. O app mostra os preços só como referência ("Preços de referência; o plano é escolhido no galpão").
3. **Pagamento no balcão** é registrado pelo atendente: método `counter_card` (maquininha), `counter_pix` ou `cash`, valor em centavos e referência opcional (NSU/ID do Pix). Não passa por gateway; é um `Payment` com `status: paid` criado pelo atendente (auditado).
4. **Caução** opcional no balcão, registrada do mesmo jeito (`kind: deposit`); a devolução da caução é registrada no checklist de chegada.
5. **Planos no balcão**: diário, semanal e mensal **pré-pagos pelo período**. Semanal/mensal não renovam sozinhos no balcão (renovação = nova cobrança no balcão). Minuto e hora não aparecem no balcão nesta fase.
6. **Excedente** (passou do período, multa de zona, dano): vira débito do aluguel (`Payment` `pending` com `method` de balcão); o app mostra "Valor a acertar no galpão: R$ X". Quitação registrada pelo atendente. Cliente com débito aberto não pré-reserva de novo (regra `payment-pending` existente, com texto novo).
7. **Contrato**: o atendente fotografa o contrato assinado (1–4 fotos, upload presignado, prefixo S3 `contracts/`), ligado ao aluguel. Entra no export LGPD; segue a retenção dos dados do aluguel.
8. **Quem registra**: app do operador (fluxo de retirada) **e** painel (página Retiradas, para balcão com computador). Grupos `operacao` e `campo` (operador) e `admin`/`operacao` (painel).
9. **Carteira, pacotes de minutos, "Meu plano" (assinatura) e cartões** somem do app do cliente nesta fase (nada se paga no app). Os endpoints continuam no contrato (sem quebra); o app só esconde.
10. **Compatibilidade**: o servidor aceita `planCode`/`coverage`/`depositMethod` antigos na reserva (apps beta12) e os ignora, sem bloquear caução. O `POST /handovers/{id}/accept` antigo responde `409 handover-counter-checkout` com texto "O aluguel é iniciado pelo atendente no galpão.".
11. **Atalho de teste** "Retirar moto (teste)" (canal beta, `ALLOW_TEST_HANDOVER=true`) passa a simular o checkout do balcão com pagamento `cash` de teste, para a bancada.

### 3.1 Decisões do Claude após a revisão do builder (rodada 2)

12. **Fechamento do aluguel do balcão nunca usa o gateway.** Valor final = custo total − pré-pago no balcão. O excedente vira **débito em aberto** (`Payment` `kind: rental`, `status: pending`, `method` de balcão). `open-debt` passa a contar também os `pending` com método de balcão (bloqueia nova pré-reserva e a exclusão LGPD, como os `failed`); jobs de cobrança/retentativa **ignoram** métodos de balcão. Débitos `failed` antigos também podem ser quitados no balcão.
13. **Caução do balcão** é uma linha `Deposit` comum com `method` de balcão e `status: held` (o `Rental.depositId` continua obrigatório). Sem caução cobrada → `Deposit` de balcão com `amountCents: 0`. Na chegada (ou no painel), o atendente registra: abater o débito da caução (captura parcial) e/ou devolver o resto (`POST /deposits/{id}/counter-refund`). Nada é abatido automaticamente.
14. **Fim do período pré-pago**: o aluguel continua; o excedente conta por **dia iniciado** com o preço diário do modelo. O app avisa 1 h antes ("Seu período termina às HH:MM. O excedente é acertado no galpão."). O atendente pode vender **quantidade** do período (diária 1–30, semana 1–4, mês 1–3): `counter-quote` e `counter-checkout` recebem `quantity`. Estender um aluguel já iniciado = quitar o excedente no balcão (sem endpoint de extensão nesta fase).
15. **Elegibilidade**: a pré-reserva já exige KYC aprovado, termos vigentes e **consentimento de localização** (o contrato em papel não substitui o consentimento LGPD digital). Sem consentimento, o app pede antes de pré-reservar. Se o consentimento for revogado depois, `counter-checkout` responde `422` com o slug existente e o operador/painel mostra "Peça ao cliente para permitir a localização no app".
16. **Cliente sem pré-reserva** (balcão espontâneo): fora do escopo; o cliente faz a pré-reserva pelo celular no balcão (precisa de conta e KYC de qualquer jeito).
17. **O que já foi pago no app**: o dev só tem dados de teste; sem migração. As telas escondidas reaparecem só-leitura quando houver assinatura ativa ou saldo de carteira ("Fale com o galpão para usar ou cancelar"). Risco anotado para produção em `docs/decisoes.md`.
18. **Devolução na rua continua permitida** para aluguel do balcão. Acerto do excedente e devolução da caução ficam no **painel** (página do cliente/aluguel: "Acertar no balcão") e no checklist de chegada do galpão.

## 4. Abordagens consideradas

- **1. Reaproveitar reserva + entrega (escolhida pelo dono).** A reserva de galpão perde caução/plano; a entrega ganha o passo de balcão (contrato, plano, seguro, pagamento) e, ao confirmar, a API inicia o aluguel e destrava. Menor mudança; mantém vistoria, fotos, idempotência e a trava segura.
- 2. Recurso novo de pré-reserva com o fluxo antigo atrás de chave: reversível, mas duplica código e caminhos.
- 3. Só esconder o pagamento no app: falso — a API seguiria exigindo caução e aceite do cliente. Descartada.

## 5. Fluxo

### 5.1 Cliente (apps/cliente)
1. Home e "Escolher moto" como hoje (lista do galpão, preço por modelo).
2. **Pré-reservar**: escolhe agora ou agendado (mesmas regras de horário). Resumo: moto, galpão, horário, "Leve documento com foto. O contrato e o pagamento são feitos no galpão." Botão **Pré-reservar** (sem caução, sem plano, sem seguro).
3. **Pré-reserva confirmada**: QR, endereço, "Como chegar", prazo, Cancelar (grátis).
4. No galpão, enquanto o atendente prepara: tela "Sua moto está sendo preparada" (sem botão de aceitar). Quando o atendente conclui, o app recebe `rental.updated`/`handover.updated` e abre a corrida.
5. Corrida, pausa, devolução, troca de bateria: como hoje. Recibo mostra os pagamentos do balcão.
6. Débito aberto: faixa "Valor a acertar no galpão" na home e no histórico.

### 5.2 Balcão (apps/operador e apps/admin)
1. Lê o QR (ou abre a pré-reserva na agenda) → vistoria de saída (checklist, fotos, bateria) como hoje.
2. **Contrato e pagamento**: plano (diário/semanal/mensal), seguro (básico obrigatório, completo opcional), valor calculado pela API (preview), fotos do contrato assinado, método de pagamento, referência, caução opcional.
3. **Iniciar aluguel** → API cria o aluguel, registra os pagamentos, converte a reserva, destrava a moto (comando existente), entrega `accepted`.
4. Chegada no galpão: checklist como hoje + acerto de excedente e devolução de caução registrados.

## 6. Contrato (packages/contracts — só acréscimos; registrar em docs/decisoes.md)

- `ReservationCreate`: `planCode`, `coverage`, `depositMethod`, `cardId` deixam de ser obrigatórios na retirada em galpão (ignorados se vierem).
- `PaymentMethod` += `counter_card`, `counter_pix`, `cash`. `Payment` += `reference?` (string curta), `recordedBy?` (staff id, só interno).
- Novo `POST /handovers/{id}/counter-checkout` (staff: operacao, campo, admin; `Idempotency-Key` obrigatório). Corpo: `planCode` (`day|weekly|monthly`), `coverage`, `contractPhotoKeys[1..4]`, `payment { method, amountCents, reference? }`, `deposit? { method, amountCents, reference? }`. `amountCents` tem que bater com o preview (`422 counter-amount-mismatch`). Resposta: `Rental`.
- Novo `GET /handovers/{id}/counter-quote?planCode&coverage` (staff): valor do plano + seguro em centavos.
- `POST /handovers/uploads` aceita `purpose: contract` (prefixo `contracts/`).
- Novo `POST /payments/{id}/counter-settle` (staff; `Idempotency-Key`): quita um débito com método de balcão, ou abatendo da caução (`fromDepositId`).
- Novo `POST /deposits/{id}/counter-refund` (staff; `Idempotency-Key`): devolve a caução do balcão (valor ≤ retido).
- `counter-quote`/`counter-checkout` recebem `quantity` (inteiro, limites da decisão 14).
- `POST /handovers/{id}/accept`: passa a `409 handover-counter-checkout`.
- Realtime: sem evento novo (usa `handover.updated` e `rental.updated`).

## 7. Regras que não mudam

Segurança física (trava só abaixo de 3 km/h; velocidade desconhecida = movimento; 32 km/h; zonas 6/20), LGPD (rastreio só no aluguel com consentimento; trajetos 90 dias; export/exclusão — incluir fotos do contrato), dinheiro em centavos, datas UTC, idempotência de cobrança, nenhum dado de cartão no backend (o balcão não digita cartão: só método e referência), logs sem dados pessoais.

## 8. Testes

- API: pré-reserva sem caução (nova e com campos antigos); counter-quote; counter-checkout (sucesso, valor errado, idempotência/duplo toque, corrida com cancelamento/expiração, sem fotos de contrato → 422, moto já alugada); accept antigo → 409; débito e counter-settle; export LGPD com contrato; destravar via comando existente.
- App cliente: widget tests da pré-reserva, tela "sendo preparada" abrindo a corrida por evento, itens de pagamento escondidos, débito "a acertar no galpão".
- Operador: passo Contrato e pagamento (validações, preview, fotos). Painel: ação na página Retiradas (Playwright mock).
- Bancada/dev: atalho de teste do balcão inicia o aluguel da VLT-0059.

## 9. Fora do escopo

Contrato digital/assinatura eletrônica; maquininha integrada; renovação automática de semanal/mensal; planos por minuto/hora no balcão; migração de aluguéis já ativos (seguem como estão).

## 10. Deixado ao builder

Layout das telas novas com componentes do Volti Design System; nomes internos; ordem dos passos dentro da vistoria; migração Prisma (enum de método, colunas novas).
