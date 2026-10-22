//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_import

import 'package:one_of_serializer/any_of_serializer.dart';
import 'package:one_of_serializer/one_of_serializer.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:built_value/standard_json_plugin.dart';
import 'package:built_value/iso_8601_date_time_serializer.dart';
import 'package:volti_api/src/date_serializer.dart';
import 'package:volti_api/src/model/date.dart';

import 'package:volti_api/src/model/account_deletion.dart';
import 'package:volti_api/src/model/account_deletion_status.dart';
import 'package:volti_api/src/model/actor_type.dart';
import 'package:volti_api/src/model/alert.dart';
import 'package:volti_api/src/model/alert_assign_request.dart';
import 'package:volti_api/src/model/alert_page.dart';
import 'package:volti_api/src/model/alert_priority.dart';
import 'package:volti_api/src/model/alert_resolve_request.dart';
import 'package:volti_api/src/model/alert_status.dart';
import 'package:volti_api/src/model/alert_type.dart';
import 'package:volti_api/src/model/audit_log.dart';
import 'package:volti_api/src/model/audit_log_page.dart';
import 'package:volti_api/src/model/auth_pool.dart';
import 'package:volti_api/src/model/battery.dart';
import 'package:volti_api/src/model/battery_page.dart';
import 'package:volti_api/src/model/battery_status.dart';
import 'package:volti_api/src/model/battery_swap.dart';
import 'package:volti_api/src/model/battery_swap_request.dart';
import 'package:volti_api/src/model/battery_transfer_request.dart';
import 'package:volti_api/src/model/checklist_item.dart';
import 'package:volti_api/src/model/claim.dart';
import 'package:volti_api/src/model/claim_create.dart';
import 'package:volti_api/src/model/claim_page.dart';
import 'package:volti_api/src/model/claim_status.dart';
import 'package:volti_api/src/model/claim_type.dart';
import 'package:volti_api/src/model/claim_update.dart';
import 'package:volti_api/src/model/command_status.dart';
import 'package:volti_api/src/model/command_status_reason.dart';
import 'package:volti_api/src/model/command_type.dart';
import 'package:volti_api/src/model/consents.dart';
import 'package:volti_api/src/model/consents_update.dart';
import 'package:volti_api/src/model/conversation_status.dart';
import 'package:volti_api/src/model/coupon.dart';
import 'package:volti_api/src/model/coupon_code_request.dart';
import 'package:volti_api/src/model/coupon_input.dart';
import 'package:volti_api/src/model/coupon_page.dart';
import 'package:volti_api/src/model/coupon_validation.dart';
import 'package:volti_api/src/model/coverage_item.dart';
import 'package:volti_api/src/model/current_rental.dart';
import 'package:volti_api/src/model/current_reservation.dart';
import 'package:volti_api/src/model/customer.dart';
import 'package:volti_api/src/model/customer_block_request.dart';
import 'package:volti_api/src/model/customer_coupon.dart';
import 'package:volti_api/src/model/customer_coupon_list.dart';
import 'package:volti_api/src/model/customer_coupon_source.dart';
import 'package:volti_api/src/model/customer_coupon_status.dart';
import 'package:volti_api/src/model/customer_maintenance_request.dart';
import 'package:volti_api/src/model/customer_maintenance_request_create.dart';
import 'package:volti_api/src/model/customer_maintenance_request_list.dart';
import 'package:volti_api/src/model/customer_page.dart';
import 'package:volti_api/src/model/customer_stats.dart';
import 'package:volti_api/src/model/customer_status.dart';
import 'package:volti_api/src/model/dashboard_summary.dart';
import 'package:volti_api/src/model/demand_heatmap.dart';
import 'package:volti_api/src/model/deposit.dart';
import 'package:volti_api/src/model/deposit_method.dart';
import 'package:volti_api/src/model/deposit_page.dart';
import 'package:volti_api/src/model/deposit_status.dart';
import 'package:volti_api/src/model/depot.dart';
import 'package:volti_api/src/model/depot_input.dart';
import 'package:volti_api/src/model/depot_list.dart';
import 'package:volti_api/src/model/depot_opening_hours.dart';
import 'package:volti_api/src/model/depot_pickup_list.dart';
import 'package:volti_api/src/model/depot_update.dart';
import 'package:volti_api/src/model/depot_vehicle_list.dart';
import 'package:volti_api/src/model/dev_token_request.dart';
import 'package:volti_api/src/model/dev_token_response.dart';
import 'package:volti_api/src/model/device_platform.dart';
import 'package:volti_api/src/model/device_registration.dart';
import 'package:volti_api/src/model/discount_type.dart';
import 'package:volti_api/src/model/dispute.dart';
import 'package:volti_api/src/model/dispute_create.dart';
import 'package:volti_api/src/model/dispute_decision.dart';
import 'package:volti_api/src/model/dispute_page.dart';
import 'package:volti_api/src/model/dispute_resolve_request.dart';
import 'package:volti_api/src/model/dispute_status.dart';
import 'package:volti_api/src/model/document_type.dart';
import 'package:volti_api/src/model/end_rental_request.dart';
import 'package:volti_api/src/model/fee.dart';
import 'package:volti_api/src/model/fee_input.dart';
import 'package:volti_api/src/model/fee_list.dart';
import 'package:volti_api/src/model/field_task.dart';
import 'package:volti_api/src/model/field_task_complete_request.dart';
import 'package:volti_api/src/model/field_task_create.dart';
import 'package:volti_api/src/model/field_task_page.dart';
import 'package:volti_api/src/model/field_task_status.dart';
import 'package:volti_api/src/model/field_task_type.dart';
import 'package:volti_api/src/model/field_task_update.dart';
import 'package:volti_api/src/model/finance_report.dart';
import 'package:volti_api/src/model/force_end_rental_request.dart';
import 'package:volti_api/src/model/geo_json_polygon.dart';
import 'package:volti_api/src/model/geo_json_polygon_type.dart';
import 'package:volti_api/src/model/geo_zone.dart';
import 'package:volti_api/src/model/geo_zone_input.dart';
import 'package:volti_api/src/model/geo_zone_list.dart';
import 'package:volti_api/src/model/handover.dart';
import 'package:volti_api/src/model/handover_cancel.dart';
import 'package:volti_api/src/model/handover_checklist_item.dart';
import 'package:volti_api/src/model/handover_create.dart';
import 'package:volti_api/src/model/handover_dispute.dart';
import 'package:volti_api/src/model/handover_page.dart';
import 'package:volti_api/src/model/handover_status.dart';
import 'package:volti_api/src/model/handover_type.dart';
import 'package:volti_api/src/model/health_state.dart';
import 'package:volti_api/src/model/health_status.dart';
import 'package:volti_api/src/model/heatmap_point.dart';
import 'package:volti_api/src/model/incident.dart';
import 'package:volti_api/src/model/incident_category.dart';
import 'package:volti_api/src/model/incident_create.dart';
import 'package:volti_api/src/model/incident_page.dart';
import 'package:volti_api/src/model/incident_status.dart';
import 'package:volti_api/src/model/incident_update.dart';
import 'package:volti_api/src/model/inspection.dart';
import 'package:volti_api/src/model/inspection_request.dart';
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/insurance_coverage_option.dart';
import 'package:volti_api/src/model/insurance_coverage_option_list.dart';
import 'package:volti_api/src/model/insurance_coverage_update.dart';
import 'package:volti_api/src/model/insurance_policy.dart';
import 'package:volti_api/src/model/insurance_policy_page.dart';
import 'package:volti_api/src/model/kyc_decision.dart';
import 'package:volti_api/src/model/kyc_review_request.dart';
import 'package:volti_api/src/model/kyc_status.dart';
import 'package:volti_api/src/model/kyc_status_response.dart';
import 'package:volti_api/src/model/kyc_submit_request.dart';
import 'package:volti_api/src/model/kyc_upload_request.dart';
import 'package:volti_api/src/model/kyc_uploads.dart';
import 'package:volti_api/src/model/lgpd_export.dart';
import 'package:volti_api/src/model/location_share.dart';
import 'package:volti_api/src/model/location_share_request.dart';
import 'package:volti_api/src/model/maintenance_kind.dart';
import 'package:volti_api/src/model/maintenance_slot.dart';
import 'package:volti_api/src/model/maintenance_slot_list.dart';
import 'package:volti_api/src/model/maintenance_source.dart';
import 'package:volti_api/src/model/maintenance_status.dart';
import 'package:volti_api/src/model/maintenance_task.dart';
import 'package:volti_api/src/model/maintenance_task_create.dart';
import 'package:volti_api/src/model/maintenance_task_page.dart';
import 'package:volti_api/src/model/maintenance_task_update.dart';
import 'package:volti_api/src/model/me.dart';
import 'package:volti_api/src/model/me_update.dart';
import 'package:volti_api/src/model/mercado_pago_webhook_data.dart';
import 'package:volti_api/src/model/mercado_pago_webhook_event.dart';
import 'package:volti_api/src/model/message_author_type.dart';
import 'package:volti_api/src/model/minute_package.dart';
import 'package:volti_api/src/model/minute_package_list.dart';
import 'package:volti_api/src/model/nearby_vehicles.dart';
import 'package:volti_api/src/model/occupancy_report.dart';
import 'package:volti_api/src/model/occupancy_row.dart';
import 'package:volti_api/src/model/payment.dart';
import 'package:volti_api/src/model/payment_card.dart';
import 'package:volti_api/src/model/payment_card_create.dart';
import 'package:volti_api/src/model/payment_card_list.dart';
import 'package:volti_api/src/model/payment_kind.dart';
import 'package:volti_api/src/model/payment_method.dart';
import 'package:volti_api/src/model/payment_page.dart';
import 'package:volti_api/src/model/payment_status.dart';
import 'package:volti_api/src/model/pickup_mode.dart';
import 'package:volti_api/src/model/pix_charge.dart';
import 'package:volti_api/src/model/pix_key_type.dart';
import 'package:volti_api/src/model/plan_code.dart';
import 'package:volti_api/src/model/plan_revenue.dart';
import 'package:volti_api/src/model/plan_unit.dart';
import 'package:volti_api/src/model/policy_status.dart';
import 'package:volti_api/src/model/presigned_upload.dart';
import 'package:volti_api/src/model/price_breakdown.dart';
import 'package:volti_api/src/model/price_line.dart';
import 'package:volti_api/src/model/pricing_plan.dart';
import 'package:volti_api/src/model/pricing_plan_input.dart';
import 'package:volti_api/src/model/pricing_plan_list.dart';
import 'package:volti_api/src/model/problem.dart';
import 'package:volti_api/src/model/quote.dart';
import 'package:volti_api/src/model/quote_request.dart';
import 'package:volti_api/src/model/rating_request.dart';
import 'package:volti_api/src/model/reason_request.dart';
import 'package:volti_api/src/model/receipt.dart';
import 'package:volti_api/src/model/referral_redeem_request.dart';
import 'package:volti_api/src/model/referral_redemption.dart';
import 'package:volti_api/src/model/referral_reward.dart';
import 'package:volti_api/src/model/referral_reward_page.dart';
import 'package:volti_api/src/model/referral_reward_status.dart';
import 'package:volti_api/src/model/referral_summary.dart';
import 'package:volti_api/src/model/refund_request.dart';
import 'package:volti_api/src/model/rental.dart';
import 'package:volti_api/src/model/rental_event.dart';
import 'package:volti_api/src/model/rental_event_list.dart';
import 'package:volti_api/src/model/rental_event_type.dart';
import 'package:volti_api/src/model/rental_page.dart';
import 'package:volti_api/src/model/rental_start_outcome.dart';
import 'package:volti_api/src/model/rental_start_result.dart';
import 'package:volti_api/src/model/rental_status.dart';
import 'package:volti_api/src/model/report_format.dart';
import 'package:volti_api/src/model/report_group_by.dart';
import 'package:volti_api/src/model/reservation.dart';
import 'package:volti_api/src/model/reservation_create.dart';
import 'package:volti_api/src/model/reservation_status.dart';
import 'package:volti_api/src/model/restriction_entry.dart';
import 'package:volti_api/src/model/restriction_entry_create.dart';
import 'package:volti_api/src/model/restriction_entry_page.dart';
import 'package:volti_api/src/model/revenue_report.dart';
import 'package:volti_api/src/model/revenue_row.dart';
import 'package:volti_api/src/model/send_command_request.dart';
import 'package:volti_api/src/model/service_unlock_request.dart';
import 'package:volti_api/src/model/service_vehicle_status.dart';
import 'package:volti_api/src/model/speed_limiter_check.dart';
import 'package:volti_api/src/model/staff_group.dart';
import 'package:volti_api/src/model/staff_user.dart';
import 'package:volti_api/src/model/staff_user_create.dart';
import 'package:volti_api/src/model/staff_user_page.dart';
import 'package:volti_api/src/model/staff_user_update.dart';
import 'package:volti_api/src/model/start_rental_request.dart';
import 'package:volti_api/src/model/station_swap.dart';
import 'package:volti_api/src/model/station_swap_end_reason.dart';
import 'package:volti_api/src/model/station_swap_page.dart';
import 'package:volti_api/src/model/station_swap_request.dart';
import 'package:volti_api/src/model/station_swap_status.dart';
import 'package:volti_api/src/model/subscription.dart';
import 'package:volti_api/src/model/subscription_create.dart';
import 'package:volti_api/src/model/subscription_list.dart';
import 'package:volti_api/src/model/subscription_pause_request.dart';
import 'package:volti_api/src/model/subscription_plan_code.dart';
import 'package:volti_api/src/model/subscription_status.dart';
import 'package:volti_api/src/model/subscription_vehicle_assignment.dart';
import 'package:volti_api/src/model/support_conversation.dart';
import 'package:volti_api/src/model/support_conversation_create.dart';
import 'package:volti_api/src/model/support_conversation_page.dart';
import 'package:volti_api/src/model/support_conversation_update.dart';
import 'package:volti_api/src/model/support_message.dart';
import 'package:volti_api/src/model/support_message_create.dart';
import 'package:volti_api/src/model/support_message_page.dart';
import 'package:volti_api/src/model/support_message_status.dart';
import 'package:volti_api/src/model/support_read_request.dart';
import 'package:volti_api/src/model/swap_station.dart';
import 'package:volti_api/src/model/swap_station_list.dart';
import 'package:volti_api/src/model/swap_station_qr.dart';
import 'package:volti_api/src/model/swap_vehicle_request.dart';
import 'package:volti_api/src/model/task_priority.dart';
import 'package:volti_api/src/model/top_up.dart';
import 'package:volti_api/src/model/top_up_method.dart';
import 'package:volti_api/src/model/top_up_request.dart';
import 'package:volti_api/src/model/top_up_status.dart';
import 'package:volti_api/src/model/track.dart';
import 'package:volti_api/src/model/track_point.dart';
import 'package:volti_api/src/model/upload_content_type.dart';
import 'package:volti_api/src/model/upload_request.dart';
import 'package:volti_api/src/model/validation_issue.dart';
import 'package:volti_api/src/model/van_stock.dart';
import 'package:volti_api/src/model/vehicle.dart';
import 'package:volti_api/src/model/vehicle_command.dart';
import 'package:volti_api/src/model/vehicle_command_page.dart';
import 'package:volti_api/src/model/vehicle_create.dart';
import 'package:volti_api/src/model/vehicle_model.dart';
import 'package:volti_api/src/model/vehicle_model_input.dart';
import 'package:volti_api/src/model/vehicle_model_list.dart';
import 'package:volti_api/src/model/vehicle_model_update.dart';
import 'package:volti_api/src/model/vehicle_page.dart';
import 'package:volti_api/src/model/vehicle_revenue_report.dart';
import 'package:volti_api/src/model/vehicle_revenue_row.dart';
import 'package:volti_api/src/model/vehicle_service_info.dart';
import 'package:volti_api/src/model/vehicle_service_page.dart';
import 'package:volti_api/src/model/vehicle_service_row.dart';
import 'package:volti_api/src/model/vehicle_service_status.dart';
import 'package:volti_api/src/model/vehicle_status.dart';
import 'package:volti_api/src/model/vehicle_status_change.dart';
import 'package:volti_api/src/model/vehicle_status_counts.dart';
import 'package:volti_api/src/model/vehicle_summary.dart';
import 'package:volti_api/src/model/vehicle_update.dart';
import 'package:volti_api/src/model/wallet.dart';
import 'package:volti_api/src/model/wallet_adjustment_request.dart';
import 'package:volti_api/src/model/wallet_entry.dart';
import 'package:volti_api/src/model/wallet_entry_page.dart';
import 'package:volti_api/src/model/wallet_entry_type.dart';
import 'package:volti_api/src/model/webhook_ack.dart';
import 'package:volti_api/src/model/wellbeing_response.dart';
import 'package:volti_api/src/model/zone_type.dart';

