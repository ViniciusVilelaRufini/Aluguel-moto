-- Cadastro de estações de troca pelo painel (docs/decisoes.md, 2026-10-24, Task 12 das lacunas): só acréscimo.
-- `thingName` nulo = `station-{id}` (convenção do provisionamento); linhas antigas continuam válidas.

-- AlterTable
ALTER TABLE "SwapStation" ADD COLUMN     "thingName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SwapStation_thingName_key" ON "SwapStation"("thingName");
