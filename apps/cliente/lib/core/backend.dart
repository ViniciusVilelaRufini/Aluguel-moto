import 'dart:math';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'errors.dart';

String newIdempotencyKey() {
  final r = Random.secure();
  final b = List<int>.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  String h(int i) => b[i].toRadixString(16).padLeft(2, '0');
  return '${h(0)}${h(1)}${h(2)}${h(3)}-${h(4)}${h(5)}-${h(6)}${h(7)}-${h(8)}${h(9)}-'
      '${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}';
}

/// Fronteira unica entre as telas e a API. As telas nunca usam `VoltiApi` direto,
/// o que permite trocar por um fake nos testes de widget.
abstract class Backend {
  // conta
  Future<Me> me();
  Future<void> updateProfile({String? name, String? phone, String? emergencyName, String? emergencyPhone});
  Future<Consents> consents();
  Future<Consents> updateConsents({required bool terms, required bool location, required bool marketing});
  Future<void> registerDevice(String fcmToken, DevicePlatform platform);

  // kyc
  Future<KycUploads> kycUploads(DocumentType type);
  Future<void> upload(PresignedUpload target, Uint8List bytes, String contentType);
  Future<KycStatusResponse> submitKyc(KycSubmitRequest request);
  Future<KycStatusResponse> kycStatus();

  // mapa
  Future<List<VehicleSummary>> nearby(double lat, double lng, {double? minRangeKm});
  Future<List<GeoZone>> zones();
  Future<Vehicle> vehicleByCode(String code);
  Future<void> ring(String vehicleId);

  // reserva
  Future<Reservation?> currentReservation();
  Future<Reservation> reserve(String vehicleId);
  Future<void> cancelReservation(String id);

  // contratacao
  Future<List<PricingPlan>> plans();
  Future<List<InsuranceCoverageOption>> coverages();
  Future<Quote> quote(PlanCode plan, InsuranceCoverage coverage, {String? coupon});
  Future<List<PaymentCard>> cards();
  Future<PaymentCard> addCard(String token);
  Future<Wallet> wallet();
  Future<List<MinutePackage>> minutePackages();
  Future<TopUp> topUp({required String packageId});
  Future<RentalStartResult> startRental(StartRentalRequest request, {String? idempotencyKey});
  Future<Deposit> deposit(String id);

  // aluguel
  Future<Rental?> currentRental();
  Future<Rental> rental(String id);
  Future<Rental> pause(String id);
  Future<Rental> resume(String id);
  Future<Rental> swap(String id, String newVehicleId, String reason);
  Future<void> wellbeing(String id, {required bool ok, String? note});
  Future<LocationShare> shareLocation(String id);
  Future<Incident> reportIncident(IncidentCategory category, String description, {String? rentalId, String? vehicleId});

  // devolucao e recibo
  Future<PresignedUpload> returnPhotoUpload(String rentalId);
  /// [idempotencyKey]: uma por tentativa de encerramento, reutilizada nas repeticoes (decisao #17).
  Future<Rental> endRental(String rentalId, String photoKey, {String? idempotencyKey});
  Future<Receipt> receipt(String rentalId);
  Future<void> rate(String rentalId, int stars, String? comment);

  // conta
  Future<List<Rental>> rentals();
  Future<List<Subscription>> subscriptions();
  Future<Subscription> subscribe(SubscriptionPlanCode code);
  Future<void> cancelSubscription(String id);
  Future<Dispute> dispute(String rentalId, String reason, String? description);
  Future<Claim> claim(String rentalId, ClaimType type, String description);
  Future<List<SupportConversation>> conversations();
  Future<SupportConversation> openConversation(String subject, String message, {String? rentalId});
  Future<List<SupportMessage>> messages(String conversationId);
  Future<SupportMessage> sendMessage(String conversationId, String body);
  Future<LgpdExport> exportData();
  Future<AccountDeletion> deleteAccount();
}

class ApiBackend implements Backend {
  ApiBackend(this._api);
  final VoltiApi _api;

