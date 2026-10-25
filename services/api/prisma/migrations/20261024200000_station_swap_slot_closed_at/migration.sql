-- Lacunas T5 (aditiva): fechamento da vaga recebido antes da devolução (a ordem entre mensagens do IoT Core não é garantida).
ALTER TABLE "StationSwap" ADD COLUMN "slotClosedAt" TIMESTAMP(3);
