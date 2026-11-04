# Pré-reserva no app, contrato e pagamento no balcão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O app do cliente passa a fazer só a pré-reserva (sem caução, plano nem pagamento); o atendente registra contrato, plano, seguro e pagamento no balcão (app do operador ou painel), a API inicia o aluguel e destrava a moto, e o excedente/caução são acertados no balcão sem gateway.

**Architecture:** Reaproveita a reserva de galpão e a entrega (`Handover`): a entrega de saída `pending_customer` deixa de esperar o aceite do cliente e passa a ser concluída por `POST /handovers/{id}/counter-checkout`, que chama o mesmo `RentalStartService.start()` (com a opção nova `counter`) e grava, na transação que cria o aluguel, a caução e o pagamento de balcão (`Deposit`/`Payment` com método `counter_card|counter_pix|cash`). O preço do balcão é um snapshot próprio (`priceSnapshot.counter`) que o `PricingService.calculate` entende: período pré-pago + excedente por dia iniciado − pré-pago. No fechamento, o aluguel do balcão nunca chama o gateway: o resíduo vira `Payment` `pending` de balcão (débito em aberto), quitado por `counter-settle`; a caução volta por `counter-refund`.

**Tech Stack:** NestJS 10 + Prisma 5 + PostgreSQL 16, Jest 29 + jest-mock-extended (API); OpenAPI 3.1 + openapi-typescript + openapi-generator (contrato, `@volti/contracts`); Flutter + Riverpod + `volti_api` gerado (apps cliente e operador, widget tests); Next.js 14 + TanStack Query + Vitest + Playwright e2e-mock (painel).

**Spec:** `docs/superpowers/specs/2026-11-04-volti-pre-reserva-balcao-design.md` (as decisões 1–18, inclusive §3.1, são obrigatórias; em conflito vale a spec, e as interpretações deste plano estão na seção "Interpretações da spec" e vão para `docs/decisoes.md` na Task 1).

## Global Constraints

Do `CLAUDE.md`, sem alteração:

- As motos são equipamentos autopropelidos (Resolução Contran 996/2023): até 1.000 W e até 32 km/h, sem placa e sem CNH. O software nunca pode permitir ultrapassar esses limites.
- Segurança física: nunca cortar o motor com a moto em movimento. Bloquear = reduzir a potência gradualmente e travar só abaixo de 3 km/h.
- LGPD: localização é dado pessoal. Rastrear o cliente só durante o aluguel e com consentimento; trajetos expiram após 90 dias; o cliente pode exportar e excluir seus dados.
- Dados de cartão nunca passam pelo backend (só tokens do gateway).
- O contrato em /packages/contracts é a fonte da verdade. Não invente endpoints: se precisar de um novo, proponha a mudança no contrato e registre em /docs/decisoes.md.
- Código e nomes em inglês; textos de interface em português do Brasil.
- Dinheiro em centavos (inteiro); datas em UTC ISO 8601; exibição no fuso America/Sao_Paulo.
- Nenhum segredo no código (Secrets Manager ou variáveis de ambiente).
- Logs estruturados em JSON, sem dados pessoais.
- Compila, lint sem erros, testes passando, README da pasta atualizado.

Da spec, sem alteração:

- §7 Segurança física (trava só abaixo de 3 km/h; velocidade desconhecida = movimento; 32 km/h; zonas 6/20), LGPD (rastreio só no aluguel com consentimento; trajetos 90 dias; export/exclusão — incluir fotos do contrato), dinheiro em centavos, datas UTC, idempotência de cobrança, nenhum dado de cartão no backend (o balcão não digita cartão: só método e referência), logs sem dados pessoais.
- Decisão 12: **Fechamento do aluguel do balcão nunca usa o gateway.** Valor final = custo total − pré-pago no balcão.
- Decisão 9: Carteira, pacotes de minutos, "Meu plano" (assinatura) e cartões somem do app do cliente nesta fase (nada se paga no app). Os endpoints continuam no contrato (sem quebra); o app só esconde.
- Decisão 10: o servidor aceita `planCode`/`coverage`/`depositMethod` antigos na reserva (apps beta12) e os ignora; o `POST /handovers/{id}/accept` antigo responde `409 handover-counter-checkout` com texto "O aluguel é iniciado pelo atendente no galpão.".
- §6: contrato **só acréscimos**; regenerar com `pnpm --filter @volti/contracts generate` (TS + Dart).

Da execução:

- Sem Docker no PC: os testes que rodam aqui são unitários (Jest com `mockDeep<PrismaClient>()`), widget tests Flutter, Vitest e Playwright e2e-mock. Os e2e da API (`test/*.e2e-spec.ts`) são atualizados na Task 14 e rodados pelo **[CONTROLADOR]** no dev da AWS.
- TDD: cada task escreve o teste que falha antes do código.
- Commits em pt-BR no padrão `tipo(escopo): ...`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Interpretações da spec (decididas aqui; registradas em `docs/decisoes.md` na Task 1)

1. **`DepositMethod` também ganha `counter_card|counter_pix|cash`.** §6 só cita `PaymentMethod`, mas a decisão 13 exige `Deposit` com método de balcão.
2. **Caminho da devolução da caução:** `POST /payments/deposits/{id}/counter-refund` (a caução já mora em `/payments/deposits/{id}`; `/deposits/{id}` não existe como recurso).
3. **"Preço diário do modelo" (decisão 14)** = `unitPriceCents` do `PricingPlan` `day` ativo, congelado no snapshot no checkout. `VehicleModel` só tem preço por minuto.
4. **Seguro no balcão**: prêmio único por aluguel (`InsurancePort.quote({ coverage, planCode })`), não multiplicado pela quantidade.
5. **Período pré-pago**: dia = 24 h, semana = 7 dias, mês = 30 dias (`UNIT_SECONDS` do `PricingService`), contados de `Rental.startedAt` (início confirmado). Pausa não estende o período.
6. **Fotos do contrato sem chaves → `422 contract-photos-required`** (§8 pede 422; o DTO só valida formato e máximo 4, a contagem mínima fica no serviço).
7. **Leitura do acerto pela equipe de campo**: `GET /rentals/{id}/counter-balance` (novo, `admin, operacao, campo, financeiro`). Hoje `campo`/`operacao` não leem `/payments` nem `/payments/deposits`, e o acerto (decisões 13 e 18) precisa disso.
8. **`counter-settle` aceita quitação parcial**: `amountCents ≤ saldo`, com `method` **ou** `fromDepositId` (exatamente um). O débito fica quitado quando o saldo chega a 0. Cada parte vira um `Payment` `debt_settlement` `paid`. Saldo do débito = valor − carteira − caução capturada − Σ `debt_settlement` pagos dele.
9. **Caução do balcão**: `Deposit` ganha `refundedCents` e `reference`. Disponível = `amountCents − capturedCents − refundedCents`. Quando chega a 0: `captured` (se houve abatimento) ou `released`. Caução com valor 0 vira `released` no fechamento do aluguel. A devolução só depois do fim do aluguel (`409 conflict`).
10. **Cupom e carteira não valem no balcão** nesta fase (o `couponCode` antigo é ignorado; o fechamento do balcão não abate carteira nem pacote).
11. **Painel não faz vistoria**: a vistoria de saída continua só no app do operador (o painel não tem o `pickupCode`). O painel registra "Contrato e pagamento" de reservas em `handover`.
12. **Tela do cliente durante o balcão** mostra a vistoria só para leitura, sem "Aceitar" e sem "Apontar problema" (o cliente está no balcão).
13. **Débitos antigos `failed`** também aparecem só como "Valor a acertar no galpão" (sem "Pagar agora"), coerente com a decisão 9. O `POST /payments/{id}/retry` de um débito de balcão responde `409 debt-not-payable` "Este valor é acertado no galpão.".
14. **Texto novo do `409 payment-pending` na pré-reserva:** "Há um valor a acertar no galpão. Acerte no balcão para pré-reservar de novo.".
15. **Aviso 1 h antes do fim do período**: push uma vez (job, `Rental.prepaidReminderSentAt`) + faixa na tela da corrida.
16. **Recibo**: o `breakdown` traz a linha `counter_prepaid` ("Pago no balcão") e `paymentMethod` de balcão; PDF/NFS-e de pagamento de balcão fica como pendência (o fechamento e o acerto do balcão não chamam o `ReceiptService`; registrado na Task 14).
17. **Exclusão LGPD**: caução do balcão com saldo disponível bloqueia com "Retire sua caução no galpão antes de excluir a conta."; fotos do contrato são apagadas na exclusão como as fotos da entrega.
18. **Grupos**: `counter-quote`/`counter-checkout`/`counter-settle`/`counter-refund` = `admin, operacao, campo` (decisão 8); painel: permissões `counter.checkout` e `counter.settle` = `admin, operacao`.

## Review Focus

- **Dois balcões ao mesmo tempo** (app do operador e painel, ou duplo toque com `Idempotency-Key` diferentes) no mesmo `counter-checkout` → um aluguel, um `Payment` de balcão; o segundo devolve o mesmo aluguel (Task 5, teste `concurrent checkouts with different keys converge`).
- **Jobs do gateway tocando dinheiro de balcão** (retentativa de liquidação, órfãos `pending`, aluguel sem `paymentId`, liberação de caução por cancelamento/expiração/compensação) → nunca chamam o gateway nem marcam a caução como liberada (Task 6, testes `gateway jobs skip counter payments` e `release request ignores counter deposits`).
- **Abatimento + devolução concorrentes da mesma caução** → a soma nunca passa do valor retido; o segundo pedido recebe `422 counter-amount-mismatch` (Task 7, teste `refund never exceeds available under concurrency`).
- **Fronteira do período pré-pago** (terminar exatamente no fim, 1 s depois, aluguel com pausa) → 0 de excedente no segundo exato; 1 dia com 1 s a mais; pausa não muda o período (Task 4, teste `counter excess boundaries`).
- **App antigo (beta12)** tocando "Aceitar" ou "Pagar agora" num débito de balcão → `409` com o texto do balcão, nada cobrado (Tasks 3 e 6).

---

## File Structure

**Contrato e decisões (Task 1)**
- Modify `packages/contracts/openapi.yaml`; regenerate `packages/contracts/generated/ts/**`, `packages/contracts/generated/dart/**`.
- Create `services/api/src/contract-schemas-balcao.spec.ts`.
- Modify `docs/decisoes.md`.
- Modify (só para compilar com os enums novos) `apps/admin/src/lib/labels.ts`, e os `switch` exaustivos sobre `PaymentMethod`/`DepositMethod` nos apps Flutter, se houver.

