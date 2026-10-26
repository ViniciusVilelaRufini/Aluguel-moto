# Pagamentos, caução e seguro

Módulos `payments`, `wallet` e `insurance` de `services/api` (Task 5, agente 4). Todo valor é em centavos (`int`). O backend nunca vê número, CVV ou validade completa do cartão: só o token gerado no app pelo SDK do gateway e o id do cartão no gateway.

## Peças

| Peça | Arquivo | Papel |
|---|---|---|
| `PaymentProvider` | `payments/provider/payment-provider.ts` | Interface do gateway: criar cliente, cadastrar token de cartão, pré-autorizar, capturar, cancelar pré-autorização, cobrar, estornar, Pix com expiração, cancelar Pix, assinatura recorrente (semanal/mensal), cancelar assinatura, consultar pagamento, validar webhook. |
| `FakePaymentProvider` | `payments/provider/fake-payment-provider.ts` | Em memória, para dev e testes (`PAYMENT_PROVIDER=fake`). |
| `MercadoPagoPaymentProvider` | `payments/provider/mercadopago-payment-provider.ts` | REST do Mercado Pago com `fetch` (`PAYMENT_PROVIDER=mercadopago`). |
| `PaymentStateService` | `payments/payment-state.service.ts` | Única forma de mudar `Payment.status` (valida a máquina de estados, update condicional, evento `payment.updated`). |
| `RentalBillingService` | `payments/rental-billing.service.ts` | Implementa a porta `RentalBillingPort` (caução, liquidação, inadimplência) e consome `deposit.release-requested`. |
| `WebhookProcessor` | `payments/webhook-processor.service.ts` | Consome a fila `pagamentos-webhook` com deduplicação por `eventId`. |
| `SubscriptionsService` | `payments/subscriptions.service.ts` | Assinaturas semanal e mensal. |
| `ReceiptService` + `InvoiceIssuer` | `payments/receipts/` | Recibo em PDF no bucket de relatórios e NFS-e (`MockInvoiceIssuer`). |
| `WalletService` | `wallet/wallet.service.ts` | Recargas e pacotes de minutos em ledger somente inserção. |
| `InsuranceService` + `InsuranceProvider` | `insurance/` | Implementa a porta `InsurancePort`; `MockInsuranceProvider` cota, emite apólice (por aluguel ou período), cancela, abre sinistro e recebe o repasse. |

## Máquina de estados de `Payment`

```
                 ┌──────────► authorized ──┬──► captured ──┬──► refunded
                 │                         │               └──► partially_refunded ─┬──► partially_refunded
   pending ──────┤                         └──► canceled                            └──► refunded
                 │
                 ├──────────► paid ──────────┬──► refunded
                 │                           └──► partially_refunded (→ partially_refunded | refunded)
                 │
   pending | authorized ──► failed
```

| De | Para | Quando |
|---|---|---|
| `pending` | `authorized` | Pré-autorização da caução aprovada no cartão |
| `authorized` | `captured` | Liquidação captura o valor do aluguel (total ou parcial; o gateway libera o resto) |
| `authorized` | `canceled` | Caução liberada (aluguel não começou, valor zero ou cobrança direta do total) |
| `pending` | `paid` | Cobrança direta aprovada, Pix pago (webhook), primeira cobrança de assinatura |
| `paid`, `captured` | `refunded`, `partially_refunded` | Estorno pelo painel, sobra da caução Pix, Pix pago depois de liberado |
| `partially_refunded` | `partially_refunded`, `refunded` | Estornos parciais seguintes |
| `pending`, `authorized` | `failed` | Recusa do gateway, Pix cancelado ou expirado, falha de captura |

Estados terminais: `canceled`, `refunded`, `failed`. O `* → failed` do plano vale só para os estados não terminais. Qualquer outra transição lança `InvalidPaymentTransitionError` (por exemplo, `capture` de `canceled`). Mapeamento do Mercado Pago:

| Mercado Pago | Local |
|---|---|
| `pending`, `in_process`, `in_mediation` | `pending` |
| `authorized` | `authorized` |
| `approved` | `paid`; `captured` se veio de pré-autorização; `partially_refunded` se `status_detail` indicar |
| `rejected` | `failed` |
| `cancelled` | `canceled`; `failed` (`pix_expired`) se o pagamento local ainda era `pending` |
| `refunded`, `charged_back` | `refunded` |