part 'serializers.g.dart';

@SerializersFor([
  AccountDeletion,
  AccountDeletionStatus,
  ActorType,
  Alert,
  AlertAssignRequest,
  AlertPage,
  AlertPriority,
  AlertResolveRequest,
  AlertStatus,
  AlertType,
  AuditLog,
  AuditLogPage,
  AuthPool,
  Battery,
  BatteryPage,
  BatteryStatus,
  BatterySwap,
  BatterySwapRequest,
  BatteryTransferRequest,
  ChecklistItem,
  Claim,
  ClaimCreate,
  ClaimPage,
  ClaimStatus,
  ClaimType,
  ClaimUpdate,
  CommandStatus,
  CommandStatusReason,
  CommandType,
  Consents,
  ConsentsUpdate,
  ConversationStatus,
  Coupon,
  CouponCodeRequest,
  CouponInput,
  CouponPage,
  CouponValidation,
  CoverageItem,
  CurrentRental,
  CurrentReservation,
  Customer,
  CustomerBlockRequest,
  CustomerCoupon,
  CustomerCouponList,
  CustomerCouponSource,
  CustomerCouponStatus,
  CustomerMaintenanceRequest,
  CustomerMaintenanceRequestCreate,
  CustomerMaintenanceRequestList,
  CustomerPage,
  CustomerStats,
  CustomerStatus,
  DashboardSummary,
  DemandHeatmap,
  Deposit,
  DepositMethod,
  DepositPage,
  DepositStatus,
  Depot,
  DepotInput,
  DepotList,
  DepotOpeningHours,
  DepotPickupList,
  DepotUpdate,
  DepotVehicleList,
  DevTokenRequest,
  DevTokenResponse,
  DevicePlatform,
  DeviceRegistration,
  DiscountType,
  Dispute,
  DisputeCreate,
  DisputeDecision,
  DisputePage,
  DisputeResolveRequest,
  DisputeStatus,
  DocumentType,
  EndRentalRequest,
  Fee,
  FeeInput,
  FeeList,
  FieldTask,
  FieldTaskCompleteRequest,
  FieldTaskCreate,
  FieldTaskPage,
  FieldTaskStatus,
  FieldTaskType,
  FieldTaskUpdate,
  FinanceReport,
  ForceEndRentalRequest,
  GeoJsonPolygon,
  GeoJsonPolygonType,
  GeoZone,
  GeoZoneInput,
  GeoZoneList,
  Handover,
  HandoverCancel,
  HandoverChecklistItem,
  HandoverCreate,
  HandoverDispute,
  HandoverPage,
  HandoverStatus,
  HandoverType,
  HealthState,
  HealthStatus,
  HeatmapPoint,
  Incident,
  IncidentCategory,
  IncidentCreate,
  IncidentPage,
  IncidentStatus,
  IncidentUpdate,
  Inspection,
  InspectionRequest,
  InsuranceCoverage,
  InsuranceCoverageOption,
  InsuranceCoverageOptionList,
  InsuranceCoverageUpdate,
  InsurancePolicy,
  InsurancePolicyPage,
  KycDecision,
  KycReviewRequest,
  KycStatus,
  KycStatusResponse,
  KycSubmitRequest,
  KycUploadRequest,
  KycUploads,
  LgpdExport,
  LocationShare,
  LocationShareRequest,
  MaintenanceKind,
  MaintenanceSlot,
  MaintenanceSlotList,
  MaintenanceSource,
  MaintenanceStatus,
  MaintenanceTask,
  MaintenanceTaskCreate,
  MaintenanceTaskPage,
  MaintenanceTaskUpdate,
  Me,
  MeUpdate,
  MercadoPagoWebhookData,
  MercadoPagoWebhookEvent,
  MessageAuthorType,
  MinutePackage,
  MinutePackageList,
  NearbyVehicles,
  OccupancyReport,
  OccupancyRow,
  Payment,
  PaymentCard,
  PaymentCardCreate,
  PaymentCardList,
  PaymentKind,
  PaymentMethod,
  PaymentPage,
  PaymentStatus,
  PickupMode,
  PixCharge,
  PixKeyType,
  PlanCode,
  PlanRevenue,
  PlanUnit,
  PolicyStatus,
  PresignedUpload,
  PriceBreakdown,
  PriceLine,
  PricingPlan,
  PricingPlanInput,
  PricingPlanList,
  Problem,
  Quote,
  QuoteRequest,
  RatingRequest,
  ReasonRequest,
  Receipt,
  ReferralRedeemRequest,
  ReferralRedemption,
  ReferralReward,
  ReferralRewardPage,
  ReferralRewardStatus,
  ReferralSummary,
  RefundRequest,
  Rental,
  RentalEvent,
  RentalEventList,
  RentalEventType,
  RentalPage,
  RentalStartOutcome,
  RentalStartResult,
  RentalStatus,
  ReportFormat,
  ReportGroupBy,
  Reservation,
  ReservationCreate,
  ReservationStatus,
  RestrictionEntry,
  RestrictionEntryCreate,
  RestrictionEntryPage,
  RevenueReport,
  RevenueRow,
  SendCommandRequest,
  ServiceUnlockRequest,
  ServiceVehicleStatus,
  SpeedLimiterCheck,
  StaffGroup,
  StaffUser,
  StaffUserCreate,
  StaffUserPage,
  StaffUserUpdate,
  StartRentalRequest,
  StationSwap,
  StationSwapEndReason,
  StationSwapPage,
  StationSwapRequest,
  StationSwapStatus,
  Subscription,
  SubscriptionCreate,
  SubscriptionList,
  SubscriptionPauseRequest,
  SubscriptionPlanCode,
  SubscriptionStatus,
  SubscriptionVehicleAssignment,
  SupportConversation,
  SupportConversationCreate,
  SupportConversationPage,
  SupportConversationUpdate,
  SupportMessage,
  SupportMessageCreate,
  SupportMessagePage,
  SupportMessageStatus,
  SupportReadRequest,
  SwapStation,
  SwapStationList,
  SwapStationQr,
  SwapVehicleRequest,
  TaskPriority,
  TopUp,
  TopUpMethod,
  TopUpRequest,
  TopUpStatus,
  Track,
  TrackPoint,
  UploadContentType,
  UploadRequest,
  ValidationIssue,
  VanStock,
  Vehicle,
  VehicleCommand,
  VehicleCommandPage,
  VehicleCreate,
  VehicleModel,
  VehicleModelInput,
  VehicleModelList,
  VehicleModelUpdate,
  VehiclePage,
  VehicleRevenueReport,
  VehicleRevenueRow,
  VehicleServiceInfo,
  VehicleServicePage,
  VehicleServiceRow,
  VehicleServiceStatus,
  VehicleStatus,
  VehicleStatusChange,
  VehicleStatusCounts,
  VehicleSummary,
  VehicleUpdate,
  Wallet,
  WalletAdjustmentRequest,
  WalletEntry,
  WalletEntryPage,
  WalletEntryType,
  WebhookAck,
  WellbeingResponse,
  ZoneType,
])
Serializers serializers = (_$serializers.toBuilder()
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(StaffUser)]),
        () => ListBuilder<StaffUser>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Fee)]),
        () => ListBuilder<Fee>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(CustomerCoupon)]),
        () => ListBuilder<CustomerCoupon>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Handover)]),
        () => ListBuilder<Handover>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(MinutePackage)]),
        () => ListBuilder<MinutePackage>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(OccupancyRow)]),
        () => ListBuilder<OccupancyRow>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Incident)]),
        () => ListBuilder<Incident>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(StationSwap)]),
        () => ListBuilder<StationSwap>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltMap, [FullType(String), FullType(HealthState)]),
        () => MapBuilder<String, HealthState>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(InsurancePolicy)]),
        () => ListBuilder<InsurancePolicy>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Track)]),
        () => ListBuilder<Track>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Alert)]),
        () => ListBuilder<Alert>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(VehicleCommand)]),
        () => ListBuilder<VehicleCommand>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(double)]),
        () => ListBuilder<double>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(RevenueRow)]),
        () => ListBuilder<RevenueRow>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(PaymentCard)]),
        () => ListBuilder<PaymentCard>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(TrackPoint)]),
        () => ListBuilder<TrackPoint>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(CoverageItem)]),
        () => ListBuilder<CoverageItem>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(AuditLog)]),
        () => ListBuilder<AuditLog>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(MaintenanceSlot)]),
        () => ListBuilder<MaintenanceSlot>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Payment)]),
        () => ListBuilder<Payment>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(StaffGroup)]),
        () => ListBuilder<StaffGroup>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(MaintenanceTask)]),
        () => ListBuilder<MaintenanceTask>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(VehicleServiceRow)]),
        () => ListBuilder<VehicleServiceRow>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Vehicle)]),
        () => ListBuilder<Vehicle>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [
          FullType(BuiltList, [
            FullType(BuiltList, [FullType(double)])
          ])
        ]),
        () => ListBuilder<BuiltList<BuiltList<double>>>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(FieldTask)]),
        () => ListBuilder<FieldTask>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltMap, [FullType(String), FullType(String)]),
        () => MapBuilder<String, String>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(RestrictionEntry)]),
        () => ListBuilder<RestrictionEntry>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(SwapStation)]),
        () => ListBuilder<SwapStation>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Depot)]),
        () => ListBuilder<Depot>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Subscription)]),
        () => ListBuilder<Subscription>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(PlanRevenue)]),
        () => ListBuilder<PlanRevenue>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Deposit)]),
        () => ListBuilder<Deposit>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(PricingPlan)]),
        () => ListBuilder<PricingPlan>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(DepotOpeningHours)]),
        () => ListBuilder<DepotOpeningHours>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(SupportConversation)]),
        () => ListBuilder<SupportConversation>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(VehicleSummary)]),
        () => ListBuilder<VehicleSummary>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(VehicleModel)]),
        () => ListBuilder<VehicleModel>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(WalletEntry)]),
        () => ListBuilder<WalletEntry>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(PlanCode)]),
        () => ListBuilder<PlanCode>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(GeoZone)]),
        () => ListBuilder<GeoZone>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(PriceLine)]),
        () => ListBuilder<PriceLine>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(VehicleRevenueRow)]),
        () => ListBuilder<VehicleRevenueRow>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Dispute)]),
        () => ListBuilder<Dispute>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(HeatmapPoint)]),
        () => ListBuilder<HeatmapPoint>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Claim)]),
        () => ListBuilder<Claim>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(InsuranceCoverageOption)]),
        () => ListBuilder<InsuranceCoverageOption>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(CustomerMaintenanceRequest)]),
        () => ListBuilder<CustomerMaintenanceRequest>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [
          FullType(BuiltList, [FullType(double)])
        ]),
        () => ListBuilder<BuiltList<double>>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Customer)]),
        () => ListBuilder<Customer>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(HandoverChecklistItem)]),
        () => ListBuilder<HandoverChecklistItem>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Rental)]),
        () => ListBuilder<Rental>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Battery)]),
        () => ListBuilder<Battery>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(ValidationIssue)]),
        () => ListBuilder<ValidationIssue>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(ReferralReward)]),
        () => ListBuilder<ReferralReward>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(int)]),
        () => ListBuilder<int>(),
      )
      ..addBuilderFactory(
        const FullType(
            BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
        () => MapBuilder<String, JsonObject?>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(SupportMessage)]),
        () => ListBuilder<SupportMessage>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Coupon)]),
        () => ListBuilder<Coupon>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(RentalEvent)]),
        () => ListBuilder<RentalEvent>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(String)]),
        () => ListBuilder<String>(),
      )
      ..addBuilderFactory(
        const FullType(BuiltList, [FullType(Reservation)]),
        () => ListBuilder<Reservation>(),
      )
      ..add(const OneOfSerializer())
      ..add(const AnyOfSerializer())
      ..add(const DateSerializer())
      ..add(Iso8601DateTimeSerializer()))
    .build();

Serializers standardSerializers =
    (serializers.toBuilder()..addPlugin(StandardJsonPlugin())).build();