  Future<T> _run<T>(Future<T> Function() call) async {
    try {
      return await call();
    } catch (e) {
      throw toFailure(e);
    }
  }

  @override
  Future<Me> me() => _run(() async => (await _api.getAuthApi().getMe()).data!);

  @override
  Future<void> updateProfile({String? name, String? phone, String? emergencyName, String? emergencyPhone}) =>
      _run(() async {
        await _api.getAuthApi().updateMe(
              meUpdate: MeUpdate((b) => b
                ..name = name
                ..phone = phone
                ..emergencyContactName = emergencyName
                ..emergencyContactPhone = emergencyPhone),
            );
      });

  @override
  Future<Consents> consents() => _run(() async => (await _api.getLgpdApi().getConsents()).data!);

  @override
  Future<Consents> updateConsents({required bool terms, required bool location, required bool marketing}) =>
      _run(() async => (await _api.getLgpdApi().updateConsents(
            consentsUpdate: ConsentsUpdate((b) => b
              ..termsVersion = '1.0'
              ..termsAccepted = terms
              ..locationTracking = location
              ..marketing = marketing),
          ))
          .data!);

  @override
  Future<void> registerDevice(String fcmToken, DevicePlatform platform) => _run(() async {
        await _api.getAuthApi().registerDevice(
              deviceRegistration: DeviceRegistration((b) => b
                ..fcmToken = fcmToken
                ..platform = platform),
            );
      });

  @override
  Future<KycUploads> kycUploads(DocumentType type) => _run(() async => (await _api.getKycApi().createKycUploads(
        kycUploadRequest: KycUploadRequest((b) => b
          ..documentType = type
          ..contentType = UploadContentType.imageSlashJpeg
          ..withBack = false),
      ))
          .data!);

  @override
  Future<void> upload(PresignedUpload target, Uint8List bytes, String contentType) => _run(() async {
        // URL pre-assinada: cliente HTTP separado, sem o bearer da API.
        final dio = Dio(BaseOptions(
          connectTimeout: const Duration(seconds: 10),
          sendTimeout: const Duration(seconds: 60),
        ));
        final headers = <String, dynamic>{'Content-Type': contentType};
        target.headers.forEach((k, v) => headers[k] = v);
        await dio.put<void>(target.uploadUrl, data: bytes, options: Options(headers: headers));
      });

  @override
  Future<KycStatusResponse> submitKyc(KycSubmitRequest request) => _run(() async => (await _api
          .getKycApi()
          .submitKyc(kycSubmitRequest: request, validateStatus: (s) => s != null && s >= 200 && s < 300))
      .data!);

  @override
  Future<KycStatusResponse> kycStatus() => _run(() async => (await _api.getKycApi().getKycStatus()).data!);

  @override
  Future<List<VehicleSummary>> nearby(double lat, double lng, {double? minRangeKm}) => _run(() async =>
      (await _api.getVehiclesApi().listNearbyVehicles(lat: lat, lng: lng, radiusM: 1500, minRangeKm: minRangeKm))
          .data!
          .items
          .toList());

  @override
  Future<List<GeoZone>> zones() => _run(() async => (await _api.getZonesApi().listZones()).data!.items.toList());

  @override
  Future<Vehicle> vehicleByCode(String code) =>
      _run(() async => (await _api.getVehiclesApi().getVehicleByCode(code: code)).data!);

  @override
  Future<void> ring(String vehicleId) => _run(() async {
        await _api.getVehiclesApi().ringVehicle(id: vehicleId);
      });

  @override
  Future<Reservation?> currentReservation() =>
      _run(() async => (await _api.getReservationsApi().getCurrentReservation()).data?.reservation);

  @override
  Future<Reservation> reserve(String vehicleId) => _run(() async => (await _api.getReservationsApi().createReservation(
        reservationCreate: ReservationCreate((b) => b..vehicleId = vehicleId),
      ))
          .data!);

  @override
  Future<void> cancelReservation(String id) => _run(() async {
        await _api.getReservationsApi().cancelReservation(id: id);
      });