**Banco e mapeadores (Task 2)**
- Modify `services/api/prisma/schema.prisma`; Create `services/api/prisma/migrations/20261104100000_counter_enum_values/migration.sql`, `services/api/prisma/migrations/20261104100100_counter_checkout/migration.sql`.
- Create `services/api/src/modules/payments/counter-methods.ts`.
- Modify `services/api/src/modules/payments/payments.mapper.ts`, `services/api/src/modules/rentals/rentals.mapper.ts`, `services/api/src/modules/handovers/handovers.mapper.ts`, `services/api/src/modules/handovers/handovers.dto.ts`, `services/api/src/modules/handovers/handovers.controller.ts`, `services/api/src/modules/handovers/handovers.service.ts` (upload com `purpose`).

**API do balcão (Tasks 3–9)**
- Modify `services/api/src/modules/reservations/{depot-reservations.service.ts,reservations.controller.ts}`, `services/api/src/modules/customers/eligibility.ts`.
- Create `services/api/src/modules/pricing/counter-pricing.ts`; Modify `services/api/src/modules/pricing/pricing.service.ts`.
- Create `services/api/src/modules/handovers/counter-checkout.service.ts`, `services/api/src/modules/handovers/counter-checkout.dto.ts`; Modify `handovers.controller.ts`, `handovers.module.ts`, `handovers.service.ts`, `test-handover.service.ts`, `services/api/src/modules/rentals/rental-start.service.ts`.
- Create `services/api/src/modules/payments/counter-close.ts`; Modify `services/api/src/modules/rentals/rental-end.service.ts`, `services/api/src/modules/payments/{open-debt.ts,rental-billing.service.ts,delinquency.service.ts}`.
- Create `services/api/src/modules/payments/counter-settlement.service.ts`, `services/api/src/modules/payments/counter-settlement.dto.ts`; Modify `payments.controller.ts`, `payments.module.ts`.
- Modify `services/api/src/modules/lgpd/lgpd.service.ts`; Create `services/api/src/modules/rentals/counter-period-reminder.service.ts`; Modify `rentals.module.ts`.

**Apps (Tasks 10–13)**
- `apps/cliente/lib/features/{pickup,pick,reservation,handover,home,account,summary,ride}`, `apps/cliente/lib/core/{router.dart,backend.dart}`, `apps/cliente/lib/l10n/*`; tests `apps/cliente/test/balcao_reserva_test.dart`, `apps/cliente/test/balcao_pagamentos_test.dart`.
- `apps/operador/lib/features/pickups/counter_checkout_page.dart` (novo), `apps/operador/lib/features/arrivals/counter_settle_page.dart` (novo), `apps/operador/lib/data/field_repository.dart`, `apps/operador/lib/l10n/*`; tests `apps/operador/test/balcao_checkout_test.dart`, `apps/operador/test/balcao_acerto_test.dart`.
- `apps/admin/src/lib/counter.ts` (novo), `apps/admin/src/components/CounterCheckoutDialog.tsx` (novo), `apps/admin/src/components/CounterSettleDialog.tsx` (novo), `apps/admin/src/components/depots/PickupTable.tsx`, `apps/admin/src/components/RentalsPanel.tsx`, `apps/admin/src/app/(panel)/entregas/page.tsx`, `apps/admin/src/lib/{permissions.ts,audit-labels.ts}`, `apps/admin/e2e-mock/{mock-api.ts,fixtures.ts}`, tests `apps/admin/tests/counter.test.ts`, `apps/admin/e2e-mock/balcao.spec.ts`.

**Docs e e2e (Task 14)**
- `services/api/README.md`, `apps/{cliente,operador,admin}/README.md`, `packages/contracts/README.md`, `services/api/test/{handovers,galpao,depot-reservations}.e2e-spec.ts`.

---

### Task 1: Contrato do balcão (acréscimos) e decisões

**Files:**
- Modify: `packages/contracts/openapi.yaml`
- Regenerate: `packages/contracts/generated/ts/**`, `packages/contracts/generated/dart/**`
- Create: `services/api/src/contract-schemas-balcao.spec.ts`
- Modify: `docs/decisoes.md`, `apps/admin/src/lib/labels.ts` (+ qualquer `switch` exaustivo que o `flutter analyze`/`tsc` apontar)

**Interfaces:**
- Produces (schemas, nomes exatos usados por todas as tasks seguintes):
  - `CounterPaymentMethod` enum `[counter_card, counter_pix, cash]`; `PaymentMethod` e `DepositMethod` += os mesmos três.
  - `CounterPlanCode` enum `[day, weekly, monthly]`.
  - `CounterPaymentInput { method: CounterPaymentMethod; amountCents: integer ≥1; reference?: string ≤64 }` (required `method, amountCents`).
  - `CounterDepositInput { method; amountCents: integer 0..1000000; reference? }`.
  - `CounterCheckoutRequest { planCode: CounterPlanCode; quantity?: integer 1..30 (default 1); coverage: InsuranceCoverage; contractPhotoKeys?: string[] (maxItems 4, items pattern `^contracts/`, maxLength 300); payment: CounterPaymentInput; deposit?: CounterDepositInput }` (required `planCode, coverage, payment`).
  - `CounterQuote { planCode; quantity; coverage; planUnitCents; planCents; insuranceCents; totalCents; excessDayCents; periodDays }` (todos required, inteiros ≥0).
  - `CounterSettleRequest { amountCents ≥1; method?: CounterPaymentMethod; fromDepositId?: uuid; reference? }` (required `amountCents`).
  - `CounterRefundRequest { amountCents ≥1; reference? }`.
  - `CounterDebt { paymentId; rentalId?; kind: PaymentKind; status: PaymentStatus; method: PaymentMethod; outstandingCents; createdAt }`.
  - `CounterDepositBalance { depositId; rentalId?; method: DepositMethod; status: DepositStatus; amountCents; capturedCents; refundedCents; availableCents }`.
  - `CounterBalance { rentalId; customerId; customerFirstName?; rentalStatus: RentalStatus; debtTotalCents; debts: CounterDebt[]; deposits: CounterDepositBalance[] }`.
  - `HandoverUploadPurpose` enum `[photo, contract]`; `HandoverUploadRequest { contentType: UploadContentType; purpose?: HandoverUploadPurpose (default photo) }`.
  - Propriedades novas: `Payment.reference?`, `Payment.recordedBy?` (uuid, "staff."), `Deposit.refundedCents?`, `Deposit.reference?`, `Handover.contractPhotoKeys?` ("staff."), `Rental.prepaidUntil?` (date-time; só aluguel do balcão), `LgpdExport.handovers[].contractPhotoKeys` (se o item tiver schema).
  - Operações novas (operationId → path, grupos):
    - `getHandoverCounterQuote` → `GET /handovers/{id}/counter-quote?planCode&coverage&quantity` → 200 `CounterQuote`; `[admin, operacao, campo]`.
    - `counterCheckoutHandover` → `POST /handovers/{id}/counter-checkout` (+ `IdempotencyKey` obrigatório) → 201 `Rental`; 400/401/403/404/409/422; `[admin, operacao, campo]`.
    - `counterSettlePayment` → `POST /payments/{id}/counter-settle` (+ `IdempotencyKey`) → 200 `Payment`; `[admin, operacao, campo]`.
    - `counterRefundDeposit` → `POST /payments/deposits/{id}/counter-refund` (+ `IdempotencyKey`) → 200 `Deposit`; `[admin, operacao, campo]`.
    - `getRentalCounterBalance` → `GET /rentals/{id}/counter-balance` → 200 `CounterBalance`; `[admin, operacao, campo, financeiro]`.
  - Mudanças de texto: `ReservationCreate` (com `depotId` só exige `pickupMode`; `planCode`/`coverage`/`depositMethod`/`cardId`/`couponCode` aceitos e ignorados; exige consentimento de localização `403 location-consent-required`); `POST /handovers/{id}/accept` (sempre `409 handover-counter-checkout`, "O aluguel é iniciado pelo atendente no galpão."); `POST /reservations/{id}/test-handover` (simula a vistoria **e** o checkout do balcão com `cash` de teste, devolve a entrega `accepted`); `POST /handovers/uploads` aceita `HandoverUploadRequest` (`contract` → `contracts/<uuid>.<ext>`); `POST /payments/{id}/retry` (débito de balcão → `409 debt-not-payable`).
  - Slugs novos documentados nas descrições: `handover-counter-checkout` (409), `counter-amount-mismatch` (422), `contract-photos-required` (422).

- [ ] **Step 1: Write the failing test** — `services/api/src/contract-schemas-balcao.spec.ts`, no padrão de `contract-schemas-galpao.spec.ts`:

```ts
const s = c.components.schemas;
it('métodos de balcão só acrescentam', () => {
  expect(s.PaymentMethod.enum).toEqual(expect.arrayContaining(['card', 'pix', 'wallet', 'counter_card', 'counter_pix', 'cash']));
  expect(s.DepositMethod.enum).toEqual(expect.arrayContaining(['card', 'pix', 'counter_card', 'counter_pix', 'cash']));
  expect(s.CounterPaymentMethod.enum).toEqual(['counter_card', 'counter_pix', 'cash']);
  expect(s.CounterPlanCode.enum).toEqual(['day', 'weekly', 'monthly']);
});
it('ReservationCreate continua exigindo só vehicleId', () => expect(s.ReservationCreate.required).toEqual(['vehicleId']));
it('counter-checkout exige Idempotency-Key e devolve Rental', () => {
  const op = c.paths['/handovers/{id}/counter-checkout'].post;
  expect(op.parameters.map((p: any) => p.$ref ?? p.name)).toEqual(expect.arrayContaining([expect.stringMatching(/IdempotencyKey$/)]));
  expect(op.responses['201'].content['application/json'].schema.$ref).toBe('#/components/schemas/Rental');
  expect(s.CounterCheckoutRequest.required).toEqual(['planCode', 'coverage', 'payment']);
  expect(s.CounterCheckoutRequest.properties.contractPhotoKeys.maxItems).toBe(4);
});
it('operações novas existem', () => {
  expect(c.paths['/handovers/{id}/counter-quote'].get.operationId).toBe('getHandoverCounterQuote');
  expect(c.paths['/payments/{id}/counter-settle'].post.operationId).toBe('counterSettlePayment');
  expect(c.paths['/payments/deposits/{id}/counter-refund'].post.operationId).toBe('counterRefundDeposit');
  expect(c.paths['/rentals/{id}/counter-balance'].get.operationId).toBe('getRentalCounterBalance');
});
it('campos novos são opcionais', () => {
  for (const [schema, prop] of [['Payment', 'reference'], ['Payment', 'recordedBy'], ['Deposit', 'refundedCents'], ['Handover', 'contractPhotoKeys'], ['Rental', 'prepaidUntil']]) {
    expect(s[schema].properties[prop]).toBeDefined();
    expect(s[schema].required).not.toContain(prop);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter api test -- contract-schemas-balcao`
