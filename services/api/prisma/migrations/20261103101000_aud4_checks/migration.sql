-- Auditoria run-4: CHECKs de dinheiro e faixas (escritos à mão; listados em test/helpers/e2e-app.ts HAND_WRITTEN_CHECKS).
-- `NOT VALID`: a restrição passa a valer para escritas novas sem varrer a tabela sob o lock exclusivo do ALTER. A validação
-- das linhas existentes fica na migração seguinte (20261103101100_aud4_checks_validate), em outra transação, com lock que
-- não bloqueia leituras nem escritas. Cada faixa foi conferida contra quem grava a coluna (docs/decisoes.md,
-- "Auditoria run-4 — melhorias de banco"); de fora ficaram SwapStation.availableBatteries <= totalSlots (descarga da van
-- incrementa sem teto).
-- Não espera atrás de consulta longa segurando a fila da tabela: falha rápido e o deploy é refeito.
SET lock_timeout = '5s';

-- Pagamentos: bruto não negativo; parte da carteira e estornos dentro do bruto.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_nonnegative" CHECK ("amountCents" >= 0) NOT VALID;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_wallet_range" CHECK ("walletCents" >= 0 AND "walletCents" <= "amountCents") NOT VALID;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refunded_range" CHECK ("refundedCents" >= 0 AND "refundedCents" <= "amountCents") NOT VALID;

-- Caução: valor não negativo; capturado dentro do valor.
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_amount_nonnegative" CHECK ("amountCents" >= 0) NOT VALID;
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_captured_range" CHECK ("capturedCents" IS NULL OR ("capturedCents" >= 0 AND "capturedCents" <= "amountCents")) NOT VALID;

-- Preços do catálogo.
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_amount_nonnegative" CHECK ("amountCents" >= 0) NOT VALID;
ALTER TABLE "PricingPlan" ADD CONSTRAINT "PricingPlan_prices_nonnegative" CHECK ("unlockFeeCents" >= 0 AND "unitPriceCents" >= 0 AND "pausePerMinuteCents" >= 0) NOT VALID;
ALTER TABLE "MinutePackage" ADD CONSTRAINT "MinutePackage_price_nonnegative" CHECK ("priceCents" >= 0) NOT VALID;
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_prices_nonnegative" CHECK ("pricePerMinuteCents" >= 0 AND ("unlockFeeCents" IS NULL OR "unlockFeeCents" >= 0)) NOT VALID;

-- Cupons.
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_percent_off_range" CHECK ("percentOff" IS NULL OR ("percentOff" >= 0 AND "percentOff" <= 100)) NOT VALID;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_amount_off_nonnegative" CHECK ("amountOffCents" IS NULL OR "amountOffCents" >= 0) NOT VALID;

-- Estações e baterias.
ALTER TABLE "SwapStation" ADD CONSTRAINT "SwapStation_battery_counts_nonnegative" CHECK ("availableBatteries" >= 0 AND "totalSlots" >= 0) NOT VALID;
ALTER TABLE "Battery" ADD CONSTRAINT "Battery_charge_pct_range" CHECK ("chargePct" >= 0 AND "chargePct" <= 100) NOT VALID;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_battery_pct_range" CHECK ("batteryPct" >= 0 AND "batteryPct" <= 100) NOT VALID;

-- Aluguel: custo final (já sem a carteira) não negativo.
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_cost_nonnegative" CHECK ("costCents" >= 0) NOT VALID;