  @override
  Future<List<PricingPlan>> plans() =>
      _run(() async => (await _api.getPricingApi().listPricingPlans()).data!.items.toList());

  @override
  Future<List<InsuranceCoverageOption>> coverages() =>
      _run(() async => (await _api.getInsuranceApi().listInsuranceCoverages()).data!.items.toList());

  @override
  Future<Quote> quote(PlanCode plan, InsuranceCoverage coverage, {String? coupon}) =>
      _run(() async => (await _api.getPricingApi().quotePrice(
            quoteRequest: QuoteRequest((b) => b
              ..planCode = plan
              ..coverage = coverage
              ..couponCode = (coupon == null || coupon.isEmpty) ? null : coupon),
          ))
          .data!);

  @override
  Future<List<PaymentCard>> cards() =>
      _run(() async => (await _api.getPaymentsApi().listPaymentCards()).data!.items.toList());

  @override
  Future<PaymentCard> addCard(String token) => _run(() async => (await _api.getPaymentsApi().addPaymentCard(
        idempotencyKey: newIdempotencyKey(),
        paymentCardCreate: PaymentCardCreate((b) => b
          ..cardToken = token
          ..setDefault = true),
      ))
          .data!);

  @override
  Future<Wallet> wallet() => _run(() async => (await _api.getWalletApi().getWallet()).data!);

  @override
  Future<List<MinutePackage>> minutePackages() =>
      _run(() async => (await _api.getWalletApi().listMinutePackages()).data!.items.toList());

  @override
  Future<TopUp> topUp({required String packageId}) => _run(() async => (await _api.getWalletApi().createWalletTopUp(
        idempotencyKey: newIdempotencyKey(),
        topUpRequest: TopUpRequest((b) => b
          ..method = TopUpMethod.pix
          ..packageId = packageId),
      ))
          .data!);

  @override
  Future<RentalStartResult> startRental(StartRentalRequest request, {String? idempotencyKey}) =>
      _run(() async => (await _api.getRentalsApi().startRental(
            idempotencyKey: idempotencyKey ?? newIdempotencyKey(),
            startRentalRequest: request,
            // 202 (Pix) e resposta valida.
            validateStatus: (s) => s != null && s >= 200 && s < 300,
          ))
          .data!);

  @override
  Future<Deposit> deposit(String id) => _run(() async => (await _api.getPaymentsApi().getDeposit(id: id)).data!);

  @override
  Future<Rental?> currentRental() => _run(() async => (await _api.getRentalsApi().getCurrentRental()).data?.rental);

  @override
  Future<Rental> rental(String id) => _run(() async => (await _api.getRentalsApi().getRental(id: id)).data!);

  @override
  Future<Rental> pause(String id) => _run(() async => (await _api.getRentalsApi().pauseRental(id: id)).data!);

  @override
  Future<Rental> resume(String id) => _run(() async => (await _api.getRentalsApi().resumeRental(id: id)).data!);

  @override
  Future<Rental> swap(String id, String newVehicleId, String reason) =>
      _run(() async => (await _api.getRentalsApi().swapRentalVehicle(
            id: id,
            swapVehicleRequest: SwapVehicleRequest((b) => b
              ..newVehicleId = newVehicleId
              ..reason = reason),
          ))
          .data!);

  @override
  Future<void> wellbeing(String id, {required bool ok, String? note}) => _run(() async {
        await _api.getRentalsApi().respondWellbeingCheck(
              id: id,
              wellbeingResponse: WellbeingResponse((b) => b
                ..ok = ok
                ..note = note),
            );
      });

  @override
  Future<LocationShare> shareLocation(String id) => _run(() async => (await _api.getRentalsApi().shareRentalLocation(
        id: id,
        locationShareRequest: LocationShareRequest((b) => b..durationMinutes = 60),
      ))
          .data!);

  @override
  Future<Incident> reportIncident(IncidentCategory category, String description,
          {String? rentalId, String? vehicleId}) =>
      _run(() async => (await _api.getSupportApi().createIncident(
            incidentCreate: IncidentCreate((b) => b
              ..category = category
              ..description = description
              ..rentalId = rentalId
              ..vehicleId = vehicleId),
          ))
          .data!);