Expected: FAIL (`CounterPaymentMethod` undefined).

- [ ] **Step 3: Edit `openapi.yaml`** com os schemas/operações do bloco Interfaces (só acréscimos; descrições em pt-BR citando as regras das decisões 12–15 e as Interpretações 6–9). Atualize as descrições de `ReservationCreate`, `acceptHandover`, `test-handover`, `createHandoverPhotoUpload`, `payDebt`, e o texto de topo da seção de galpão (linhas ~80 e ~156) que fala em "o cliente confere e aceita".

- [ ] **Step 4: Regenerate and lint the contract**

Run: `pnpm --filter @volti/contracts generate && pnpm --filter @volti/contracts test`
Expected: redocly sem erros, `tsc` ok.

- [ ] **Step 5: Keep the apps compiling** — `pnpm --filter admin lint` e `flutter analyze` em `apps/cliente` e `apps/operador`. Onde um mapa/switch exaustivo sobre `PaymentMethod`/`DepositMethod` quebrar, acrescente os rótulos: `counter_card` "Maquininha (cartão)", `counter_pix` "Pix no balcão", `cash` "Dinheiro".
Expected: os três sem erros.

- [ ] **Step 6: Run the contract test** — `pnpm --filter api test -- contract-schemas` → PASS (inclusive as specs de contrato antigas).

- [ ] **Step 7: Register in `docs/decisoes.md`** — entrada "2026-11-04 · Pré-reserva no app, contrato e pagamento no balcão (`feat/balcao`) · status: aplicada": lista das mudanças de contrato, as 18 Interpretações acima, e o risco da decisão 17 (assinatura/carteira já pagas no app em produção, sem migração).

- [ ] **Step 8: Commit**

```bash
git add packages/contracts docs/decisoes.md services/api/src/contract-schemas-balcao.spec.ts apps
git commit -m "feat(contracts): pré-reserva sem caução e checkout no balcão (só acréscimos)"
```

---

### Task 2: Banco, métodos de balcão e mapeadores

**Files:**
- Modify: `services/api/prisma/schema.prisma`
- Create: `services/api/prisma/migrations/20261104100000_counter_enum_values/migration.sql`, `services/api/prisma/migrations/20261104100100_counter_checkout/migration.sql`
- Create: `services/api/src/modules/payments/counter-methods.ts`
- Modify: `services/api/src/modules/payments/payments.mapper.ts`, `services/api/src/modules/rentals/rentals.mapper.ts`, `services/api/src/modules/handovers/{handovers.mapper.ts,handovers.dto.ts,handovers.controller.ts,handovers.service.ts}`
- Test: `services/api/src/modules/payments/counter-methods.spec.ts`, `services/api/src/modules/handovers/handovers.service.spec.ts` (upload), mapper specs existentes

**Interfaces:**
- Consumes: schemas da Task 1.
- Produces:
  - Prisma: `PaymentMethod` e `DepositMethod` += `counter_card counter_pix cash`; `Payment.reference String?`, `Payment.recordedById String? @db.Uuid`; `Deposit.refundedCents Int @default(0)`, `Deposit.reference String?`; `Handover.contractPhotoKeys String[] @default([])`; `Rental.prepaidUntil DateTime?`, `Rental.prepaidReminderSentAt DateTime?` + `@@index([prepaidUntil])`.
  - `counter-methods.ts`: `export const COUNTER_METHODS = ['counter_card', 'counter_pix', 'cash'] as const; export type CounterMethod = (typeof COUNTER_METHODS)[number]; export function isCounterMethod(m: string | null | undefined): m is CounterMethod; export function depositAvailableCents(d: { amountCents: number; capturedCents: number | null; refundedCents: number }): number`.
  - `HANDOVER_CONTRACT_KEY = /^contracts\/(?!.*\.\.)[\w./-]+$/` em `handovers.dto.ts`; `HandoverUploadDto { contentType; purpose?: 'photo' | 'contract' }`.
  - `HandoversService.uploadUrl(contentType: string, purpose: 'photo' | 'contract' = 'photo')` → prefixo `contracts` no bucket `returnPhotos` quando `contract`.
  - `toPayment` expõe `reference`; `recordedBy` só para staff (mesmo critério do `providerPaymentId`). `toDeposit` expõe `refundedCents`, `reference`. `toRental` expõe `prepaidUntil`. `toHandover` expõe `contractPhotoKeys` só para staff (siga como `cancelReason` é filtrado).

- [ ] **Step 1: Write the failing tests**

```ts
// counter-methods.spec.ts
it('isCounterMethod', () => {
  expect(COUNTER_METHODS).toEqual(['counter_card', 'counter_pix', 'cash']);
  expect(isCounterMethod('cash')).toBe(true);
  expect(isCounterMethod('card')).toBe(false);
  expect(isCounterMethod(null)).toBe(false);
});
it('depositAvailableCents nunca é negativo', () => {
  expect(depositAvailableCents({ amountCents: 10000, capturedCents: 2500, refundedCents: 5000 })).toBe(2500);
  expect(depositAvailableCents({ amountCents: 0, capturedCents: null, refundedCents: 0 })).toBe(0);
  expect(depositAvailableCents({ amountCents: 100, capturedCents: 80, refundedCents: 80 })).toBe(0);
});
// handovers.service.spec.ts
it('upload de contrato usa o prefixo contracts/', async () => {
  const { svc, storage } = setup();
  storage.presignPut.mockResolvedValue({ key: 'contracts/x.jpg', url: 'https://s3/put', expiresAt: '' });
  await svc.uploadUrl('image/jpeg', 'contract');
  expect(storage.presignPut).toHaveBeenCalledWith(expect.objectContaining({ key: expect.stringMatching(/^contracts\//) }));
});
```

Mais: teste de mapeador — `toPayment({..., reference: 'NSU123', recordedById: STAFF})` para cliente não traz `recordedBy`, para staff traz; `toRental({..., prepaidUntil})` traz ISO.

- [ ] **Step 2: Run** `pnpm --filter api test -- counter-methods handovers.service payments.mapper` → FAIL.

- [ ] **Step 3: Schema + migrações.** Os `ALTER TYPE ... ADD VALUE` ficam sozinhos na primeira migração (não podem ser usados na mesma transação); colunas e índice na segunda. Rode `pnpm --filter api exec prisma generate`.

- [ ] **Step 4: Implement** `counter-methods.ts`, DTO/rota de upload (`@Body() dto: HandoverUploadDto` em `POST /handovers/uploads`) e os mapeadores.

- [ ] **Step 5: Run** `pnpm --filter api test -- counter-methods handovers payments rentals.mapper && pnpm --filter api lint` → PASS.

- [ ] **Step 6: Commit** — `feat(api): colunas e métodos de balcão, upload de contrato`.

---

### Task 3: Pré-reserva sem caução e aceite antigo recusado

