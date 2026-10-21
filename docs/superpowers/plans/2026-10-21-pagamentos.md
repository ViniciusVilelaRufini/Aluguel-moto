# Plano da área: pagamentos, caução e seguro (Task 5, agente 4)

> Executado com TDD (superpowers:test-driven-development). Cada transição e cada caso de idempotência tem teste vermelho, depois a implementação mínima e o teste verde.

**Goal:** trocar `StubRentalBilling` e `StubInsurance` por implementações reais: `RentalBillingService` (porta `RentalBillingPort`) e `InsuranceService` (porta `InsurancePort`), apoiados em `PaymentProvider` (fake + Mercado Pago) e `InsuranceProvider` (mock). Incluir webhooks idempotentes, carteira em ledger, recibos em PDF e NFS-e atrás de interface.

**Área:** `services/api/src/modules/{payments,insurance,wallet}/**`, migração Prisma nova (só modelos novos), `docs/pagamentos.md`.

## Arquitetura

```
modules/payments/
  provider/payment-provider.ts      interface PaymentProvider + tipos + erros (CardDeclinedError, ProviderError)
  provider/fake-payment-provider.ts em memória, determinístico, dedup por idempotencyKey; tokens tok_fail* recusam
  provider/mercadopago-payment-provider.ts  REST com fetch (api.mercadopago.com), X-Idempotency-Key, token do env
  provider/mercadopago-signature.ts verificação x-signature (ts + v1, HMAC-SHA256 do manifesto id/request-id/ts)
  payment-state.ts                  máquina de estados (tabela de transições + assertTransition)
  payment-ledger.service.ts         única forma de mudar Payment.status: update condicional + evento payment.updated
  rental-billing.service.ts         RentalBillingPort: holdDeposit, settle, isDelinquent; consome deposit.release-requested
  provider-customers.service.ts     cliente/cartão no gateway (PaymentProviderRef)
  webhook-processor.service.ts      consome a fila 'pagamentos-webhook', dedup ProcessedWebhook, reconcilia Payment/Deposit/TopUp
  receipts/receipt.service.ts       PDF (pdfkit) em S3_BUCKET_REPORTS via ObjectStorage
  receipts/invoice-issuer.ts        InvoiceIssuer + MockInvoiceIssuer (NFS-e)
  payments.service.ts / controller  endpoints do contrato (internals trocados)
modules/insurance/
  insurance-provider.ts             InsuranceProvider (quote, issue por aluguel ou período, cancel, openClaim) + MockInsuranceProvider
  insurance.service.ts              InsurancePort + repasse (InsuranceRemittance)
modules/wallet/wallet.service.ts    recargas via PaymentProvider (cartão e Pix), ledger só inserção
```

Seleção: `PAYMENT_PROVIDER=fake|mercadopago`, `INSURANCE_PROVIDER=mock`, `INVOICE_ISSUER=mock`.

## Banco (migração nova, só modelos novos)

- `ProcessedWebhook` (`provider` + `eventId` únicos)
- `PaymentProviderRef` (cliente/assinatura ↔ id no gateway)
- `InsuranceRemittance` (repasse por apólice, único)
- `PaymentReceipt` (PDF por pagamento)
- `Invoice` (NFS-e por pagamento)

## Máquina de estados de Payment

`pending → authorized → captured | canceled`; `pending → paid`; `paid | captured → refunded | partially_refunded`; `partially_refunded → partially_refunded | refunded`; `pending | authorized → failed`. Documentada em `docs/pagamentos.md`.

## Tarefas (TDD)

1. **payment-state**: uma transição válida por linha da tabela; inválidas (capture de `canceled`, `refunded → paid` etc.) lançam `InvalidPaymentTransitionError`.
2. **FakePaymentProvider**: preAuthorize/capture/cancel/charge/refund/pix/subscription; a mesma idempotencyKey devolve o mesmo resultado; capture de pré-autorização cancelada → erro.
3. **Mercado Pago adapter** com nock: corpo e headers (`Authorization`, `X-Idempotency-Key`), mapeamento de status, Pix (QR e copia e cola), refund e preapproval; nunca rede real.
4. **Assinatura do webhook**: válida, `v1` errado, `ts` ausente, segredo ausente.
5. **RentalBillingService.holdDeposit**: cartão → `held` com Payment `authorized`; recusa → `failed`; Pix → `awaiting_pix`; mesma chave → mesma resposta e 1 chamada ao provider; sem cartão → `failed`.
6. **settle**: valor ≤ caução → captura parcial (a sobra é liberada), Payment do aluguel `paid`; valor > caução → cobra o total e cancela a pré-autorização; 0 → libera; falha de captura/cobrança → `failed`, cliente inadimplente, `isDelinquent` → true; mesma chave → mesma resposta e 1 chamada; Pix de caução → estorno da sobra.
7. **deposit.release-requested**: cartão → cancela a pré-autorização; Pix pago → estorna; Pix pendente → cancela; aluguel iniciado → ignora.
8. **Webhook**: assinatura inválida → 401 e nada enfileirado; mesmo evento 2× → um efeito; Pix pago → caução `held`; Pix pago depois de liberada → estorno automático.
9. **Carteira**: saldo = soma do ledger; recarga por cartão gera lançamento; recarga Pix só gera lançamento quando o webhook confirma; ajuste gera lançamento.
10. **Seguro**: `basic` obrigatório (sem cobertura → 422 `insurance-required`); prêmio do config; repasse registrado na liquidação.
11. **Cartão**: o DTO só aceita `cardToken` (campos extras são removidos; token com cara de número de cartão → 400).
12. **Recibo e NFS-e**: PDF gravado no bucket de relatórios; nota emitida pelo mock.
13. **e2e** (`PAYMENT_PROVIDER=fake`): fluxo do aluguel com cartão cadastrado; webhook assinado.

## Verificação

`pnpm --filter api lint`, `pnpm --filter api test -- payments insurance wallet`, `pnpm --filter api test`, `pnpm --filter api test:e2e` (banco `volti_pagamentos`, Redis db 2).