  @override
  Future<PresignedUpload> returnPhotoUpload(String rentalId) =>
      _run(() async => (await _api.getRentalsApi().createReturnPhotoUpload(
            id: rentalId,
            uploadRequest: UploadRequest((b) => b..contentType = UploadContentType.imageSlashJpeg),
          ))
          .data!);

  @override
  Future<Rental> endRental(String rentalId, String photoKey, {String? idempotencyKey}) =>
      _run(() async => (await _api.getRentalsApi().endRental(
        id: rentalId,
        idempotencyKey: idempotencyKey,
        endRentalRequest: EndRentalRequest((b) => b..returnPhotoObjectKey = photoKey),
        validateStatus: (s) => s != null && s >= 200 && s < 300,
      ))
          .data!);

  @override
  Future<Receipt> receipt(String rentalId) =>
      _run(() async => (await _api.getRentalsApi().getRentalReceipt(id: rentalId)).data!);

  @override
  Future<void> rate(String rentalId, int stars, String? comment) => _run(() async {
        await _api.getRentalsApi().rateRental(
              id: rentalId,
              ratingRequest: RatingRequest((b) => b
                ..stars = stars
                ..comment = comment),
            );
      });

  @override
  Future<List<Rental>> rentals() => _run(() async => (await _api.getRentalsApi().listRentals()).data!.items.toList());

  @override
  Future<List<Subscription>> subscriptions() =>
      _run(() async => (await _api.getPaymentsApi().listSubscriptions()).data!.items.toList());

  @override
  Future<Subscription> subscribe(SubscriptionPlanCode code) =>
      _run(() async => (await _api.getPaymentsApi().createSubscription(
            idempotencyKey: newIdempotencyKey(),
            subscriptionCreate: SubscriptionCreate((b) => b..planCode = code),
          ))
          .data!);

  @override
  Future<void> cancelSubscription(String id) => _run(() async {
        await _api.getPaymentsApi().cancelSubscription(id: id);
      });

  @override
  Future<Dispute> dispute(String rentalId, String reason, String? description) =>
      _run(() async => (await _api.getSupportApi().createDispute(
            disputeCreate: DisputeCreate((b) => b
              ..rentalId = rentalId
              ..reason = reason
              ..description = description),
          ))
          .data!);

  @override
  Future<Claim> claim(String rentalId, ClaimType type, String description) =>
      _run(() async => (await _api.getSupportApi().createClaim(
            claimCreate: ClaimCreate((b) => b
              ..rentalId = rentalId
              ..type = type
              ..description = description
              ..occurredAt = DateTime.now().toUtc()),
          ))
          .data!);

  @override
  Future<List<SupportConversation>> conversations() =>
      _run(() async => (await _api.getSupportApi().listSupportConversations()).data!.items.toList());

  @override
  Future<SupportConversation> openConversation(String subject, String message, {String? rentalId}) =>
      _run(() async => (await _api.getSupportApi().createSupportConversation(
            supportConversationCreate: SupportConversationCreate((b) => b
              ..subject = subject
              ..message = message
              ..rentalId = rentalId),
          ))
          .data!);

  @override
  Future<List<SupportMessage>> messages(String conversationId) =>
      _run(() async => (await _api.getSupportApi().listSupportMessages(id: conversationId)).data!.items.toList());

  @override
  Future<SupportMessage> sendMessage(String conversationId, String body) =>
      _run(() async => (await _api.getSupportApi().sendSupportMessage(
            id: conversationId,
            supportMessageCreate: SupportMessageCreate((b) => b..body = body),
          ))
          .data!);

  @override
  Future<LgpdExport> exportData() => _run(() async => (await _api.getLgpdApi().exportMyData()).data!);

  @override
  Future<AccountDeletion> deleteAccount() => _run(() async => (await _api.getLgpdApi().deleteMyAccount()).data!);
}

final backendProvider = Provider<Backend>((ref) => ApiBackend(ref.watch(apiClientProvider)));