**Files:**
- Modify: `services/api/src/modules/reservations/{depot-reservations.service.ts,reservations.controller.ts}`, `services/api/src/modules/customers/eligibility.ts`, `services/api/src/modules/handovers/handovers.service.ts` (`accept`)
- Test: `services/api/src/modules/reservations/depot-reservations.service.spec.ts`, `services/api/src/modules/handovers/handovers.service.spec.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces:
  - `DepotReservationInput { vehicleId; depotId; pickupMode; pickupAt? }` (sem `planCode/coverage/depositMethod/cardId/couponCode`).
  - Controller: com `depotId`, só `pickupMode` (e o `Idempotency-Key`) são obrigatórios; campos antigos validados pelo DTO mas não repassados.
  - `assertCustomerEligible(..., { requireLocationConsent: true, requireTerms: true, debtAsConflict: true, debtMessage?: string })`; a pré-reserva passa `debtMessage: COUNTER_DEBT_MESSAGE` com `export const COUNTER_DEBT_MESSAGE = 'Há um valor a acertar no galpão. Acerte no balcão para pré-reservar de novo.'`.
  - `HandoversService.accept()` lança `new ProblemException(409, 'handover-counter-checkout', 'O aluguel é iniciado pelo atendente no galpão.', undefined, 'Aluguel iniciado no balcão')` antes de qualquer leitura de caução/trava (dono errado continua `404`).

- [ ] **Step 1: Write the failing tests** (`depot-reservations.service.spec.ts`; reescreva os casos que esperavam caução):

```ts
it('pré-reserva não bloqueia caução e grava sem plano', async () => {
  const r = await svc.create(CUSTOMER_ID, { vehicleId: V, depotId: D, pickupMode: 'now' }, 'k1');
  expect(billing.holdDeposit).not.toHaveBeenCalled();
  expect(prisma.reservation.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ depositId: null, planCode: null, coverage: null, depositMethod: null, cardId: null, couponCode: null }),
  }));
  expect(r.deposit).toBeUndefined();
});
it('campos antigos do beta12 são ignorados (controller)', async () => {
  await controller.create({ vehicleId: V, depotId: D, pickupMode: 'now', planCode: 'day', coverage: 'full', depositMethod: 'card', cardId: C } as any, customer, 'k');
  expect(depotReservations.create).toHaveBeenCalledWith(CUSTOMER_ID, { vehicleId: V, depotId: D, pickupMode: 'now', pickupAt: undefined }, 'k');
});
it('sem consentimento de localização → 403 location-consent-required', async () => {
  prisma.customer.findUnique.mockResolvedValue({ ...approved, locationConsent: false } as any);
  await expect(svc.create(CUSTOMER_ID, input, 'k')).rejects.toMatchObject({ slug: 'location-consent-required' });
});
it('débito em aberto → 409 payment-pending com o texto do balcão', async () => {
  billing.isDelinquent.mockResolvedValue(true);
  await expect(svc.create(CUSTOMER_ID, input, 'k')).rejects.toMatchObject({ slug: 'payment-pending', detail: COUNTER_DEBT_MESSAGE });
});
it('cancelar/expirar pré-reserva sem caução não pede liberação', async () => { /* reservations.service: depositId null → nenhum EV.DEPOSIT_RELEASE_REQUESTED */ });
// handovers.service.spec.ts
it('accept antigo → 409 handover-counter-checkout, nada iniciado', async () => {
  const { svc, starter } = setup();
  await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'handover-counter-checkout', detail: 'O aluguel é iniciado pelo atendente no galpão.' });
  expect(starter.start).not.toHaveBeenCalled();
});
it('accept de outro cliente continua 404', async () => { await expect(setup().svc.accept(other, HO_ID)).rejects.toMatchObject({ slug: 'not-found' }); });
```

Apague os testes de `accept` que exercitavam caução/pagamento recusado (o caminho deixou de existir).

- [ ] **Step 2: Run** `pnpm --filter api test -- depot-reservations reservations handovers.service` → FAIL.

- [ ] **Step 3: Implement** — remova `holdDeposit`/`assertDepositCard`/`requestDepositRelease` do `create` (a função `holdDeposit` e a constante `RESERVATION_KEY_MARK` saem; o job de caução órfã continua para cauções antigas). `accept` vira só dono → 409.

- [ ] **Step 4: Run** os mesmos testes + `pnpm --filter api lint` → PASS.

- [ ] **Step 5: Commit** — `feat(api): pré-reserva de galpão sem caução; aceite pelo app recusado`.

---

### Task 4: Preço do balcão (snapshot, excedente e cotação)

**Files:**
- Create: `services/api/src/modules/pricing/counter-pricing.ts`, `services/api/src/modules/pricing/counter-pricing.spec.ts`
- Modify: `services/api/src/modules/pricing/pricing.service.ts` (`PriceSnapshot.counter`, ramo em `calculate`)
- Create: `services/api/src/modules/handovers/counter-checkout.service.ts` (só `quote` nesta task), `services/api/src/modules/handovers/counter-checkout.dto.ts` (`CounterQuoteQuery`)
- Modify: `services/api/src/modules/handovers/{handovers.controller.ts,handovers.module.ts}`
- Test: `services/api/src/modules/handovers/counter-checkout.service.spec.ts`

**Interfaces:**
- Consumes: `PricingService.activePlan(code)`, `InsurancePort.quote({ coverage, planCode })`.
- Produces:
  - `counter-pricing.ts`: `COUNTER_PLAN_CODES = ['day', 'weekly', 'monthly'] as const`; `type CounterPlanCode`; `COUNTER_QUANTITY_MAX: Record<CounterPlanCode, number> = { day: 30, weekly: 4, monthly: 3 }`; `counterPeriodSeconds(unit: PlanUnit, quantity: number): number` (usa `UNIT_SECONDS`, exporte-o do `pricing.service.ts`); `interface CounterQuote` (campos da Task 1); `buildCounterQuote(input: { plan: Pick<PricingPlan, 'code' | 'unit' | 'unitPriceCents'>; dayPlan: Pick<PricingPlan, 'unitPriceCents'>; premiumCents: number; coverage: InsuranceCoverage; quantity: number }): CounterQuote`; `counterSnapshot(plan: PricingPlan, quote: CounterQuote): PriceSnapshot`.
  - `PriceSnapshot.counter?: { quantity: number; prepaidCents: number; excessDayCents: number }`.
  - `PricingService.calculate` com `snapshot.counter`: linhas `counter_plan` ("Plano <diário|semanal|mensal> (balcão)", quantity × unitPriceCents), `excess_day` ("Excedente (por dia iniciado)", só se houver), `insurance_<coverage>`, taxas, `counter_prepaid` ("Pago no balcão", −prepaidCents). `totalCents = max(0, subtotal + seguro + taxas − prepaidCents)`; sem desbloqueio, cupom, pacote ou carteira (ignora `walletAvailableCents`/`minutesAvailable`).
  - `CounterCheckoutService.quote(handoverId: string, q: { planCode: CounterPlanCode; coverage: InsuranceCoverage; quantity: number }): Promise<CounterQuote>` — entrega inexistente ou não `pickup` → 404; `quantity > COUNTER_QUANTITY_MAX[planCode]` → `badRequest` com `field: 'quantity'`.
  - `CounterQuoteQuery { planCode: CounterPlanCode (@IsIn(COUNTER_PLAN_CODES)); coverage: InsuranceCoverage; quantity: number (@Type(() => Number) @IsInt @Min(1) @Max(30), padrão 1) }`.
  - Rota `GET /handovers/:id/counter-quote` com `@StaffOnly('admin', 'operacao', 'campo')`.

- [ ] **Step 1: Write the failing tests** (`counter-pricing.spec.ts`):

```ts
const weekly = { code: 'weekly', unit: 'week', unitPriceCents: 25000 } as any;
const day = { unitPriceCents: 6000 } as any;
it('cotação: plano × quantidade + seguro único', () => {
  expect(buildCounterQuote({ plan: weekly, dayPlan: day, premiumCents: 1500, coverage: 'basic', quantity: 2 }))
    .toEqual({ planCode: 'weekly', quantity: 2, coverage: 'basic', planUnitCents: 25000, planCents: 50000, insuranceCents: 1500, totalCents: 51500, excessDayCents: 6000, periodDays: 14 });
});
it('counter excess boundaries', () => {
  const snap = counterSnapshot({ ...weekly, pausePerMinuteCents: 0, unlockFeeCents: 0 } as any, buildCounterQuote({ plan: weekly, dayPlan: day, premiumCents: 1500, coverage: 'basic', quantity: 1 }));
  const at = (s: number, paused = 0) => calculatePrice({ snapshot: snap, elapsedSeconds: s, pausedSeconds: paused, walletAvailableCents: 99999 });
  expect(at(7 * 86400).totalCents).toBe(0);
  expect(at(7 * 86400 + 1).totalCents).toBe(6000);
  expect(at(9 * 86400 + 1).lines.find((l) => l.code === 'excess_day')).toMatchObject({ quantity: 3, unitCents: 6000, amountCents: 18000 });
  expect(at(7 * 86400 + 1, 3 * 86400).totalCents).toBe(6000);   // pausa não estende o período
  expect(at(10).lines.map((l) => l.code)).toEqual(['counter_plan', 'insurance_basic', 'counter_prepaid']);
  expect(at(10).walletAppliedCents).toBeUndefined();
});
it('taxas viram excedente mesmo dentro do período', () => {
  expect(calculatePrice({ snapshot: snap, elapsedSeconds: 60, pausedSeconds: 0, fees: [{ code: 'zone_fine', description: 'Multa', amountCents: 3000 }] }).totalCents).toBe(3000);
});
it('counterPeriodSeconds', () => { expect(counterPeriodSeconds('month', 3)).toBe(90 * 86400); expect(counterPeriodSeconds('day', 1)).toBe(86400); });
```

`counter-checkout.service.spec.ts`: `quote` chama `activePlan('weekly')`, `activePlan('day')` e `insurance.quote({ coverage: 'full', planCode: 'weekly' })`; `weekly` com `quantity: 5` → `slug: 'validation-error'`; entrega `return_depot` → `not-found`.

- [ ] **Step 2: Run** `pnpm --filter api test -- counter-pricing counter-checkout pricing` → FAIL.

- [ ] **Step 3: Implement** os itens de Produces. O ramo `counter` vem antes do `subscriptionCovered` em `calculate`. Excedente: `days = ceil((elapsed − counterPeriodSeconds(unit, quantity)) / 86400)` quando positivo.

- [ ] **Step 4: Run** os testes + `pnpm --filter api test -- pricing rentals.mapper` (sem regressão) + lint → PASS.

- [ ] **Step 5: Commit** — `feat(api): preço do balcão (período pré-pago, excedente por dia) e counter-quote`.

---

### Task 5: Checkout do balcão inicia o aluguel (e o atalho de teste)

**Files:**
- Modify: `services/api/src/modules/rentals/rental-start.service.ts`
- Modify: `services/api/src/modules/handovers/{counter-checkout.service.ts,counter-checkout.dto.ts,handovers.controller.ts,handovers.module.ts,test-handover.service.ts}`
- Test: `services/api/src/modules/rentals/rental-start.service.spec.ts`, `services/api/src/modules/handovers/counter-checkout.service.spec.ts`, `services/api/src/modules/handovers/test-handover.spec.ts`

**Interfaces:**
- Consumes: `buildCounterQuote`, `counterSnapshot`, `counterPeriodSeconds`, `COUNTER_QUANTITY_MAX` (Task 4); `CounterMethod` (Task 2); `HANDOVER_CONTRACT_KEY` (Task 2).
- Produces:
  - `rental-start.service.ts`: `export interface CounterStart { customerId: string; operatorId: string; snapshot: PriceSnapshot; periodSeconds: number; payment: { method: CounterMethod; amountCents: number; reference?: string }; deposit: { method: CounterMethod; amountCents: number; reference?: string }; contractPhotoKeys: string[] }`; `StartOptions.counter?: CounterStart` (usado junto com `fromHandover`).
  - Com `counter`: `customerId = counter.customerId` (o `user` é o operador; vai como ator do `unlock`); sem `holdDeposit`, sem assinatura nem cupom; `deposit` = id gerado (`randomUUID()`) gravado no marcador `RentalStart`; na transação final, em vez do `deposit.updateMany`: `tx.deposit.create({ id, customerId, rentalId, method, status: 'held', amountCents, refundedCents: 0, reference, idempotencyKey: 'counter-deposit:<handoverId>' })`, `tx.payment.create({ kind: 'rental', status: 'paid', method, amountCents: counter.payment.amountCents, reference, recordedById: operatorId, rentalId, customerId, idempotencyKey: 'counter-checkout:<handoverId>' })`; se `deposit.amountCents > 0`, também `Payment` `kind: 'deposit'`, `status: 'paid'`, `depositId`, chave `counter-deposit-payment:<handoverId>`; `tx.handover.updateMany` condicional (`pending_customer` → `accepted`) grava também `contractPhotoKeys`; o aluguel nasce com `priceSnapshot: counter.snapshot`, `paymentId` = o pagamento de balcão, `prepaidUntil = now + periodSeconds`; `rentalEvent` com `actorType: 'staff'`, `actorId: operatorId`.
  - `CounterCheckoutService.checkout(actor: Principal, handoverId: string, dto: CounterCheckoutDto, opts: { test?: boolean } = {}): Promise<ReturnType<typeof toRental>>`:
    - entrega inexistente/não `pickup` → 404; já `accepted` com `rentalId` → devolve esse aluguel (convergência); fora de `pending_customer` → `422 handover-not-pending`;
    - `contractPhotoKeys` com 0 chaves (fora de `opts.test`) → `422 contract-photos-required` "Fotografe o contrato assinado (1 a 4 fotos).";
    - recalcula `quote`; `dto.payment.amountCents !== quote.totalCents` → `422 counter-amount-mismatch` "O valor não confere com o calculado. Atualize o valor e tente de novo.";
    - mesma trava da entrega (`ACCEPT_LOCK_SCOPE = 'handover-accept'`, exporte-a do `handovers.service.ts`): em andamento → `409 conflict`;
    - chama `starter.start(actor, { vehicleId, planCode, coverage, depositMethod: 'card' /* ignorado no ramo counter */ }, 'counter:<handoverId>', { fromHandover, counter })`;
    - `403 location-consent-required` do `start` vira `422` com o mesmo slug e detail "Peça ao cliente para permitir a localização no app."; os demais erros passam por `acceptError` (exporte-a de `handovers.service.ts`; `vehicle-offline` com o texto dela, `402` vira `422`);
    - sucesso: `AuditLog` `rental.counter_checkout` (metadata: `handoverId`, `rentalId`, `planCode`, `quantity`, `paymentMethod`, `amountCents`, `depositCents`; sem dado pessoal), `EV.HANDOVER_UPDATED` `accepted`, `insurance.registerRemittance(policyId)` (falha só loga). Falha de negócio grava `lastError` como hoje no aceite.
  - `CounterCheckoutDto` (class-validator espelhando `CounterCheckoutRequest`; `contractPhotoKeys` `@IsOptional @ArrayMaxSize(4) @Matches(HANDOVER_CONTRACT_KEY, { each: true })`).
  - Rota `POST /handovers/:id/counter-checkout`, `@StaffOnly('admin', 'operacao', 'campo')`, `@Idempotent({ required: true })`, 201.
  - `TestHandoverService.create(customer, reservationId)`: depois do `createPickup`, chama `counter.checkout(TEST_HANDOVER_ACTOR, h.id, { planCode: 'day', quantity: 1, coverage: 'basic', contractPhotoKeys: [], payment: { method: 'cash', amountCents: <quote.totalCents>, reference: 'teste' } }, { test: true })` e devolve a entrega relida (`accepted`, com `rentalId`).

- [ ] **Step 1: Write the failing tests**

`rental-start.service.spec.ts` (no estilo dos testes de `fromHandover` existentes):

```ts
it('counter: não cobra gateway e grava caução + pagamento de balcão na transação do aluguel', async () => {
  const r = await svc.start(operator, dto, 'counter:HO', { fromHandover, counter });
  expect(billing.holdDeposit).not.toHaveBeenCalled();
  expect(prisma.deposit.create).toHaveBeenCalledWith({ data: expect.objectContaining({ method: 'cash', status: 'held', amountCents: 0, idempotencyKey: 'counter-deposit:HO' }) });
  expect(prisma.payment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ kind: 'rental', status: 'paid', method: 'cash', amountCents: 7500, recordedById: STAFF_ID, idempotencyKey: 'counter-checkout:HO' }) });
  expect(prisma.rental.create).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId: CUSTOMER_ID, prepaidUntil: expect.any(Date), priceSnapshot: expect.objectContaining({ counter: expect.any(Object) }) }) });
  expect(commands.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'unlock', actor: operator }));
  expect(r.status).toBe(201);
});
it('counter: desbloqueio não confirmado → nada gravado, moto volta a reserved', async () => { /* unlock failed → prisma.deposit.create e payment.create não chamados; vehicle.updateMany status reserved */ });
```

`counter-checkout.service.spec.ts`:

```ts
it('valor diferente da cotação → 422 counter-amount-mismatch, start não chamado', ...);
it('sem fotos → 422 contract-photos-required', ...);
it('fotos fora de contracts/ → 400 (DTO)', ...);   // validate(plainToInstance(CounterCheckoutDto, {...}))
it('consentimento revogado → 422 location-consent-required com o texto do balcão', ...);
it('entrega cancelada → 422 handover-not-pending', ...);
it('moto já alugada → 409 vehicle-unavailable vindo do start, lastError gravado', ...);
it('já aceita → devolve o mesmo aluguel sem chamar start', ...);
it('concurrent checkouts with different keys converge', async () => {
  // starter.start resolve só depois de um gatilho; a segunda chamada com a trava ocupada → 409 conflict;
  // depois do primeiro concluir (handover accepted + rentalId), uma terceira → mesmo rental.id, starter.start chamado 1 vez.
});
it('sucesso: AuditLog rental.counter_checkout sem dado pessoal e handover.updated accepted', ...);
```

`test-handover.spec.ts`: o atalho chama `checkout` com `cash`, `reference: 'teste'`, `{ test: true }` e devolve `status: 'accepted'`.

- [ ] **Step 2: Run** `pnpm --filter api test -- rental-start counter-checkout test-handover` → FAIL.

- [ ] **Step 3: Implement** os itens de Produces. A compensação existente (moto, relock, apólice) cobre o ramo `counter`; não há caução a liberar (nada foi gravado antes da transação final).

- [ ] **Step 4: Run** `pnpm --filter api test -- rental-start handovers counter-checkout test-handover && pnpm --filter api lint` → PASS (sem regressão no início de rua).

- [ ] **Step 5: Commit** — `feat(api): counter-checkout inicia o aluguel no balcão; atalho de teste simula o balcão`.

---

### Task 6: Fechamento do aluguel do balcão e débito em aberto

**Files:**
- Create: `services/api/src/modules/payments/counter-close.ts`, `services/api/src/modules/payments/counter-close.spec.ts`
- Modify: `services/api/src/modules/rentals/rental-end.service.ts` (`doFinalize`)
- Modify: `services/api/src/modules/payments/{open-debt.ts,rental-billing.service.ts,delinquency.service.ts}`
- Test: `services/api/src/modules/rentals/rental-end.service.spec.ts`, `services/api/src/modules/payments/{rental-billing.service.spec.ts,delinquency.service.spec.ts}`, `services/api/src/modules/payments/open-debt.spec.ts` (novo)

**Interfaces:**
- Consumes: `COUNTER_METHODS`, `isCounterMethod` (Task 2); `PriceSnapshot.counter` (Task 4); aluguel do balcão com `paymentId` = pagamento pré-pago (Task 5).
- Produces:
  - `counter-close.ts`: `recordCounterClose(db: Prisma.TransactionClient | PrismaService, input: { rentalId: string; customerId: string; depositId: string; prepaidPaymentId: string; residualCents: number; method: CounterMethod }): Promise<{ paymentId: string }>` — resíduo > 0 → `Payment` `kind: 'rental'`, `status: 'pending'`, `method`, `amountCents: residualCents`, `idempotencyKey: 'counter-excess:<rentalId>'` (repetição reaproveita pela chave), `rental.paymentId` = ele; resíduo 0 → `rental.paymentId` fica o pré-pago. Caução do balcão com `amountCents: 0` e `held` → `released`.
  - `RentalEndService.doFinalize`: `snapshot.counter` presente → `walletAvailableCents: 0`, `minutesAvailable: 0`, sem `appendWalletEntry`, e no lugar do `billing.settle` chama `recordCounterClose` (método = o do pagamento pré-pago).
  - `open-debt.ts`: `counterDebtWhere(customerId): Prisma.PaymentWhereInput` = `{ customerId, kind: 'rental', status: 'pending', method: { in: [...COUNTER_METHODS] }, debtSettledAt: null }`; `openDebtWhere` = `{ OR: [<regra failed atual>, counterDebtWhere] }`; `isOpenDebt` idem; `hasCounterDebt(db, customerId): Promise<boolean>`; `blocksAccountDeletion` conta `rental` `pending` **sem** métodos de balcão (os de balcão já entram por `hasOpenDebt`).
  - `DelinquencyService.outstandingMap`: subtrai também Σ `debt_settlement` `paid` com `settlesPaymentId` = o débito.
  - `DelinquencyService.payDebt`: débito com `isCounterMethod(debt.method)` → `409 debt-not-payable` "Este valor é acertado no galpão.".
  - `RentalBillingService`: `retryPendingSettlements` (órfãos `pending`) com `method: { notIn: [...COUNTER_METHODS] }`; `onReleaseRequested` e `releaseDeposit` retornam cedo (log `deposit_release_counter_ignored`) para caução de balcão; `settleUnbilledRentals` pula aluguel com `prepaidUntil` não nulo.

- [ ] **Step 1: Write the failing tests**

```ts
// rental-end.service.spec.ts
it('aluguel do balcão sem excedente não chama o gateway', async () => {
  await svc.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: 'returns/x.jpg' });
  expect(billing.settle).not.toHaveBeenCalled();
  expect(prisma.payment.create).not.toHaveBeenCalled();
  expect(prisma.rental.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ costCents: 0 }) }));
});
it('excedente vira débito pending de balcão', async () => {
  // startedAt = agora − (1 dia + 1 s), counter.quantity 1 (day)
  expect(prisma.payment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ kind: 'rental', status: 'pending', method: 'counter_pix', amountCents: 6000, idempotencyKey: `counter-excess:${RENTAL_ID}` }) });
  expect(billing.settle).not.toHaveBeenCalled();
});
it('carteira não é abatida no balcão', ...);   // walletCentsAvailable > 0 → nenhum appendWalletEntry
// open-debt.spec.ts
it('pending de balcão é dívida; pending de cartão não', () => {
  expect(isOpenDebt({ kind: 'rental', status: 'pending', method: 'cash', debtSettledAt: null, failureReason: null } as any)).toBe(true);
  expect(isOpenDebt({ kind: 'rental', status: 'pending', method: 'card', debtSettledAt: null, failureReason: null } as any)).toBe(false);
});
// rental-billing.service.spec.ts
it('gateway jobs skip counter payments', async () => {
  await svc.retryPendingSettlements(0);
  expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ method: { notIn: ['counter_card', 'counter_pix', 'cash'] } }) }));
  // + aluguel encerrado com prepaidUntil e sem paymentId não chama settle
});
it('release request ignores counter deposits', async () => {
  prisma.deposit.findUnique.mockResolvedValue({ id: 'd', customerId: C, method: 'cash', status: 'held' } as any);
  await svc.onReleaseRequested({ depositId: 'd', customerId: C, reason: 'reservation_expired' });
  expect(prisma.depositRelease.upsert).not.toHaveBeenCalled();
  expect(prisma.deposit.updateMany).not.toHaveBeenCalled();
});
// delinquency.service.spec.ts
it('app antigo pagando débito de balcão → 409 debt-not-payable', async () => {
  await expect(svc.payDebt(C, P, { method: 'pix' })).rejects.toMatchObject({ slug: 'debt-not-payable', detail: 'Este valor é acertado no galpão.' });
  expect(provider.createPix).not.toHaveBeenCalled();
});
it('saldo desconta quitações parciais pagas', ...);   // amount 6000, um debt_settlement paid de 2500 → outstanding 3500
```

- [ ] **Step 2: Run** `pnpm --filter api test -- rental-end counter-close open-debt rental-billing delinquency` → FAIL.

- [ ] **Step 3: Implement** os itens de Produces. Procure outras consultas de `kind: 'rental'` + `status: 'pending'` em `services/api/src` (`grep -rn "status: 'pending'" services/api/src/modules/{payments,reports,rentals}`) e confirme que nenhuma dispara gateway para métodos de balcão.

- [ ] **Step 4: Run** `pnpm --filter api test && pnpm --filter api lint` → PASS (suíte inteira: o fechamento é compartilhado).

- [ ] **Step 5: Commit** — `feat(api): fechamento do balcão sem gateway; excedente vira débito a acertar no galpão`.

---

### Task 7: Acerto no balcão (saldo, quitação e devolução da caução)

**Files:**
- Create: `services/api/src/modules/payments/counter-settlement.service.ts`, `services/api/src/modules/payments/counter-settlement.dto.ts`, `services/api/src/modules/payments/counter-settlement.service.spec.ts`
- Modify: `services/api/src/modules/payments/{payments.controller.ts,payments.module.ts}`

**Interfaces:**
- Consumes: `counterDebtWhere`, `openDebtWhere`, `DelinquencyService.outstandingMap`, `clearDelinquencyIfSettled` (Task 6); `depositAvailableCents`, `isCounterMethod` (Task 2).
- Produces (`CounterSettlementService`):
  - `balance(rentalId: string): Promise<CounterBalanceView>` — `debts`: todas as dívidas em aberto do cliente do aluguel (`openDebtWhere`) com `outstandingCents > 0`; `deposits`: cauções de balcão do cliente com `availableCents > 0`; `customerFirstName` = primeiro nome; `rentalStatus`; `debtTotalCents`. Aluguel inexistente → 404.
  - `settle(actor: Principal, paymentId: string, dto: CounterSettleDto): Promise<PaymentView>` — numa transação com `SELECT ... FOR UPDATE` no `Payment`: não é dívida em aberto → `409 debt-not-payable`; `method` e `fromDepositId` juntos ou nenhum → `400 validation-error`; `amountCents > saldo` → `422 counter-amount-mismatch`; com `fromDepositId`: caução do mesmo cliente, de balcão, travada `FOR UPDATE`, `amountCents > disponível` → `422 counter-amount-mismatch`, `capturedCents += amountCents` (status pela Interpretação 9). Cria `Payment` `debt_settlement` `paid` (`settlesPaymentId`, `method` = o informado ou o da caução, `depositId` quando da caução, `reference`, `recordedById`). Saldo chegou a 0 → débito `debtSettledAt = now`, `debtSettlement: 'payment'` e, se `pending` de balcão, `status: 'paid'`; depois `clearDelinquencyIfSettled`. AuditLog `payment.counter_settle`. Devolve o débito com `outstandingCents` atualizado.
  - `refund(actor: Principal, depositId: string, dto: CounterRefundDto): Promise<DepositView>` — caução não de balcão → `409 conflict` "Esta caução não é do balcão."; aluguel dela ainda aberto → `409 conflict` "A caução só é devolvida depois do encerramento do aluguel."; `FOR UPDATE` na caução; `amountCents > disponível` → `422 counter-amount-mismatch`; `refundedCents += amountCents`, status pela Interpretação 9; AuditLog `deposit.counter_refund`.
  - Rotas: `GET rentals/:id/counter-balance` (`@StaffOnly('admin', 'operacao', 'campo', 'financeiro')`), `POST payments/:id/counter-settle` e `POST payments/deposits/:id/counter-refund` (`@StaffOnly('admin', 'operacao', 'campo')`, `@Idempotent({ required: true })`, `@HttpCode(200)`). A rota literal `payments/deposits/:id/counter-refund` fica antes de `payments/:id/...` no controller.

- [ ] **Step 1: Write the failing tests**

```ts
it('quita parcial com dinheiro e depois com a caução', async () => {
  // débito pending cash 6000; caução cash held 10000
  const a = await svc.settle(staff, DEBT, { amountCents: 2000, method: 'cash', reference: 'R1' });
  expect(a.outstandingCents).toBe(4000);
  const b = await svc.settle(staff, DEBT, { amountCents: 4000, fromDepositId: DEP });
  expect(b).toMatchObject({ status: 'paid', debtSettlement: 'payment' });
  expect(prisma.deposit.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ capturedCents: 4000 }) }));
});
it('valor acima do saldo → 422 counter-amount-mismatch', ...);
it('method e fromDepositId juntos → 400', ...);
it('débito failed antigo também quita no balcão', ...);   // kind rental, status failed, method card → debtSettledAt gravado, status continua failed
it('devolução fecha a caução quando o disponível zera', async () => {
  // 10000 retida, 4000 capturada → refund 6000 → refundedCents 6000, status captured
});
it('refund never exceeds available under concurrency', async () => {
  // duas chamadas de 6000 numa caução com 6000 disponível; o mock do FOR UPDATE serializa → a segunda vê refundedCents 6000 → 422
});
it('devolução com aluguel em andamento → 409', ...);
it('balance traz débitos com saldo e cauções com disponível > 0, sem nome completo', ...);
```

- [ ] **Step 2: Run** `pnpm --filter api test -- counter-settlement` → FAIL.

- [ ] **Step 3: Implement** os itens de Produces.

- [ ] **Step 4: Run** `pnpm --filter api test -- counter-settlement payments delinquency && pnpm --filter api lint` → PASS.

- [ ] **Step 5: Commit** — `feat(api): acerto no balcão — saldo, quitação parcial e devolução da caução`.

---

### Task 8: LGPD do contrato e aviso do fim do período

**Files:**
- Modify: `services/api/src/modules/lgpd/lgpd.service.ts`
- Create: `services/api/src/modules/rentals/counter-period-reminder.service.ts`; Modify: `services/api/src/modules/rentals/rentals.module.ts`
- Test: `services/api/src/modules/lgpd/lgpd.service.spec.ts`, `services/api/src/modules/rentals/counter-period-reminder.service.spec.ts`

**Interfaces:**
- Consumes: `Handover.contractPhotoKeys`, `Rental.prepaidUntil/prepaidReminderSentAt`, `depositAvailableCents`, `isCounterMethod` (Task 2).
- Produces:
  - `exportDepot` inclui `contractPhotoKeys` (só chaves) em cada entrega; `exportPayments` (ou onde os pagamentos são exportados) inclui `reference`, nunca `recordedById`.
  - `customerFiles` devolve as chaves de contrato junto com `handoverPhotoKeys` (apagadas do bucket `returnPhotos`); `anonymizeCustomerContent` zera `contractPhotoKeys`.
  - `deleteAccount`: caução de balcão `held` com disponível > 0 → `409 account-deletion-blocked` "Retire sua caução no galpão antes de excluir a conta." (antes da mensagem genérica de caução).
  - `CounterPeriodReminderService.remind(now = new Date()): Promise<number>` — aluguéis abertos com `prepaidUntil` em `(now, now + 1 h]` e `prepaidReminderSentAt: null`; claim condicional; push `{ title: 'Fim do período', body: 'Seu período termina às HH:MM. O excedente é acertado no galpão.', data: { type: 'rental.prepaid_ending', rentalId } }` com `HH:MM` em America/Sao_Paulo (`hourCycle: 'h23'`, como `formatTime` do `depot-reservations.service.ts`). Job `@Interval('counter-period-remind', 60_000)` + `@ExclusiveJob`, respeitando `cfg.jobsEnabled`.

- [ ] **Step 1: Write the failing tests**

```ts
it('export traz as chaves do contrato', async () => {
  prisma.handover.findMany.mockResolvedValue([{ ...h, contractPhotoKeys: ['contracts/a.jpg'] }] as any);
  expect((await svc.export(C)).handovers[0].contractPhotoKeys).toEqual(['contracts/a.jpg']);
});
it('exclusão apaga as fotos do contrato e zera as chaves', ...);
it('caução de balcão com saldo bloqueia a exclusão', async () => {
  await expect(svc.deleteAccount(C)).rejects.toMatchObject({ slug: 'account-deletion-blocked', detail: 'Retire sua caução no galpão antes de excluir a conta.' });
});
// counter-period-reminder.service.spec.ts
it('avisa uma vez, com a hora de São Paulo', async () => {
  // prepaidUntil = 2026-11-05T15:30:00Z, now = 14:45Z
  expect(await svc.remind(now)).toBe(1);
  expect(push.sendToOwner).toHaveBeenCalledWith(C, expect.objectContaining({ body: 'Seu período termina às 12:30. O excedente é acertado no galpão.' }));
  prisma.rental.updateMany.mockResolvedValue({ count: 0 });
  expect(await svc.remind(now)).toBe(0);
});
```

- [ ] **Step 2: Run** `pnpm --filter api test -- lgpd counter-period-reminder` → FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run** os testes + `pnpm --filter api test -- lgpd-completa` + lint → PASS.

- [ ] **Step 5: Commit** — `feat(api): contrato no export/exclusão LGPD e aviso do fim do período pré-pago`.

---

### Task 9: App do cliente — pré-reserva e "Sua moto está sendo preparada"

**Files:**
- Modify: `apps/cliente/lib/features/pickup/pickup_screen.dart`, `apps/cliente/lib/features/pick/{pick_screen.dart,depot_selection.dart}`, `apps/cliente/lib/core/router.dart`, `apps/cliente/lib/core/transitions.dart`, `apps/cliente/lib/features/reservation/depot_reservation_screen.dart`, `apps/cliente/lib/features/home/home_reservation_card.dart`, `apps/cliente/lib/features/handover/{handover_screen.dart,handover_watch.dart}`, `apps/cliente/lib/l10n/*`
- Delete: `apps/cliente/lib/features/plan/plan_screen.dart`, `apps/cliente/lib/features/plan/insurance_screen.dart` (e os testes que só cobrem essas telas), se nada além do router/pickup os importar
- Test: `apps/cliente/test/balcao_reserva_test.dart`; ajuste `galpao_flow_test.dart`, `handover_test.dart`, `test_handover_test.dart`, `galpao_fixtures.dart`

**Interfaces:**
- Consumes: `ReservationCreate` sem plano/caução; `Handover.status`; evento `handover.updated`/`rental.updated`; `Backend.consents()`/`updateConsents()`; `Backend.plans()`/`coverages()`.
- Produces:
  - Fluxo: `/pick` → `/pickup` direto (`DepotSelection` só com `depot` e `vehicle`); `/plan` e `/insurance` redirecionam para `/home`.
  - `PickupScreen`: agora/agendado como hoje; resumo "Moto", "Galpão", horário e o aviso "Leve documento com foto. O contrato e o pagamento são feitos no galpão."; bloco "Preços de referência; o plano é escolhido no galpão" com diária/semanal/mensal (`plans()` filtrado por `day|weekly|monthly`) e o seguro básico (`coverages()`); botão `Key('pickup-pre-reserve')` "Pré-reservar". Sem caução, cupom, cartão ou Pix. Antes de enviar: `consents().location == false` → diálogo `Key('pickup-consent-dialog')` "Permitir localização durante o aluguel" → `updateConsents(terms: atual, location: true, marketing: atual)`; recusa não envia. `403 location-consent-required` da API reabre o diálogo.
  - `DepotReservationScreen`/card da home: "Pré-reserva confirmada", sem caução/plano/Pix; QR, endereço, "Como chegar", prazo, "Cancelar (grátis)".
  - `HandoverScreen`: título "Sua moto está sendo preparada", vistoria só leitura (checklist, fotos, bateria), sem `handover-accept` e sem "Apontar problema"; com `HandoverStatus.accepted` (evento ou `GET`) ou `rental.updated` `active` → `ref.invalidate(currentRentalProvider)` e `context.go('/ride')`.
  - "Retirar moto (teste)" (canal beta): a resposta já vem `accepted` → vai direto para `/ride`.

- [ ] **Step 1: Write the failing widget tests** (`balcao_reserva_test.dart`, com os helpers/fakes de `helpers.dart` e `galpao_fixtures.dart`):

```dart
testWidgets('pré-reserva sem caução nem plano', (t) async {
  // abre /pickup com a seleção; toca agora; toca Pré-reservar
  expect(find.text('Leve documento com foto. O contrato e o pagamento são feitos no galpão.'), findsOneWidget);
  expect(find.text('Preços de referência; o plano é escolhido no galpão'), findsOneWidget);
  await t.tap(find.byKey(const Key('pickup-pre-reserve')));
  final req = backend.lastReservationCreate!;
  expect(req.planCode, isNull); expect(req.coverage, isNull); expect(req.depositMethod, isNull); expect(req.cardId, isNull);
});
testWidgets('sem consentimento pede antes de enviar', (t) async { /* consents location false → diálogo; recusar → nenhuma reserva criada */ });
testWidgets('escolher moto vai direto para a pré-reserva', (t) async { /* toque na moto → PickupScreen, nunca PlanScreen */ });
testWidgets('sendo preparada: sem aceitar e abre a corrida pelo evento', (t) async {
  expect(find.text('Sua moto está sendo preparada'), findsOneWidget);
  expect(find.byKey(const Key('handover-accept')), findsNothing);
  realtime.emit(HandoverUpdated(handoverId: 'h1', status: HandoverStatus.accepted));
  await t.pumpAndSettle();
  expect(router.location, '/ride');
});
testWidgets('atalho de teste abre a corrida', (t) async { /* createTestHandover devolve accepted com rentalId → /ride */ });
```

- [ ] **Step 2: Run** `cd apps/cliente && flutter test test/balcao_reserva_test.dart` → FAIL.

- [ ] **Step 3: Implement** os itens de Produces (textos novos no `l10n`).

- [ ] **Step 4: Run** `cd apps/cliente && flutter analyze && flutter test` → sem issues, todos passando.

- [ ] **Step 5: Commit** — `feat(cliente): pré-reserva sem pagamento e moto sendo preparada no balcão`.

---

### Task 10: App do cliente — pagamentos escondidos, débito e período

**Files:**
- Modify: `apps/cliente/lib/features/account/{account_screen.dart,wallet_screen.dart,subscriptions_screen.dart}`, `apps/cliente/lib/features/home/pending_payment_banner.dart`, `apps/cliente/lib/features/summary/summary_screen.dart`, `apps/cliente/lib/features/account/history_screen.dart`, `apps/cliente/lib/features/ride/{ride_screen.dart,ride_data.dart}`, `apps/cliente/lib/core/backend.dart` (se precisar de `isCounterDebt`), `apps/cliente/lib/core/push_routing.dart` (`rental.prepaid_ending` abre `/ride`), `apps/cliente/lib/l10n/*`
- Test: `apps/cliente/test/balcao_pagamentos_test.dart`; ajuste os testes de conta/carteira/débito que esperavam "Pagar agora"

**Interfaces:**
- Consumes: `Payment.method` (`counterCard|counterPix|cash`), `Payment.outstandingCents`, `Rental.prepaidUntil`, breakdown `counter_prepaid`/`excess_day`, `Wallet.balanceCents`, assinaturas.
- Produces:
  - Conta: "Cartões" sempre escondido; "Carteira" só com saldo > 0; "Meu plano" só com assinatura `active`; nessas telas, sem recarga/compra/pausa/cancelamento, com o aviso `Key('read-only-counter-notice')` "Fale com o galpão para usar ou cancelar".
  - `PendingPaymentBanner`: com débitos → `Key('home-counter-debt')` "Valor a acertar no galpão: R$ X" (soma de `outstandingCents`), sem `home-pay-now`; sem débito e `delinquent` → como hoje.
  - Resumo/recibo e histórico: pagamento `pending` → "Valor a acertar no galpão: R$ X" no lugar do Pix; linha `counter_prepaid` aparece como "Pago no balcão"; `paymentMethod` de balcão com os rótulos da Task 1.
  - Corrida: com `prepaidUntil`, faixa "Período até HH:MM" (fuso de São Paulo); a partir de `prepaidUntil − 1 h` vira `Key('ride-prepaid-ending')` "Seu período termina às HH:MM. O excedente é acertado no galpão."; depois de `prepaidUntil`, o custo mostra "A acertar no galpão: R$ X" (`costCents`).

- [ ] **Step 1: Write the failing widget tests** (`balcao_pagamentos_test.dart`):

```dart
testWidgets('conta sem cartões, carteira nem plano', (t) async { /* saldo 0, sem assinatura → find.text('Cartões'), ('Carteira'), ('Meu plano') findsNothing */ });
testWidgets('carteira com saldo aparece só leitura', (t) async { /* saldo 1500 → tile aparece; tela sem botão de recarga; aviso read-only-counter-notice */ });
testWidgets('débito a acertar no galpão sem botão de pagar', (t) async {
  backend.debts = [payment(method: PaymentMethod.cash, status: PaymentStatus.pending, outstandingCents: 6000)];
  expect(find.text('Valor a acertar no galpão: R\$ 60,00'), findsOneWidget);
  expect(find.byKey(const Key('home-pay-now')), findsNothing);
});
testWidgets('aviso 1 h antes do fim do período', (t) async {
  // clock = prepaidUntil − 59 min; prepaidUntil = 2026-11-05T15:30:00Z
  expect(find.text('Seu período termina às 12:30. O excedente é acertado no galpão.'), findsOneWidget);
});
testWidgets('resumo com excedente mostra a acertar no galpão', (t) async { /* receipt paymentStatus pending, amountDueCents 6000 → texto; sem Pix */ });
```

- [ ] **Step 2: Run** `cd apps/cliente && flutter test test/balcao_pagamentos_test.dart` → FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run** `cd apps/cliente && flutter analyze && flutter test` → tudo passando.

- [ ] **Step 5: Commit** — `feat(cliente): nada se paga no app — débito a acertar no galpão e aviso do fim do período`.

---

### Task 11: App do operador — Contrato e pagamento

**Files:**
- Create: `apps/operador/lib/features/pickups/counter_checkout_page.dart`
- Modify: `apps/operador/lib/data/field_repository.dart`, `apps/operador/lib/features/pickups/{handover_status_page.dart,pickup_checklist_page.dart,handover_ui.dart,pickups_page.dart}`, `apps/operador/lib/l10n/*`
- Test: `apps/operador/test/balcao_checkout_test.dart`; ajuste `pickups_test.dart`

**Interfaces:**
- Consumes: `getHandoverCounterQuote`, `counterCheckoutHandover`, `createHandoverPhotoUpload` com `HandoverUploadRequest(purpose: contract)` (Task 1).
- Produces:
  - `FieldRepository`: `Future<CounterQuote> getCounterQuote(String handoverId, {required CounterPlanCode plan, required InsuranceCoverage coverage, required int quantity})`; `Future<String> uploadContractPhoto(String path)` (devolve `objectKey` `contracts/...`); `Future<Rental> counterCheckout(String handoverId, CounterCheckoutRequest request, {required String idempotencyKey})`.
  - `CounterCheckoutPage({required Handover handover})`: plano (Diária / Semanal / Mensal), quantidade com limites 1–30 / 1–4 / 1–3 (`Key('counter-quantity')`), seguro (Básico obrigatório, Completo opcional), valor da API (`Key('counter-total')`, atualizado a cada mudança), fotos do contrato 1–4 (`Key('counter-contract-photo')`; botão de iniciar desabilitado sem foto), método (Maquininha (cartão) / Pix no balcão / Dinheiro), referência opcional (NSU/ID do Pix), caução opcional (valor + método), botão `Key('counter-start')` "Iniciar aluguel". Uma `Idempotency-Key` por tentativa (gerada ao abrir; nova só depois de mudar dados). Só online (sem fila offline).
  - Erros: `422 counter-amount-mismatch` → recarrega a cotação e mostra "O valor mudou. Confira e toque de novo."; `422 location-consent-required` → "Peça ao cliente para permitir a localização no app"; `409 vehicle-offline` → texto da API; sucesso → `HandoverStatusPage` mostra "Aluguel iniciado — moto liberada".
  - `HandoverStatusPage`: em `pendingCustomer` mostra "Contrato e pagamento" (`Key('handover-counter-checkout')`) em vez de "Aguardando o cliente".

- [ ] **Step 1: Write the failing widget tests** (`balcao_checkout_test.dart`, com o repositório falso de `helpers.dart`):

```dart
testWidgets('limites de quantidade por plano', (t) async { /* semanal: + até 4, depois desabilita; mensal até 3; diária até 30 */ });
testWidgets('sem foto do contrato não inicia', (t) async { expect(t.widget<VoltiButton>(find.byKey(const Key('counter-start'))).onPressed, isNull); });
testWidgets('envia o valor da cotação e a mesma chave no duplo toque', (t) async {
  // cotação 7500; foto; Dinheiro; toque duas vezes
  expect(repo.checkouts.single.request.payment.amountCents, 7500);
  expect(repo.checkouts.single.request.contractPhotoKeys, ['contracts/1.jpg']);
});
testWidgets('valor divergente recarrega a cotação', (t) async { /* 422 counter-amount-mismatch → getCounterQuote chamado de novo; texto */ });
testWidgets('consentimento revogado mostra o pedido ao cliente', (t) async { expect(find.text('Peça ao cliente para permitir a localização no app'), findsOneWidget); });
```

- [ ] **Step 2: Run** `cd apps/operador && flutter test test/balcao_checkout_test.dart` → FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run** `cd apps/operador && flutter analyze && flutter test` → tudo passando.

- [ ] **Step 5: Commit** — `feat(operador): contrato e pagamento no balcão iniciam o aluguel`.

---

### Task 12: App do operador — acerto na chegada

**Files:**
- Create: `apps/operador/lib/features/arrivals/counter_settle_page.dart`
- Modify: `apps/operador/lib/data/field_repository.dart`, `apps/operador/lib/features/arrivals/arrival_checklist_page.dart`, `apps/operador/lib/l10n/*`
- Test: `apps/operador/test/balcao_acerto_test.dart`

**Interfaces:**
- Consumes: `getRentalCounterBalance`, `counterSettlePayment`, `counterRefundDeposit` (Task 1).
- Produces:
  - `FieldRepository`: `Future<CounterBalance> getCounterBalance(String rentalId)`; `Future<Payment> counterSettle(String paymentId, CounterSettleRequest r, {required String idempotencyKey})`; `Future<Deposit> counterRefund(String depositId, CounterRefundRequest r, {required String idempotencyKey})`.
  - Depois de registrar a chegada de um aluguel, o checklist oferece `Key('arrival-counter-settle')` "Acerto no balcão" → `CounterSettlePage({required String rentalId})`.
  - `CounterSettlePage`: aluguel ainda aberto (`rentalStatus` aberto) → "Aguardando o encerramento do aluguel" + atualizar; débitos com "Receber" (valor ≤ saldo, método, referência) e "Abater da caução" (quando houver caução com disponível); caução com "Devolver" (valor ≤ disponível, referência). Uma `Idempotency-Key` por ação. Recarrega o saldo depois de cada ação. Valores digitados em reais → centavos inteiros.

- [ ] **Step 1: Write the failing widget tests** (`balcao_acerto_test.dart`):

```dart
testWidgets('abate da caução e devolve o resto', (t) async {
  // saldo: débito 6000; caução cash 10000 disponível
  // Abater da caução 60,00 → counterSettle(fromDepositId); depois Devolver 40,00 → counterRefund(4000)
  expect(repo.settles.single.request.fromDepositId, 'dep1');
  expect(repo.refunds.single.request.amountCents, 4000);
});
testWidgets('valor acima do disponível não envia', (t) async { /* digita 120,00 com 100,00 disponível → erro de campo, nenhuma chamada */ });
testWidgets('aluguel ainda aberto mostra aguardando', (t) async { expect(find.text('Aguardando o encerramento do aluguel'), findsOneWidget); });
```

- [ ] **Step 2: Run** `cd apps/operador && flutter test test/balcao_acerto_test.dart` → FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run** `cd apps/operador && flutter analyze && flutter test` → tudo passando.

- [ ] **Step 5: Commit** — `feat(operador): acerto de excedente e devolução da caução na chegada`.

---

### Task 13: Painel — Contrato e pagamento na Retiradas e "Acertar no balcão"

**Files:**
- Create: `apps/admin/src/lib/counter.ts`, `apps/admin/src/components/CounterCheckoutDialog.tsx`, `apps/admin/src/components/CounterSettleDialog.tsx`, `apps/admin/tests/counter.test.ts`, `apps/admin/e2e-mock/balcao.spec.ts`
- Modify: `apps/admin/src/components/depots/PickupTable.tsx`, `apps/admin/src/components/RentalsPanel.tsx`, `apps/admin/src/app/(panel)/entregas/page.tsx`, `apps/admin/src/lib/{permissions.ts,audit-labels.ts}`, `apps/admin/e2e-mock/{mock-api.ts,fixtures.ts}`

**Interfaces:**
- Consumes: as cinco operações novas (Task 1) via `api` tipado de `@volti/contracts`; `handoverId` da reserva em `handover`; upload pré-assinado no padrão de `src/lib/catalog-upload.ts`.
- Produces:
  - `counter.ts`: `COUNTER_METHOD_LABEL: Record<'counter_card' | 'counter_pix' | 'cash', string>` (os rótulos da Task 1); `COUNTER_PLAN_LABEL = { day: 'Diária', weekly: 'Semanal', monthly: 'Mensal' }`; `COUNTER_QUANTITY_MAX = { day: 30, weekly: 4, monthly: 3 }`; `clampQuantity(plan, n): number`; `reaisToCents(text: string): number | null` (reaproveite `money.ts` se já houver).
  - `permissions.ts`: `'counter.checkout': ['admin', 'operacao']`, `'counter.settle': ['admin', 'operacao']`. `audit-labels.ts`: `rental.counter_checkout` "Aluguel iniciado no balcão", `payment.counter_settle` "Acerto no balcão", `deposit.counter_refund` "Caução devolvida no balcão".
  - `PickupTable`: linha `handover` com ação `data-testid="pickup-counter-checkout"` "Contrato e pagamento" → `CounterCheckoutDialog({ handoverId })` (mesmos campos e erros da Task 11; fotos por upload de arquivo; `Idempotency-Key` estável por tentativa; após sucesso invalida `depot-pickups`).
  - `CounterSettleDialog({ rentalId })`: saldo (`getRentalCounterBalance`), receber/abater/devolver como na Task 12. Aberto por `data-testid="rental-counter-settle"` "Acertar no balcão" no detalhe do aluguel (`RentalsPanel`) e por `data-testid="handover-counter-settle"` nas entregas com `rentalId` (página Entregas).
  - Mock: handlers de `GET /handovers/{id}/counter-quote`, `POST /handovers/{id}/counter-checkout`, `POST /handovers/uploads`, `PUT` da URL assinada, `GET /rentals/{id}/counter-balance`, `POST /payments/{id}/counter-settle`, `POST /payments/deposits/{id}/counter-refund`; fixture de reserva `handover` com `handoverId`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/counter.test.ts
it('limites e conversão', () => {
  expect(clampQuantity('weekly', 9)).toBe(4);
  expect(clampQuantity('day', 0)).toBe(1);
  expect(reaisToCents('75,50')).toBe(7550);
  expect(reaisToCents('abc')).toBeNull();
  expect(can(['operacao'], 'counter.checkout')).toBe(true);
  expect(can(['suporte'], 'counter.settle')).toBe(false);
});
// e2e-mock/balcao.spec.ts
test('Retiradas: contrato e pagamento inicia o aluguel', async ({ page }) => {
  const { calls } = await installMockApi(page, { group: 'operacao' });
  // abre /retiradas, toca pickup-counter-checkout, escolhe Semanal ×2, anexa foto, Dinheiro, Iniciar aluguel
  const post = calls.find((c) => c.method === 'POST' && c.path.endsWith('/counter-checkout'))!;
  expect(post.body).toMatchObject({ planCode: 'weekly', quantity: 2, payment: { method: 'cash', amountCents: 51500 }, contractPhotoKeys: [expect.stringMatching(/^contracts\//)] });
  expect(post.headers['idempotency-key']).toBeTruthy();
});
test('Acertar no balcão: abate e devolve', async ({ page }) => { /* RentalsPanel → rental-counter-settle → abater 60,00 → devolver 40,00 */ });
```

