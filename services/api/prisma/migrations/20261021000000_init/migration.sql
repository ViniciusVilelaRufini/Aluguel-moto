-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('free', 'rented', 'reserved', 'paused', 'blocked', 'maintenance', 'offline');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('operation', 'return', 'forbidden', 'reduced_speed');

-- CreateEnum
CREATE TYPE "StaffGroup" AS ENUM ('admin', 'operacao', 'financeiro', 'suporte', 'campo');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('active', 'paused', 'ending', 'ended', 'force_ended');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('lock', 'unlock', 'horn', 'speed_limit', 'stolen_mode');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('pending', 'in_progress', 'confirmed', 'failed');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('minute', 'hour', 'day', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "InsuranceCoverage" AS ENUM ('basic', 'full');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('not_started', 'pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CommandStatusReason" AS ENUM ('offline', 'timeout', 'did_not_stop', 'invalid_limit');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('customer', 'staff', 'system');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('rg', 'cnh', 'rne');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('android', 'ios', 'web');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('active', 'converted', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "DepositMethod" AS ENUM ('card', 'pix');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('awaiting_pix', 'held', 'failed', 'captured', 'released');

-- CreateEnum
CREATE TYPE "RentalEventType" AS ENUM ('started', 'paused', 'resumed', 'vehicle_swapped', 'zone_entered', 'zone_exited', 'left_operation_area', 'returned_operation_area', 'alert', 'fall_detected', 'ending', 'ended', 'force_ended', 'command');

-- CreateEnum
CREATE TYPE "PlanUnit" AS ENUM ('minute', 'hour', 'day', 'week', 'month');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percent', 'fixed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'authorized', 'captured', 'canceled', 'paid', 'refunded', 'partially_refunded', 'failed');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('rental', 'deposit', 'top_up', 'subscription', 'fee');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('card', 'pix', 'wallet');

-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('pending', 'paid', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "WalletEntryType" AS ENUM ('top_up', 'minute_package', 'rental_charge', 'refund', 'adjustment', 'bonus');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('active', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('out_of_operation_area', 'forbidden_zone_entered', 'fall_detected', 'tamper', 'battery_critical', 'movement_without_rental', 'vehicle_offline', 'command_failed', 'customer_not_ok', 'incident_reported', 'speed_limiter_noncompliant');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'assigned', 'resolved');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('vehicle_problem', 'accident', 'theft', 'app_problem', 'parking', 'other');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'under_review', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('accident', 'theft', 'damage', 'personal_injury');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'paid');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "MessageAuthorType" AS ENUM ('customer', 'staff', 'system');

-- CreateEnum
CREATE TYPE "FieldTaskType" AS ENUM ('collect', 'battery_swap', 'maintenance', 'reposition', 'inspection');

-- CreateEnum
CREATE TYPE "FieldTaskStatus" AS ENUM ('open', 'assigned', 'in_progress', 'done', 'canceled');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "MaintenanceKind" AS ENUM ('preventive', 'corrective');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('scheduled', 'in_progress', 'done', 'canceled');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'blocked', 'deleted');

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "cognitoSub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "cpf" TEXT,
    "birthDate" DATE,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'not_started',
    "kycReason" TEXT,
    "kycSubmittedAt" TIMESTAMP(3),
    "kycReviewedAt" TIMESTAMP(3),
    "kycDocumentType" "DocumentType",
    "kycDocumentFrontKey" TEXT,
    "kycDocumentBackKey" TEXT,
    "kycSelfieKey" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'active',
    "delinquent" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "blockedAt" TIMESTAMP(3),
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "termsVersion" TEXT,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "locationConsent" BOOLEAN NOT NULL DEFAULT false,
    "locationConsentUpdatedAt" TIMESTAMP(3),
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentsUpdatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" UUID NOT NULL,
    "cognitoSub" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groups" "StaffGroup"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" UUID NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "appVersion" TEXT,
    "ownerType" "ActorType" NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestrictionEntry" (
    "id" UUID NOT NULL,
    "cpf" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestrictionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "qrCode" TEXT,
    "model" TEXT NOT NULL,
    "thingName" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'free',
    "statusBeforeOffline" "VehicleStatus",
    "lat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lng" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "batteryPct" INTEGER NOT NULL DEFAULT 100,
    "speedLimitKmh" INTEGER NOT NULL DEFAULT 32,
    "speedKmh" DOUBLE PRECISION,
    "online" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "ignition" BOOLEAN NOT NULL DEFAULT false,
    "signal" INTEGER,
    "stolenMode" BOOLEAN NOT NULL DEFAULT false,
    "firmwareVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "batterySerial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tracker" (
    "id" UUID NOT NULL,
    "vehicleId" UUID,
    "thingName" TEXT NOT NULL,
    "imei" TEXT,
    "firmwareVersion" TEXT,
    "certificateArn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Battery" (
    "id" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "chargePct" INTEGER NOT NULL DEFAULT 100,
    "vehicleId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Battery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ZoneType" NOT NULL,
    "speedLimitKmh" INTEGER,
    "geometry" JSONB NOT NULL,
    "geom" geometry(Polygon,4326),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCommand" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "type" "CommandType" NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'pending',
    "statusReason" "CommandStatusReason",
    "reason" TEXT NOT NULL,
    "requestedById" UUID,
    "requestedByType" "ActorType" NOT NULL DEFAULT 'staff',
    "requestedByName" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackPoint" (
    "id" UUID NOT NULL,
    "rentalId" UUID,
    "vehicleId" UUID NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" UUID NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" "PlanUnit" NOT NULL,
    "unlockFeeCents" INTEGER NOT NULL DEFAULT 0,
    "unitPriceCents" INTEGER NOT NULL,
    "pausePerMinuteCents" INTEGER NOT NULL DEFAULT 0,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "percentOff" INTEGER,
    "amountOffCents" INTEGER,
    "planCodes" "PlanCode"[],
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "maxRedemptionsPerCustomer" INTEGER,
    "redemptions" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "rentalId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fee" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amountCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'active',
    "depositId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rental" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "planCode" "PlanCode" NOT NULL,
    "coverage" "InsuranceCoverage" NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "pausedSecondsAcc" INTEGER NOT NULL DEFAULT 0,
    "endRequestedAt" TIMESTAMP(3),
    "endLastAttemptAt" TIMESTAMP(3),
    "endAttempts" INTEGER NOT NULL DEFAULT 0,
    "endedAt" TIMESTAMP(3),
    "priceSnapshot" JSONB NOT NULL,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "breakdown" JSONB,
    "couponCode" TEXT,
    "depositId" UUID NOT NULL,
    "insurancePolicyId" UUID,
    "paymentId" UUID,
    "endZoneId" UUID,
    "returnPhotoUploadKey" TEXT,
    "returnPhotoObjectKey" TEXT,
    "forceEndReason" TEXT,
    "forcedEndById" UUID,
    "rating" INTEGER,
    "ratingComment" TEXT,
    "speedLimitKmh" INTEGER,
    "startLat" DOUBLE PRECISION,
    "startLng" DOUBLE PRECISION,
    "wellbeingCheckDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalEvent" (
    "id" UUID NOT NULL,
    "rentalId" UUID NOT NULL,
    "type" "RentalEventType" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "ActorType" NOT NULL,
    "actorId" UUID,
    "message" TEXT,
    "data" JSONB,

    CONSTRAINT "RentalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationShare" (
    "id" UUID NOT NULL,
    "rentalId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCard" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "providerCardId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" UUID NOT NULL,
    "rentalId" UUID,
    "customerId" UUID NOT NULL,
    "method" "DepositMethod" NOT NULL,
    "status" "DepositStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "capturedCents" INTEGER,
    "cardId" UUID,
    "idempotencyKey" TEXT,
    "providerReference" TEXT,
    "pix" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "rentalId" UUID,
    "depositId" UUID,
    "subscriptionId" UUID,
    "kind" "PaymentKind" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "cardLast4" TEXT,
    "failureReason" TEXT,
    "providerPaymentId" TEXT,
    "receiptUrl" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "planCode" "PlanCode" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "cardId" UUID,
    "priceCents" INTEGER NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinutePackage" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinutePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopUp" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "status" "TopUpStatus" NOT NULL,
    "method" "DepositMethod" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "packageId" UUID,
    "minutes" INTEGER,
    "pix" JSONB,
    "paymentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "type" "WalletEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "minutes" INTEGER,
    "balanceAfterCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "rentalId" UUID,
    "paymentId" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceCoverageConfig" (
    "coverage" "InsuranceCoverage" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "premiumCents" INTEGER NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "items" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceCoverageConfig_pkey" PRIMARY KEY ("coverage")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" UUID NOT NULL,
    "rentalId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "coverage" "InsuranceCoverage" NOT NULL,
    "premiumCents" INTEGER NOT NULL,
    "payoutCents" INTEGER,
    "status" "PolicyStatus" NOT NULL DEFAULT 'active',
    "providerPolicyId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" UUID NOT NULL,
    "type" "AlertType" NOT NULL,
    "priority" "AlertPriority" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'open',
    "vehicleId" UUID,
    "rentalId" UUID,
    "message" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "assigneeId" UUID,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" UUID,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "rentalId" UUID,
    "vehicleId" UUID,
    "category" "IncidentCategory" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "description" TEXT NOT NULL,
    "photoObjectKeys" TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "resolutionNote" TEXT,
    "createdById" UUID,
    "createdByType" "ActorType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "rentalId" UUID NOT NULL,
    "paymentId" UUID,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "resolution" TEXT,
    "refundAmountCents" INTEGER,
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "rentalId" UUID NOT NULL,
    "incidentId" UUID,
    "insurancePolicyId" UUID,
    "providerClaimId" TEXT,
    "type" "ClaimType" NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'submitted',
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "photoObjectKeys" TEXT[],
    "statusNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportConversation" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "rentalId" UUID,
    "subject" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'open',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "authorType" "MessageAuthorType" NOT NULL,
    "authorId" UUID,
    "authorName" TEXT,
    "body" TEXT NOT NULL,
    "attachmentObjectKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTask" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "kind" "MaintenanceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'scheduled',
    "scheduledFor" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldTask" (
    "id" UUID NOT NULL,
    "type" "FieldTaskType" NOT NULL,
    "status" "FieldTaskStatus" NOT NULL DEFAULT 'open',
    "priority" "TaskPriority" NOT NULL,
    "vehicleId" UUID NOT NULL,
    "targetLat" DOUBLE PRECISION,
    "targetLng" DOUBLE PRECISION,
    "assigneeId" UUID,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "maintenanceTaskId" UUID,
    "createdById" UUID,
    "completionNotes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" UUID NOT NULL,
    "fieldTaskId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "inspectorId" UUID NOT NULL,
    "checklist" JSONB NOT NULL,
    "photoObjectKeys" TEXT[],
    "notes" TEXT,
    "passed" BOOLEAN NOT NULL,
    "maintenanceTaskId" UUID,
    "alertId" UUID,
    "idempotencyKey" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatterySwap" (
    "id" UUID NOT NULL,
    "fieldTaskId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "removedBatterySerial" TEXT NOT NULL,
    "installedBatterySerial" TEXT NOT NULL,
    "installedBatteryPct" INTEGER,
    "idempotencyKey" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatterySwap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "statusCode" INTEGER,
    "response" JSONB,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_cognitoSub_key" ON "Customer"("cognitoSub");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_cpf_key" ON "Customer"("cpf");

-- CreateIndex
CREATE INDEX "Customer_kycStatus_idx" ON "Customer"("kycStatus");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_cognitoSub_key" ON "StaffUser"("cognitoSub");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Device_fcmToken_key" ON "Device"("fcmToken");

-- CreateIndex
CREATE INDEX "Device_ownerId_idx" ON "Device"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "RestrictionEntry_cpf_key" ON "RestrictionEntry"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_code_key" ON "Vehicle"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_thingName_key" ON "Vehicle"("thingName");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Tracker_vehicleId_key" ON "Tracker"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Tracker_thingName_key" ON "Tracker"("thingName");

-- CreateIndex
CREATE UNIQUE INDEX "Battery_serial_key" ON "Battery"("serial");

-- CreateIndex
CREATE INDEX "Zone_type_active_idx" ON "Zone"("type", "active");

-- CreateIndex
CREATE INDEX "VehicleCommand_vehicleId_createdAt_idx" ON "VehicleCommand"("vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "VehicleCommand_status_idx" ON "VehicleCommand"("status");

-- CreateIndex
CREATE INDEX "TrackPoint_expiresAt_idx" ON "TrackPoint"("expiresAt");

-- CreateIndex
CREATE INDEX "TrackPoint_rentalId_recordedAt_idx" ON "TrackPoint"("rentalId", "recordedAt");

-- CreateIndex
CREATE INDEX "TrackPoint_vehicleId_recordedAt_idx" ON "TrackPoint"("vehicleId", "recordedAt");

-- CreateIndex
CREATE INDEX "PricingPlan_code_active_idx" ON "PricingPlan"("code", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_rentalId_key" ON "CouponRedemption"("rentalId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_customerId_idx" ON "CouponRedemption"("couponId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Fee_code_key" ON "Fee"("code");

-- CreateIndex
CREATE INDEX "Reservation_customerId_status_idx" ON "Reservation"("customerId", "status");

-- CreateIndex
CREATE INDEX "Reservation_vehicleId_status_idx" ON "Reservation"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "Reservation_status_expiresAt_idx" ON "Reservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Rental_customerId_startedAt_idx" ON "Rental"("customerId", "startedAt");

-- CreateIndex
CREATE INDEX "Rental_vehicleId_startedAt_idx" ON "Rental"("vehicleId", "startedAt");

-- CreateIndex
CREATE INDEX "Rental_status_idx" ON "Rental"("status");

-- CreateIndex
CREATE INDEX "RentalEvent_rentalId_at_idx" ON "RentalEvent"("rentalId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "LocationShare_token_key" ON "LocationShare"("token");

-- CreateIndex
CREATE INDEX "PaymentCard_customerId_idx" ON "PaymentCard"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_idempotencyKey_key" ON "Deposit"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Deposit_customerId_status_idx" ON "Deposit"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_customerId_createdAt_idx" ON "Payment"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_rentalId_idx" ON "Payment"("rentalId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Subscription_customerId_status_idx" ON "Subscription"("customerId", "status");

-- CreateIndex
CREATE INDEX "WalletEntry_customerId_createdAt_idx" ON "WalletEntry"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "InsurancePolicy_customerId_idx" ON "InsurancePolicy"("customerId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_rentalId_idx" ON "InsurancePolicy"("rentalId");

-- CreateIndex
CREATE INDEX "Alert_status_priority_createdAt_idx" ON "Alert"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_vehicleId_idx" ON "Alert"("vehicleId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Incident_customerId_idx" ON "Incident"("customerId");

-- CreateIndex
CREATE INDEX "Dispute_customerId_idx" ON "Dispute"("customerId");

-- CreateIndex
CREATE INDEX "Dispute_rentalId_status_idx" ON "Dispute"("rentalId", "status");

-- CreateIndex
CREATE INDEX "Claim_customerId_idx" ON "Claim"("customerId");

-- CreateIndex
CREATE INDEX "SupportConversation_customerId_idx" ON "SupportConversation"("customerId");

-- CreateIndex
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MaintenanceTask_vehicleId_idx" ON "MaintenanceTask"("vehicleId");

-- CreateIndex
CREATE INDEX "MaintenanceTask_status_idx" ON "MaintenanceTask"("status");

-- CreateIndex
CREATE INDEX "FieldTask_status_priority_idx" ON "FieldTask"("status", "priority");

-- CreateIndex
CREATE INDEX "FieldTask_assigneeId_idx" ON "FieldTask"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_idempotencyKey_key" ON "Inspection"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "BatterySwap_idempotencyKey_key" ON "BatterySwap"("idempotencyKey");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_scope_key_key" ON "IdempotencyRecord"("scope", "key");

-- AddForeignKey
ALTER TABLE "Tracker" ADD CONSTRAINT "Tracker_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCommand" ADD CONSTRAINT "VehicleCommand_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalEvent" ADD CONSTRAINT "RentalEvent_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCard" ADD CONSTRAINT "PaymentCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUp" ADD CONSTRAINT "TopUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldTask" ADD CONSTRAINT "FieldTask_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_fieldTaskId_fkey" FOREIGN KEY ("fieldTaskId") REFERENCES "FieldTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatterySwap" ADD CONSTRAINT "BatterySwap_fieldTaskId_fkey" FOREIGN KEY ("fieldTaskId") REFERENCES "FieldTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ───────────── SQL manual (não expressável no schema Prisma) ─────────────

-- Cercas: índice espacial para ST_Contains / ST_Intersects.
CREATE INDEX "Zone_geom_gist" ON "Zone" USING GIST ("geom");

-- Motos: índice espacial na posição (busca por raio com geography).
CREATE INDEX "Vehicle_position_gist" ON "Vehicle"
  USING GIST ((ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography));

-- Uma reserva ativa por cliente e por moto.
CREATE UNIQUE INDEX "Reservation_one_active_per_customer" ON "Reservation" ("customerId") WHERE "status" = 'active';
CREATE UNIQUE INDEX "Reservation_one_active_per_vehicle" ON "Reservation" ("vehicleId") WHERE "status" = 'active';

-- Um aluguel em andamento por cliente e por moto.
CREATE UNIQUE INDEX "Rental_one_open_per_customer" ON "Rental" ("customerId") WHERE "status" IN ('active', 'paused', 'ending');
CREATE UNIQUE INDEX "Rental_one_open_per_vehicle" ON "Rental" ("vehicleId") WHERE "status" IN ('active', 'paused', 'ending');

-- Um plano ativo por código; uma assinatura ativa por cliente; uma contestação aberta por aluguel.
CREATE UNIQUE INDEX "PricingPlan_one_active_per_code" ON "PricingPlan" ("code") WHERE "active" = true;
CREATE UNIQUE INDEX "Subscription_one_active_per_customer" ON "Subscription" ("customerId") WHERE "status" = 'active';
CREATE UNIQUE INDEX "Dispute_one_open_per_rental" ON "Dispute" ("rentalId") WHERE "status" IN ('open', 'under_review');

-- Limites de velocidade nunca acima de 32 km/h (defesa em profundidade).
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_speed_limit_range" CHECK ("speedLimitKmh" BETWEEN 0 AND 32);
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_speed_limit_range" CHECK ("speedLimitKmh" IS NULL OR "speedLimitKmh" BETWEEN 0 AND 32);
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_speed_limit_range" CHECK ("speedLimitKmh" IS NULL OR "speedLimitKmh" BETWEEN 0 AND 32);
