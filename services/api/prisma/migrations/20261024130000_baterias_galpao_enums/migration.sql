-- Ciclo de vida das baterias no galpão (docs/decisoes.md, 2026-10-24): valores novos de enum em migração própria (o
-- Postgres não deixa usar um valor recém-adicionado na mesma transação; a migração seguinte cria o índice parcial).
ALTER TYPE "BatteryStatus" ADD VALUE IF NOT EXISTS 'charged';
ALTER TYPE "BatteryStatus" ADD VALUE IF NOT EXISTS 'defective';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'battery_stock_low';