- [ ] **Step 2: Run** `cd apps/admin && pnpm test -- counter && pnpm exec playwright test -c playwright.mock.config.ts e2e-mock/balcao.spec.ts` → FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run** `pnpm --filter admin lint && pnpm --filter admin test && cd apps/admin && pnpm exec playwright test -c playwright.mock.config.ts e2e-mock/balcao.spec.ts e2e-mock/sweep.spec.ts` → tudo passando.

- [ ] **Step 5: Commit** — `feat(admin): contrato e pagamento na Retiradas e acerto no balcão`.

---

### Task 14: e2e da API, READMEs e verificação final

**Files:**
- Modify: `services/api/test/{handovers.e2e-spec.ts,galpao.e2e-spec.ts,depot-reservations.e2e-spec.ts}` (aceite pelo cliente → `counter-checkout` pelo operador; reserva sem caução; acerto e devolução)
- Modify: `services/api/README.md`, `apps/cliente/README.md`, `apps/operador/README.md`, `apps/admin/README.md`, `apps/admin/e2e-mock/README.md`, `packages/contracts/README.md`, `docs/decisoes.md` (pendências)

**Interfaces:**
- Consumes: tudo das Tasks 1–13.
- Produces: e2e alinhados (rodados no dev da AWS pelo controlador) e documentação.

