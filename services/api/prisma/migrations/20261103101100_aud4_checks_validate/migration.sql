-- Auditoria run-4: valida as linhas existentes contra os CHECKs da migração 20261103101000_aud4_checks (transação
-- separada; VALIDATE CONSTRAINT usa SHARE UPDATE EXCLUSIVE, que não bloqueia leituras nem escritas). Se falhar, há linha
-- fora da faixa: corrija os dados (consultas de diagnóstico em docs/decisoes.md) e rode `prisma migrate deploy` de novo.
ALTER TABLE "Payment" VALIDATE CONSTRAINT "Payment_amount_nonnegative";
ALTER TABLE "Payment" VALIDATE CONSTRAINT "Payment_wallet_range";
ALTER TABLE "Payment" VALIDATE CONSTRAINT "Payment_refunded_range";
ALTER TABLE "Deposit" VALIDATE CONSTRAINT "Deposit_amount_nonnegative";
ALTER TABLE "Deposit" VALIDATE CONSTRAINT "Deposit_captured_range";
ALTER TABLE "Fee" VALIDATE CONSTRAINT "Fee_amount_nonnegative";
ALTER TABLE "PricingPlan" VALIDATE CONSTRAINT "PricingPlan_prices_nonnegative";
ALTER TABLE "MinutePackage" VALIDATE CONSTRAINT "MinutePackage_price_nonnegative";
ALTER TABLE "VehicleModel" VALIDATE CONSTRAINT "VehicleModel_prices_nonnegative";
ALTER TABLE "Coupon" VALIDATE CONSTRAINT "Coupon_percent_off_range";
ALTER TABLE "Coupon" VALIDATE CONSTRAINT "Coupon_amount_off_nonnegative";
ALTER TABLE "SwapStation" VALIDATE CONSTRAINT "SwapStation_battery_counts_nonnegative";
ALTER TABLE "Battery" VALIDATE CONSTRAINT "Battery_charge_pct_range";
ALTER TABLE "Vehicle" VALIDATE CONSTRAINT "Vehicle_battery_pct_range";
ALTER TABLE "Rental" VALIDATE CONSTRAINT "Rental_cost_nonnegative";
