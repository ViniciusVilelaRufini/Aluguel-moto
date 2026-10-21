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
- `useWalletCredits` no início do aluguel ainda não é consumido na liquidação (ver a proposta em `docs/decisoes.md`).

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