- [ ] **Step 1: Update the e2e specs** — `handovers.e2e-spec.ts`: saída → `counter-checkout` (sucesso; valor errado → 422; sem fotos → 422; duas chaves → um aluguel; `accept` → 409 `handover-counter-checkout`); `galpao.e2e-spec.ts`: ciclo pré-reserva → saída → checkout → `handover.updated`/`rental.updated` → fim com excedente → `counter-balance` → `counter-settle` → `counter-refund`; `depot-reservations.e2e-spec.ts`: reserva sem caução e com os campos antigos; respostas com `toSatisfyApiSpec()`.

- [ ] **Step 2: Typecheck the e2e** — `pnpm --filter api lint` (o `tsc` cobre `test/**`) → sem erros.

- [ ] **Step 3: [CONTROLADOR] Run on the AWS dev** — `pnpm --filter api test:e2e -- handovers galpao depot-reservations` e a bancada: atalho de teste do balcão inicia o aluguel da VLT-0059 (§8). Expected: PASS; aluguel `active` com `Payment` `cash` `paid`.

- [ ] **Step 4: READMEs** — API: endpoints do balcão, regras de fechamento/débito, jobs que ignoram métodos de balcão, o job `counter-period-remind`; cliente: fluxo de pré-reserva, telas escondidas e só leitura; operador: Contrato e pagamento e Acerto; painel: diálogos, permissões e o e2e-mock novo; contratos: operações novas. `docs/decisoes.md`: pendências (PDF/NFS-e de pagamento de balcão, renovação automática fora do escopo, risco da decisão 17).

- [ ] **Step 5: Full verification**

Run: `pnpm --filter @volti/contracts test && pnpm --filter api lint && pnpm --filter api test && pnpm --filter admin lint && pnpm --filter admin test && (cd apps/cliente && flutter analyze && flutter test) && (cd apps/operador && flutter analyze && flutter test)`
Expected: tudo sem erros e passando.

- [ ] **Step 6: Commit** — `docs: balcão do galpão — READMEs, e2e e pendências`.
