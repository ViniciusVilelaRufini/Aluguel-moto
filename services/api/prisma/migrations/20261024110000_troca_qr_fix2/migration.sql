-- Troca de bateria via QR, fix round 2 (docs/decisoes.md): motivos novos de fim de troca. Só ALTER TYPE ... ADD VALUE.

ALTER TYPE "StationSwapEndReason" ADD VALUE 'return_after_close';
ALTER TYPE "StationSwapEndReason" ADD VALUE 'rental_force_ended';
