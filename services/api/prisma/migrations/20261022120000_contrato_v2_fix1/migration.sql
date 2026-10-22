-- Contrato v2, fix round 1 (docs/decisoes.md): HMAC do CPF para prevenção a fraude (I4) e data da moto fixa (M9).

-- AlterTable
ALTER TABLE "CouponRedemption" ADD COLUMN     "cpfHash" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "cpfHash" TEXT;

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "refereeCpfHash" TEXT,
ADD COLUMN     "referrerCpfHash" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "assignedVehicleAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_cpfHash_idx" ON "CouponRedemption"("couponId", "cpfHash");

-- CreateIndex
CREATE INDEX "Customer_cpfHash_idx" ON "Customer"("cpfHash");

-- CreateIndex
CREATE INDEX "Referral_refereeCpfHash_idx" ON "Referral"("refereeCpfHash");

