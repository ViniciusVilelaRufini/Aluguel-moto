-- Troca de bateria via QR, fix round 1 (docs/decisoes.md): motivos novos de fim de troca. Só ALTER TYPE ... ADD VALUE
-- (nenhum uso dos valores nesta migração).

ALTER TYPE "StationSwapEndReason" ADD VALUE 'no_battery_after_return';
ALTER TYPE "StationSwapEndReason" ADD VALUE 'serial_mismatch';
