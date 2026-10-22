// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'serializers.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

Serializers _$serializers = (Serializers().toBuilder()
      ..add(AccountDeletion.serializer)
      ..add(AccountDeletionStatus.serializer)
      ..add(ActorType.serializer)
      ..add(Alert.serializer)
      ..add(AlertAssignRequest.serializer)
      ..add(AlertPage.serializer)
      ..add(AlertPriority.serializer)
      ..add(AlertResolveRequest.serializer)
      ..add(AlertStatus.serializer)
      ..add(AlertType.serializer)
      ..add(AuditLog.serializer)
      ..add(AuditLogPage.serializer)
      ..add(AuthPool.serializer)
      ..add(Battery.serializer)
      ..add(BatteryPage.serializer)
      ..add(BatteryStatus.serializer)
      ..add(BatterySwap.serializer)
      ..add(BatterySwapRequest.serializer)
      ..add(BatteryTransferRequest.serializer)
      ..add(ChecklistItem.serializer)
      ..add(Claim.serializer)
      ..add(ClaimCreate.serializer)
      ..add(ClaimPage.serializer)
      ..add(ClaimStatus.serializer)
      ..add(ClaimType.serializer)
      ..add(ClaimUpdate.serializer)
      ..add(CommandStatus.serializer)
      ..add(CommandStatusReason.serializer)
      ..add(CommandType.serializer)
      ..add(Consents.serializer)
      ..add(ConsentsUpdate.serializer)
      ..add(ConversationStatus.serializer)
      ..add(Coupon.serializer)
      ..add(CouponCodeRequest.serializer)
      ..add(CouponInput.serializer)
      ..add(CouponPage.serializer)
      ..add(CouponValidation.serializer)
      ..add(CoverageItem.serializer)
      ..add(CurrentRental.serializer)
      ..add(CurrentReservation.serializer)
      ..add(Customer.serializer)
      ..add(CustomerBlockRequest.serializer)
      ..add(CustomerCoupon.serializer)
      ..add(CustomerCouponList.serializer)
      ..add(CustomerCouponSource.serializer)
      ..add(CustomerCouponStatus.serializer)
      ..add(CustomerMaintenanceRequest.serializer)
      ..add(CustomerMaintenanceRequestCreate.serializer)
      ..add(CustomerMaintenanceRequestList.serializer)
      ..add(CustomerPage.serializer)
      ..add(CustomerStats.serializer)
      ..add(CustomerStatus.serializer)
      ..add(DashboardSummary.serializer)
      ..add(DemandHeatmap.serializer)
      ..add(Deposit.serializer)
      ..add(DepositMethod.serializer)
      ..add(DepositPage.serializer)
      ..add(DepositStatus.serializer)
      ..add(Depot.serializer)
      ..add(DepotInput.serializer)
      ..add(DepotList.serializer)
      ..add(DepotOpeningHours.serializer)
      ..add(DepotPickupList.serializer)
      ..add(DepotUpdate.serializer)
      ..add(DepotVehicleList.serializer)
      ..add(DevTokenRequest.serializer)
      ..add(DevTokenResponse.serializer)
      ..add(DevTokenResponseTokenTypeEnum.serializer)
      ..add(DevicePlatform.serializer)
      ..add(DeviceRegistration.serializer)
      ..add(DiscountType.serializer)
      ..add(Dispute.serializer)
      ..add(DisputeCreate.serializer)
      ..add(DisputeDecision.serializer)
      ..add(DisputePage.serializer)
      ..add(DisputeResolveRequest.serializer)
      ..add(DisputeStatus.serializer)
      ..add(DocumentType.serializer)
      ..add(EndRentalRequest.serializer)
      ..add(Fee.serializer)
      ..add(FeeInput.serializer)
      ..add(FeeList.serializer)
      ..add(FieldTask.serializer)
      ..add(FieldTaskCompleteRequest.serializer)
      ..add(FieldTaskCreate.serializer)
      ..add(FieldTaskPage.serializer)
      ..add(FieldTaskStatus.serializer)
      ..add(FieldTaskType.serializer)
      ..add(FieldTaskUpdate.serializer)
      ..add(FinanceReport.serializer)
      ..add(ForceEndRentalRequest.serializer)
      ..add(GeoJsonPolygon.serializer)
      ..add(GeoJsonPolygonType.serializer)
      ..add(GeoZone.serializer)
      ..add(GeoZoneInput.serializer)
      ..add(GeoZoneList.serializer)
      ..add(Handover.serializer)
      ..add(HandoverCancel.serializer)
      ..add(HandoverChecklistItem.serializer)
      ..add(HandoverCreate.serializer)
      ..add(HandoverDispute.serializer)
      ..add(HandoverPage.serializer)
      ..add(HandoverStatus.serializer)
      ..add(HandoverType.serializer)
      ..add(HealthState.serializer)
      ..add(HealthStatus.serializer)
      ..add(HeatmapPoint.serializer)
      ..add(Incident.serializer)
      ..add(IncidentCategory.serializer)
      ..add(IncidentCreate.serializer)
      ..add(IncidentPage.serializer)
      ..add(IncidentStatus.serializer)
      ..add(IncidentUpdate.serializer)
      ..add(Inspection.serializer)
      ..add(InspectionRequest.serializer)
      ..add(InsuranceCoverage.serializer)
      ..add(InsuranceCoverageOption.serializer)
      ..add(InsuranceCoverageOptionList.serializer)
      ..add(InsuranceCoverageUpdate.serializer)
      ..add(InsurancePolicy.serializer)
      ..add(InsurancePolicyPage.serializer)
      ..add(KycDecision.serializer)
      ..add(KycReviewRequest.serializer)
      ..add(KycStatus.serializer)
      ..add(KycStatusResponse.serializer)
      ..add(KycSubmitRequest.serializer)
      ..add(KycUploadRequest.serializer)
      ..add(KycUploads.serializer)
      ..add(LgpdExport.serializer)
      ..add(LocationShare.serializer)
      ..add(LocationShareRequest.serializer)
      ..add(MaintenanceKind.serializer)
      ..add(MaintenanceSlot.serializer)
      ..add(MaintenanceSlotList.serializer)
      ..add(MaintenanceSource.serializer)
      ..add(MaintenanceStatus.serializer)
      ..add(MaintenanceTask.serializer)
      ..add(MaintenanceTaskCreate.serializer)
      ..add(MaintenanceTaskPage.serializer)
      ..add(MaintenanceTaskUpdate.serializer)
      ..add(Me.serializer)
      ..add(MeUpdate.serializer)
      ..add(MercadoPagoWebhookData.serializer)
      ..add(MercadoPagoWebhookEvent.serializer)
      ..add(MessageAuthorType.serializer)
      ..add(MinutePackage.serializer)
      ..add(MinutePackageList.serializer)
      ..add(NearbyVehicles.serializer)
      ..add(OccupancyReport.serializer)
      ..add(OccupancyRow.serializer)
      ..add(Payment.serializer)
      ..add(PaymentCard.serializer)
      ..add(PaymentCardCreate.serializer)
      ..add(PaymentCardList.serializer)
      ..add(PaymentKind.serializer)
      ..add(PaymentMethod.serializer)
      ..add(PaymentPage.serializer)
      ..add(PaymentStatus.serializer)
      ..add(PickupMode.serializer)
      ..add(PixCharge.serializer)
      ..add(PixKeyType.serializer)
      ..add(PlanCode.serializer)
      ..add(PlanRevenue.serializer)
      ..add(PlanUnit.serializer)
      ..add(PolicyStatus.serializer)
      ..add(PresignedUpload.serializer)
      ..add(PresignedUploadMethodEnum.serializer)
      ..add(PriceBreakdown.serializer)
      ..add(PriceLine.serializer)
      ..add(PricingPlan.serializer)
      ..add(PricingPlanInput.serializer)
      ..add(PricingPlanList.serializer)
      ..add(Problem.serializer)
      ..add(Quote.serializer)
      ..add(QuoteRequest.serializer)
      ..add(RatingRequest.serializer)
      ..add(ReasonRequest.serializer)
      ..add(Receipt.serializer)
      ..add(ReferralRedeemRequest.serializer)
      ..add(ReferralRedemption.serializer)
      ..add(ReferralReward.serializer)
      ..add(ReferralRewardPage.serializer)
      ..add(ReferralRewardStatus.serializer)
      ..add(ReferralSummary.serializer)
      ..add(RefundRequest.serializer)
      ..add(Rental.serializer)
      ..add(RentalEvent.serializer)
      ..add(RentalEventList.serializer)
      ..add(RentalEventType.serializer)
      ..add(RentalPage.serializer)
      ..add(RentalStartOutcome.serializer)
      ..add(RentalStartResult.serializer)
      ..add(RentalStatus.serializer)
      ..add(ReportFormat.serializer)
      ..add(ReportGroupBy.serializer)
      ..add(Reservation.serializer)
      ..add(ReservationCreate.serializer)
      ..add(ReservationStatus.serializer)
      ..add(RestrictionEntry.serializer)
      ..add(RestrictionEntryCreate.serializer)
      ..add(RestrictionEntryPage.serializer)
      ..add(RevenueReport.serializer)
      ..add(RevenueRow.serializer)
      ..add(SendCommandRequest.serializer)
      ..add(ServiceUnlockRequest.serializer)
      ..add(ServiceVehicleStatus.serializer)
      ..add(SpeedLimiterCheck.serializer)
      ..add(StaffGroup.serializer)
      ..add(StaffUser.serializer)
      ..add(StaffUserCreate.serializer)
      ..add(StaffUserPage.serializer)
      ..add(StaffUserUpdate.serializer)
      ..add(StartRentalRequest.serializer)
      ..add(StationSwap.serializer)
      ..add(StationSwapEndReason.serializer)
      ..add(StationSwapPage.serializer)
      ..add(StationSwapRequest.serializer)
      ..add(StationSwapStatus.serializer)
      ..add(Subscription.serializer)
      ..add(SubscriptionCreate.serializer)
      ..add(SubscriptionList.serializer)
      ..add(SubscriptionPauseRequest.serializer)
      ..add(SubscriptionPlanCode.serializer)
      ..add(SubscriptionStatus.serializer)
      ..add(SubscriptionVehicleAssignment.serializer)
      ..add(SupportConversation.serializer)
      ..add(SupportConversationCreate.serializer)
      ..add(SupportConversationPage.serializer)
      ..add(SupportConversationUpdate.serializer)
      ..add(SupportMessage.serializer)
      ..add(SupportMessageCreate.serializer)
      ..add(SupportMessagePage.serializer)
      ..add(SupportMessageStatus.serializer)
      ..add(SupportReadRequest.serializer)
      ..add(SwapStation.serializer)
      ..add(SwapStationList.serializer)
      ..add(SwapVehicleRequest.serializer)
      ..add(TaskPriority.serializer)
      ..add(TopUp.serializer)
      ..add(TopUpMethod.serializer)
      ..add(TopUpRequest.serializer)
      ..add(TopUpStatus.serializer)
      ..add(Track.serializer)
      ..add(TrackPoint.serializer)
      ..add(UploadContentType.serializer)
      ..add(UploadRequest.serializer)
      ..add(ValidationIssue.serializer)
      ..add(VanStock.serializer)
      ..add(Vehicle.serializer)
      ..add(VehicleCommand.serializer)
      ..add(VehicleCommandPage.serializer)
      ..add(VehicleCreate.serializer)
      ..add(VehicleModel.serializer)
      ..add(VehicleModelInput.serializer)
      ..add(VehicleModelList.serializer)
      ..add(VehicleModelUpdate.serializer)
      ..add(VehiclePage.serializer)
      ..add(VehicleRevenueReport.serializer)
      ..add(VehicleRevenueRow.serializer)
      ..add(VehicleServiceInfo.serializer)
      ..add(VehicleServicePage.serializer)
      ..add(VehicleServiceRow.serializer)
      ..add(VehicleServiceStatus.serializer)
      ..add(VehicleStatus.serializer)
      ..add(VehicleStatusChange.serializer)
      ..add(VehicleStatusCounts.serializer)
      ..add(VehicleSummary.serializer)
      ..add(VehicleUpdate.serializer)
      ..add(Wallet.serializer)
      ..add(WalletAdjustmentRequest.serializer)
      ..add(WalletEntry.serializer)
      ..add(WalletEntryPage.serializer)
      ..add(WalletEntryType.serializer)
      ..add(WebhookAck.serializer)
      ..add(WellbeingResponse.serializer)
      ..add(ZoneType.serializer)
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Alert)]),
          () => ListBuilder<Alert>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(AuditLog)]),
          () => ListBuilder<AuditLog>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Battery)]),
          () => ListBuilder<Battery>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Battery)]),
          () => ListBuilder<Battery>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [
            const FullType(BuiltList, const [
              const FullType(BuiltList, const [const FullType(double)])
            ])
          ]),
          () => ListBuilder<BuiltList<BuiltList<double>>>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Claim)]),
          () => ListBuilder<Claim>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Coupon)]),
          () => ListBuilder<Coupon>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(CoverageItem)]),
          () => ListBuilder<CoverageItem>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(CoverageItem)]),
          () => ListBuilder<CoverageItem>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Customer)]),
          () => ListBuilder<Customer>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(CustomerCoupon)]),
          () => ListBuilder<CustomerCoupon>())
      ..addBuilderFactory(
          const FullType(
              BuiltList, const [const FullType(CustomerMaintenanceRequest)]),
          () => ListBuilder<CustomerMaintenanceRequest>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Deposit)]),
          () => ListBuilder<Deposit>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Depot)]),
          () => ListBuilder<Depot>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(DepotOpeningHours)]),
          () => ListBuilder<DepotOpeningHours>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(DepotOpeningHours)]),
          () => ListBuilder<DepotOpeningHours>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(DepotOpeningHours)]),
          () => ListBuilder<DepotOpeningHours>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Dispute)]),
          () => ListBuilder<Dispute>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Fee)]),
          () => ListBuilder<Fee>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(FieldTask)]),
          () => ListBuilder<FieldTask>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(GeoZone)]),
          () => ListBuilder<GeoZone>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Handover)]),
          () => ListBuilder<Handover>())
      ..addBuilderFactory(
          const FullType(
              BuiltList, const [const FullType(HandoverChecklistItem)]),
          () => ListBuilder<HandoverChecklistItem>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(
              BuiltList, const [const FullType(HandoverChecklistItem)]),
          () => ListBuilder<HandoverChecklistItem>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(HeatmapPoint)]),
          () => ListBuilder<HeatmapPoint>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Incident)]),
          () => ListBuilder<Incident>())
      ..addBuilderFactory(
          const FullType(
              BuiltList, const [const FullType(InsuranceCoverageOption)]),
          () => ListBuilder<InsuranceCoverageOption>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(InsurancePolicy)]),
          () => ListBuilder<InsurancePolicy>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(MaintenanceSlot)]),
          () => ListBuilder<MaintenanceSlot>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(MaintenanceTask)]),
          () => ListBuilder<MaintenanceTask>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(MinutePackage)]),
          () => ListBuilder<MinutePackage>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(OccupancyRow)]),
          () => ListBuilder<OccupancyRow>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Payment)]),
          () => ListBuilder<Payment>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(PaymentCard)]),
          () => ListBuilder<PaymentCard>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(PlanCode)]),
          () => ListBuilder<PlanCode>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(PlanCode)]),
          () => ListBuilder<PlanCode>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(PlanCode)]),
          () => ListBuilder<PlanCode>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(PlanCode)]),
          () => ListBuilder<PlanCode>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(PlanRevenue)]),
          () => ListBuilder<PlanRevenue>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(PriceLine)]),
          () => ListBuilder<PriceLine>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(PricingPlan)]),
          () => ListBuilder<PricingPlan>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(ReferralReward)]),
          () => ListBuilder<ReferralReward>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Rental)]),
          () => ListBuilder<Rental>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Rental)]),
          () => ListBuilder<Rental>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Payment)]),
          () => ListBuilder<Payment>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Track)]),
          () => ListBuilder<Track>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(WalletEntry)]),
          () => ListBuilder<WalletEntry>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Incident)]),
          () => ListBuilder<Incident>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Dispute)]),
          () => ListBuilder<Dispute>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Claim)]),
          () => ListBuilder<Claim>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Subscription)]),
          () => ListBuilder<Subscription>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(CustomerCoupon)]),
          () => ListBuilder<CustomerCoupon>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(ReferralReward)]),
          () => ListBuilder<ReferralReward>())
      ..addBuilderFactory(
          const FullType(
              BuiltList, const [const FullType(CustomerMaintenanceRequest)]),
          () => ListBuilder<CustomerMaintenanceRequest>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Reservation)]),
          () => ListBuilder<Reservation>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Handover)]),
          () => ListBuilder<Handover>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(StationSwap)]),
          () => ListBuilder<StationSwap>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(RentalEvent)]),
          () => ListBuilder<RentalEvent>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Reservation)]),
          () => ListBuilder<Reservation>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(RestrictionEntry)]),
          () => ListBuilder<RestrictionEntry>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(RevenueRow)]),
          () => ListBuilder<RevenueRow>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(StaffGroup)]),
          () => ListBuilder<StaffGroup>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(StaffGroup)]),
          () => ListBuilder<StaffGroup>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(StaffGroup)]),
          () => ListBuilder<StaffGroup>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(StaffGroup)]),
          () => ListBuilder<StaffGroup>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(StaffGroup)]),
          () => ListBuilder<StaffGroup>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(StaffUser)]),
          () => ListBuilder<StaffUser>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(StationSwap)]),
          () => ListBuilder<StationSwap>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Subscription)]),
          () => ListBuilder<Subscription>())
      ..addBuilderFactory(
          const FullType(
              BuiltList, const [const FullType(SupportConversation)]),
          () => ListBuilder<SupportConversation>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(SupportMessage)]),
          () => ListBuilder<SupportMessage>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(SwapStation)]),
          () => ListBuilder<SwapStation>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(TrackPoint)]),
          () => ListBuilder<TrackPoint>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(TrackPoint)]),
          () => ListBuilder<TrackPoint>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(ValidationIssue)]),
          () => ListBuilder<ValidationIssue>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Vehicle)]),
          () => ListBuilder<Vehicle>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(Vehicle)]),
          () => ListBuilder<Vehicle>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(VehicleCommand)]),
          () => ListBuilder<VehicleCommand>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(VehicleModel)]),
          () => ListBuilder<VehicleModel>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(VehicleRevenueRow)]),
          () => ListBuilder<VehicleRevenueRow>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(VehicleServiceRow)]),
          () => ListBuilder<VehicleServiceRow>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(VehicleSummary)]),
          () => ListBuilder<VehicleSummary>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(WalletEntry)]),
          () => ListBuilder<WalletEntry>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(int)]),
          () => ListBuilder<int>())
      ..addBuilderFactory(
          const FullType(BuiltMap,
              const [const FullType(String), const FullType(HealthState)]),
          () => MapBuilder<String, HealthState>())
      ..addBuilderFactory(
          const FullType(
              BuiltMap, const [const FullType(String), const FullType(String)]),
          () => MapBuilder<String, String>())
      ..addBuilderFactory(
          const FullType(BuiltMap, const [
            const FullType(String),
            const FullType.nullable(JsonObject)
          ]),
          () => MapBuilder<String, JsonObject?>())
      ..addBuilderFactory(
          const FullType(BuiltMap, const [
            const FullType(String),
            const FullType.nullable(JsonObject)
          ]),
          () => MapBuilder<String, JsonObject?>()))
    .build();

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
