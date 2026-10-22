-- Retirada em galpão (docs/decisoes.md, 2026-10-22): valores novos de enum em migração própria (o Postgres não deixa
-- usar um valor recém-adicionado na mesma transação; a migração seguinte recria índices parciais com `handover`).
ALTER TYPE "VehicleStatus" ADD VALUE IF NOT EXISTS 'awaiting_pickup';
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'handover';