Tipos de pagamento (`kind`): `deposit` (caução: cartão `pending → authorized → captured | canceled`, Pix `pending → paid → refunded | partially_refunded`), `rental` (liquidação), `top_up` (carteira), `subscription`, `fee`.

## Fluxo do aluguel

**Início (`holdDeposit`):** chave `deposit:<customerId>:<Idempotency-Key>` (decisão #17), única em `Deposit` e em `Payment` e repassada ao gateway (`X-Idempotency-Key`). A repetição devolve a mesma resposta sem chamar o gateway; chamadas concorrentes esperam a primeira.

- **Cartão:** pré-autoriza a taxa `deposit` (5000) no cartão padrão. Aprovado → caução `held` e `Payment` `authorized`. Recusado, ou sem cartão → caução `failed` e o aluguel responde `402 payment-failed`.
- **Pix:** cria a cobrança com QR e copia e cola, válida por `PIX_EXPIRATION_MINUTES` (15). Caução `awaiting_pix`; o aluguel responde `202 awaiting_deposit` (decisão #1). O webhook do Pix pago muda a caução para `held`.

**Encerramento (`settle`):** chave `rental-settlement:<rentalId>`, no máximo uma liquidação por aluguel.

| Situação | Ação | Resultado |
|---|---|---|
| Valor 0 | Libera a caução (cancela a pré-autorização ou estorna o Pix) | `paid` (0) |
| Cartão, valor ≤ caução | Captura parcial da pré-autorização; o gateway libera o restante | `paid`; caução `captured` com `capturedCents` |
| Cartão, valor > caução | Cobra o total no cartão e cancela a pré-autorização | `paid`; caução `released` |
| Cartão, valor > caução e cobrança recusada | Captura a caução inteira como garantia | `failed` e cliente inadimplente |
| Pix pago, valor ≤ caução | Estorna a sobra (caução − valor) | `paid`; Pix `partially_refunded` |
| Pix pago, valor > caução | Fica com o Pix e cobra o restante no cartão | `paid` ou `failed` (sem cartão ou recusa) |
| Falha de captura ou cobrança | — | `Payment` `failed`, `Customer.delinquent = true`, `isDelinquent` → `true` |

Um cliente inadimplente recebe `403 customer-delinquent` ao tentar novos aluguéis e reservas (`assertCustomerEligible`). Se o gateway falhar no meio (rede, 5xx), o pagamento fica `pending`. Um job (`JOBS_ENABLED`, a cada 5 min) retoma liquidações `pending` com mais de 2 min, usando as mesmas chaves, sem cobrar duas vezes. Depois do `paid`, o repasse do seguro e o recibo são registrados (falhas nesses dois só geram log).

**Caução que não virou aluguel** (evento `deposit.release-requested`, decisão #16):

- cartão → cancela a pré-autorização;
- Pix pendente → cancela a cobrança (`failed`);
- Pix pago → estorno total.

Se já existe aluguel com a caução, o pedido é ignorado. Pix pago depois da liberação (webhook atrasado) → estorno automático (`late-pix-refund:<paymentId>`).

### Liquidação retomável (fix round 1)

- **Plano gravado.** Na primeira execução, o plano é decidido e gravado em `SettlementProgress`: `zero`, `card_capture`, `card_charge`, `pix_keep`, `pix_keep_charge` ou `charge_only`.
  - Repetições seguem esse plano e os passos já concluídos (`capture`, `charge`, `release`, `refundExcess`, `depositKept`).
  - O plano nunca é recalculado pelo estado atual da caução. Assim, uma captura feita antes de uma queda não vira cobrança extra na retomada.
- **Chave por passo.** Cada passo no gateway usa uma chave estável: `<rental-settlement:id>:<passo>`, com `:a<n>` a partir da 2ª tentativa de cobrança recusada. O passo é gravado assim que o gateway responde.
- **Lease.** `leaseOwner` + `leaseUntil` (2 min) garantem um executor por vez. Uma chamada concorrente da porta espera o resultado; o job pula liquidações com lease válido.
- **Cobrança ou captura recusada.**
  - O cliente fica inadimplente na hora e a porta responde `failed`, mas o `Payment` fica `pending`.
  - O job retenta até `MAX_COLLECTION_ATTEMPTS` (3), no máximo a cada 5 min.
  - Na última tentativa:
    - captura → cancela a pré-autorização (caução `released`, nada fica pendurado);
    - cobrança acima da caução → captura a caução inteira como garantia.
  - Depois disso o `Payment` vira `failed` e a dívida continua como inadimplência.
  - Sem cartão: falha definitiva na hora.
  - Retentativa que passa → `paid`, e a inadimplência é removida se não houver outra dívida.
- **Liberação de caução.** Só vira `released` com confirmação do gateway (pagamento da caução `canceled`, `failed` ou `refunded`). Sem confirmação, o estado fica como está e o pedido entra em `DepositRelease`, retentado por job a cada 5 min.
- **Valor capturado.** O valor efetivamente capturado da caução fica em `PaymentCapture` e é o teto do estorno.
- **Estorno.**
  - O valor é reservado com update condicional (status + `refundedCents` lidos), na mesma transação do lançamento da carteira.
  - Só depois o gateway é chamado, com chave `refund:<paymentId>:<Idempotency-Key>`.
  - Se o gateway falhar, a reserva é desfeita.
  - Estorno concorrente → `409`.

### Resultados ambíguos do gateway (fix round 2)

**Recusa vs. resultado desconhecido.**
- Só conta como tentativa uma **recusa genuína**: o gateway respondeu e recusou (Mercado Pago 200/201 com `rejected`).
- Qualquer outro desfecho de captura ou cobrança é **resultado desconhecido** e lança `PaymentProviderError`: 4xx (já capturado, chave repetida com corpo diferente), 5xx ou timeout.
- Resultado desconhecido não conta tentativa e não troca a chave.

**Conferir antes de repetir.**
- **Captura:** consulta `getPayment` da pré-autorização. Se já está `captured`, grava o passo e conclui.
- **Cobrança:** procura com `searchPayments` um pagamento aprovado com `external_reference = Payment.id` e o mesmo valor.
- **Cancelar na última tentativa:** confere antes de cancelar. Se a captura entrou, a liquidação é paga.
- **Garantia:** confere antes de capturar a caução.
- **Liberação:** com resultado desconhecido, decide pelo estado no gateway.

**Token do cartão.** É criado uma vez por tentativa (`createCardToken`) e gravado em `steps.chargeTokens` antes da cobrança. A repetição do mesmo passo manda corpo idêntico com a mesma chave.

**Estacionar.** Cada execução que termina em erro incrementa `errorRuns`. Ao chegar em `MAX_ERROR_RUNS` (5), a liquidação é marcada com `parkedAt`/`parkedReason`: o job para de tentar e o log `payment_needs_manual_review` é registrado.

**Estornos (`PaymentRefund`).**

| Estado | Significado |
|---|---|
| `claimed` | Reserva gravada, gateway ainda não chamado |
| `pending` | Resultado desconhecido |
| `succeeded` | Estorno confirmado |
| `rejected` | Recusa definitiva (`RefundRejectedError`, Mercado Pago 400/404): a reserva é desfeita e a API responde 422 |
| `needs_review` | Revisão manual |

- Timeout mantém a reserva; a API responde 200 com o pagamento já reservado.
- O job `reconcileRefunds` (5 min) trata `claimed` e `pending`:
  - se o gateway já mostra o valor estornado → `succeeded`;
  - senão repete com a mesma chave;
  - depois de 10 tentativas → `needs_review`.

### Cobrança em análise, estorno único em aberto e webhooks da liquidação (fix round 3)

- **Cobrança ou captura em análise.** No Mercado Pago, `pending`, `in_process` e `in_mediation` mapeiam para `pending` local, e esse estado não é recusa.
  - O passo grava `chargeInReview = <id>`, não conta tentativa, não deixa o cliente inadimplente e não troca a chave.
  - Cada execução seguinte só consulta `getPayment(id)`, sem cobrar de novo.
  - Aprovada → passo concluído. Recusada → conta como uma recusa.
  - A conciliação por `external_reference` também encontra pagamentos em análise.
  - Enquanto espera, a porta responde `failed` (o contrato da porta só tem `paid` ou `failed`) e o `Payment` continua `pending`.
- **Estorno.**
  - Só um pedido em aberto (`claimed` ou `pending`) por pagamento; um novo pedido nesse período recebe `409`.
  - O id do estorno no gateway fica gravado em `providerRefundId`.
  - Um rollback que não encontra a reserva exatamente como foi deixada marca o pedido `needs_review`, nunca `rejected`.
- **Webhook de liquidação pendente.** O webhook **nunca** muda o `Payment` do aluguel diretamente.
  - Se o motor está esperando exatamente aquele pagamento (`chargeInReview`), o webhook dispara uma execução do motor sob o lease.
  - Caso contrário, é ignorado.
  - Liquidação estacionada não é tocada.
- **Mercado Pago.** Um 400 ou 404 na leitura (`GET`) feita depois de um estorno aceito é resultado desconhecido, não recusa.
- **Execuções com erro.** O contador `errorRuns` volta a 0 quando um passo é gravado. Se a gravação do erro falhar, o erro original é preservado e logado.

### Análise com prazo, garantia em análise e recusa explícita (fix round 4)

- **Prazo da análise.** Quando uma cobrança ou captura entra em análise, o motor grava o início (`steps.chargeInReviewSince` ou `steps.captureInReviewSince`, ISO). Cada execução seguinte (job ou webhook) compara com o relógio: passados `PAYMENT_REVIEW_MAX_DAYS` dias (padrão 7), a liquidação é estacionada com `parkedReason = review_timeout`. Antes do prazo, a espera continua como antes (sem nova cobrança, sem inadimplência). O início é apagado quando a análise termina.
- **Sinal de revisão manual.** Todo estacionamento (erros repetidos, `review_timeout`, estado inesperado no gateway) emite o par: log `payment_needs_manual_review` e evento interno `payment.needs-review` `{ paymentId, rentalId?, reason }` (`payments/payment-review.ts`). Um consumidor de alerta pode ser ligado nesse evento sem mexer no motor.
- **Estacionada vira dívida pagável (2026-10-26).** Ao estacionar por erros repetidos, o `Payment` do aluguel não fica `pending` para sempre: passa a `failed` com `failureReason: settlement_parked` (dívida em aberto de `open-debt.ts`, saldo = bruto − carteira − caução capturada, quitável em `POST /payments/{id}/retry`), o cliente fica inadimplente e o registro sai da fila (`finishedAt`); o sinal de revisão continua. Caução ainda `held` é resolvida antes: cartão pelo `getPayment` (`captured` → captura registrada, abate a dívida ou paga tudo; `authorized` → liberada; recusada/cancelada → liberada localmente; outro estado → revisão; por isso a estacionada por `preauthorization_unexpected_status` não vira dívida); Pix → passo do `pix_keep` (estorno do excedente, retenção). Nunca cobrar duas vezes: com cobrança/captura/garantia em análise (sempre o caso do `review_timeout`, que **não** vira dívida), com cobrança não recusada achada pela referência externa, ou sem resposta do gateway, fica `pending` (log `settlement_parked_pending_review`). Sem resposta, o job tenta só a conversão de novo, com recuo exponencial (5 min dobrando até 6 h, contado em `errorRuns`; após 10 tentativas, log de erro `settlement_parked_stuck`); lê até 1000 estacionadas por execução e fecha as cujo `Payment` já saiu de `pending`.
- **Garantia em análise.** Na última tentativa do `card_charge`, se a captura da caução como garantia volta `pending`, o motor **não cancela** a pré-autorização: grava `steps.guaranteeCaptureInReview = true`, registra as tentativas e deixa o pagamento `pending`. As execuções seguintes só consultam `getPayment` da pré-autorização:
  - capturada → caução `captured` e a liquidação termina `failed` (a dívida restante continua como inadimplência);
  - recusada ou cancelada → a pré-autorização morreu: Payment da caução `failed`/`canceled`, caução `released` localmente, liquidação `failed` (nada é cancelado no gateway, porque não existe mais);
  - em análise → espera, com o mesmo prazo;
  - qualquer outro estado → estacionada.
- **Captura parcial em análise (`card_capture`).** Mesmo tratamento: espera com prazo, nunca cancela; aprovada → `paid`; recusada depois da análise → pré-autorização morta (acima), liquidação `failed` e inadimplência.
- **Recusa explícita.** Para uma cobrança vista em análise, só `failed` (Mercado Pago `rejected`) e `canceled` (`cancelled`) contam como recusa e liberam a próxima tentativa (`:a1`). `refunded`, `partially_refunded`, `authorized` ou qualquer outro estado estaciona a liquidação para revisão, sem nova cobrança.
- **Webhook do Payment da caução.** Um webhook da pré-autorização (externalReference = id do Payment da caução) também acorda a liquidação do aluguel que espera a captura dessa caução (parcial ou garantia), além de registrar o estado no Payment da caução.
- **Job de retomada.** Lê `SettlementProgress` com `parkedAt IS NULL` e `finishedAt IS NULL`, sem lease válido e sem movimento há 2 min, em ordem de `updatedAt` crescente (50 por rodada). `finishedAt` é gravado quando a liquidação termina (`paid` ou `failed` definitivo); se uma queda deixar o carimbo faltando, o job fecha o registro ao encontrá-lo. Sem isso, 50 liquidações antigas tomariam a página inteira e nenhuma pendente seria retomada (o e2e pegou exatamente isso). Pagamentos `pending` que caíram antes de ganhar o registro entram por uma segunda consulta. Migração `20261021230000_payments_settlement_finished` (coluna, índice e backfill).
- **Estorno com a mesma chave.** Repetir `POST /payments/{id}/refund` com a mesma `Idempotency-Key` enquanto o pedido anterior está em aberto (ou já concluído) devolve `200` com o estado atual do pagamento, sem reservar nem chamar o gateway. Chave diferente com outro pedido em aberto continua `409`. Mesma chave de um pedido recusado → o mesmo `422`; em revisão manual → `409`.

## Webhook do Mercado Pago

1. `POST /webhooks/mercadopago` é público. O endpoint valida `x-signature` (`ts=<epoch>,v1=<hex>`; `ts` fora de ±`MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS`, padrão 300, é rejeitado) com HMAC-SHA256 sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. A chave é `MERCADOPAGO_WEBHOOK_SECRET` e a comparação é em tempo constante; o `data.id` vai em minúsculas.
2. Assinatura inválida ou ausente → `401 webhook-signature-invalid`, e nada é enfileirado.
3. Evento válido → enfileirado no `QueueBus` (`pagamentos-webhook`, SQS na AWS) como `{ provider, eventId, type, action, dataId }`, com `dedupId = eventId` (o `id` da notificação).
4. O `WebhookProcessor` faz o processamento:
   - ignora eventos já gravados em `ProcessedWebhook` (`provider` + `eventId` únicos);
   - consulta o estado no gateway (`getPayment`), nunca no corpo do webhook;
   - registra o evento e aplica a transição.
5. A transição é condicional. Pagamento no mesmo estado → nada muda. Se o efeito falhar, o registro é apagado para a reentrega da fila tentar de novo.
6. Efeitos por tipo de pagamento:
   - Pix da caução pago → caução `held`;
   - recarga paga → um lançamento no ledger (claim `pending → paid` na `TopUp`);
   - cobrança recorrente (`external_reference = subscription:<id>`) paga → renova o período;
   - cobrança recorrente recusada → assinatura `past_due` e cliente inadimplente.

## Carteira

- `WalletEntry` é somente inserção, e o saldo é a soma dos lançamentos (`appendWalletEntry`). Nenhum código faz `update` ou `delete` do ledger, e um teste confere isso varrendo o código.
- Lançamentos:

  | Tipo | Quando |
  |---|---|
  | `top_up` | Recarga |
  | `minute_package` | Pacote de minutos (minutos, sem crédito em reais) |
  | `adjustment` | Ajuste do financeiro (com AuditLog) |
  | `refund` | Estorno de pagamento feito pela carteira |
  | `rental_charge` | Consumo no aluguel |

- **Recarga no cartão:** cobra na hora. Se recusada → `402 payment-failed` e nenhum lançamento.
- **Recarga Pix:** o lançamento só entra quando o webhook confirma o pagamento.
- **Fechamento (R2-01, lacunas Task 16):** o saldo da carteira sempre abate primeiro (`rental_charge` gravado na transação que fecha o aluguel, linha `wallet` no `breakdown`); depois caução, cartão salvo e, sem cartão, dívida paga por Pix no app. `useWalletCredits` está `deprecated` e é ignorado.

## Seguro

- `basic` (200) é obrigatório e nunca é desativado. `full` (600) é opcional e configurável (`PUT /insurance/coverages/{coverage}`).
- Aluguel sem cobertura válida → `422 insurance-required`, e nenhuma apólice é emitida.
- `issueForRental` emite a apólice no parceiro (`providerPolicyId`) e devolve o prêmio. O aluguel soma o prêmio ao valor (`insuranceCents` no breakdown).
- Com o aluguel pago, o repasse do prêmio à seguradora é registrado: `InsuranceRemittance` (um por apólice), `InsurancePolicy.payoutCents` e a chamada `remit` no parceiro. Esses números aparecem no relatório financeiro (`insurancePayoutsCents`).
- A venda é da seguradora registrada na SUSEP; a Volti só intermedia via API.

## Recibo e NFS-e

O PDF (pdfkit) é gerado para cada pagamento liquidado:

- caminho no bucket `S3_BUCKET_REPORTS` (`relatorios`): `recibos/<aaaa>/<mm>/<rentalId>.pdf`;
- o objeto é registrado em `PaymentReceipt`;
- `Payment.receiptUrl` recebe uma URL assinada de 7 dias, devolvida em `GET /rentals/{id}/receipt` como `pdfUrl`.

O PDF não leva CPF, e-mail nem trajeto. A NFS-e é emitida pelo `InvoiceIssuer` (`INVOICE_ISSUER=mock`) e gravada em `Invoice`, uma por pagamento e só para valores acima de zero.

## Variáveis

| Variável | Padrão | Uso |
|---|---|---|
| `PAYMENT_PROVIDER` | `fake` só com `NODE_ENV` development/test | `fake` ou `mercadopago`. Sem valor fora de dev/test, a API não sobe (falha fechada). |
| `MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS` | `300` | Janela do `ts` da assinatura do webhook |
| `PAYMENT_REVIEW_MAX_DAYS` | `7` | Dias que uma cobrança/captura pode ficar em análise no gateway antes de a liquidação ser estacionada (`review_timeout`) |
| `MERCADOPAGO_ACCESS_TOKEN` | — | Obrigatória com `mercadopago` (Secrets Manager na AWS) |
| `MERCADOPAGO_WEBHOOK_SECRET` | — | Assinatura do webhook (sem ela, todo webhook dá 401) |
| `MERCADOPAGO_API_BASE_URL` | `https://api.mercadopago.com` | Sobrescreve a URL da API |
| `PIX_EXPIRATION_MINUTES` | `15` | Validade do Pix |
| `FAKE_PIX_AUTOCONFIRM_SECONDS` | `10` | Só no fake: o Pix "é pago" sozinho e entra pela fila como um webhook (0 desliga). Aceita o nome antigo `STUB_PIX_AUTOCONFIRM_SECONDS`. |
| `INSURANCE_PROVIDER` | `mock` | Parceiro de seguro |
| `INVOICE_ISSUER` | `mock` | Emissor de NFS-e |
| `S3_BUCKET_REPORTS` | `relatorios` | Bucket dos recibos |

**Fake em dev:**

- cartão `tok_..._fail_charge` → pré-autoriza, mas recusa captura e cobrança (testa a inadimplência);
- token com `fail` → cartão recusado no cadastro.

## Testes

- `pnpm --filter api test -- payments insurance wallet`: unitários sem banco. Usam o Prisma em memória de `payments/testing/in-memory-prisma.ts`, que reproduz as restrições únicas (P2002).
- `pnpm --filter api test:e2e`: `test/payments.e2e-spec.ts` roda com `PAYMENT_PROVIDER=fake` contra Postgres, Redis e MinIO. Cobre:
  - caução, captura, recibo no MinIO, NFS-e e repasse;
  - Pix confirmado por webhook assinado, com dedup;
  - falha de captura → 403 no próximo aluguel;
  - recarga da carteira.
