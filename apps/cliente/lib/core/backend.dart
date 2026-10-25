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

/// `GET /rentals/current`: o aluguel e a troca de bateria na estacao em
/// andamento nele (`currentStationSwap`), para o app retomar a tela da troca.
/// [batterySwapFeeCents]: taxa por troca no plano do aluguel (0 nos planos
/// diario/semanal/mensal; nos por minuto/hora, o `feeCents` que o POST vai
/// congelar), para a confirmacao mostrar "Taxa R$ X" antes do POST. Opcional.
typedef CurrentRentalState = ({Rental? rental, StationSwap? stationSwap, int? batterySwapFeeCents});

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

  // mapa e galpao
  Future<List<GeoZone>> zones();
  /// Galpoes ativos; com [lat]/[lng] a API ordena por distancia (`distanceM`).
  Future<List<Depot>> depots({double? lat, double? lng});
  Future<Depot> depot(String id);
  /// Motos livres do galpao ("Escolher moto").
  Future<List<Vehicle>> depotVehicles(String depotId);
  /// Catalogo de modelos (foto, categoria e preco por modelo).
  Future<List<VehicleModel>> vehicleModels();
  /// Estacoes de troca de bateria (mapa da home).
  Future<List<SwapStation>> swapStations({double? lat, double? lng});
  Future<Vehicle> vehicleByCode(String code);
  Future<void> ring(String vehicleId);

  // troca de bateria na estacao (QR)
  /// `POST /swap-stations/{id}/swaps`. [idempotencyKey]: uma por tentativa de
  /// "Abrir compartimento", reutilizada nas repeticoes (nao abre outra vaga).
  /// [lat]/[lng]: posicao do celular, so para a validacao de 50 m.
  Future<StationSwap> createStationSwap({
    required String stationId,
    required String stationCode,
    required String rentalId,
    required double lat,
    required double lng,
    required String idempotencyKey,
  });
  Future<StationSwap> stationSwap(String stationId, String swapId);
  /// So antes da devolucao (`opening_slot`/`awaiting_return`).
  Future<StationSwap> cancelStationSwap(String stationId, String swapId);

  // reserva
  Future<Reservation?> currentReservation();
  /// Reserva de retirada no galpao. [idempotencyKey]: uma por tentativa de confirmar.
  Future<Reservation> createDepotReservation(ReservationCreate request, {String? idempotencyKey});
  Future<void> cancelReservation(String id);

  // entrega no galpao ("Confira sua moto")
  Future<Handover> handover(String id);
  /// Aceite: o aluguel comeca e a moto destrava. [idempotencyKey]: uma por entrega,
  /// reutilizada no toque duplo e nas novas tentativas.
  Future<Rental> acceptHandover(String id, String idempotencyKey);
  /// Problema apontado: a entrega fica `disputed` e o suporte abre uma conversa.
  Future<Handover> disputeHandover(String id, String reason);

  // contratacao
  Future<List<PricingPlan>> plans();
  Future<List<InsuranceCoverageOption>> coverages();
  /// [vehicleId]: preco por minuto do modelo da moto (plano `minute`).
  Future<Quote> quote(PlanCode plan, InsuranceCoverage coverage, {String? coupon, String? vehicleId});
  /// `POST /me/coupons/validate`: regra do cupom (valor fixo ou percentual) para o resumo da retirada.
  Future<CouponValidation> validateCoupon(String code, {PlanCode? plan});
  Future<List<PaymentCard>> cards();
  Future<PaymentCard> addCard(String token);
  /// `PUT /payments/cards/{id}/default`: cartao usado quando a cobranca nao escolhe um.
  Future<PaymentCard> setDefaultCard(String id);
  /// `DELETE /payments/cards/{id}`: `409` com caucao retida ou assinatura ativa; o padrao removido passa ao mais recente.
  Future<void> deleteCard(String id);
  Future<Wallet> wallet();
  Future<List<MinutePackage>> minutePackages();
  /// Recarga Pix: valor livre em reais ([amountCents], R$ 10 a R$ 1.000) ou pacote ([packageId]); um dos dois.
  /// [idempotencyKey]: uma por tentativa do cliente, reutilizada nas repeticoes da mesma recarga.
  Future<TopUp> topUp({String? packageId, int? amountCents, String? idempotencyKey});
  Future<TopUp> topUpStatus(String id);
  Future<List<WalletEntry>> walletLedger();
  Future<RentalStartResult> startRental(StartRentalRequest request, {String? idempotencyKey});
  Future<Deposit> deposit(String id);

  /// Dividas em aberto do cliente (R2-01): pagamentos `failed` de aluguel/assinatura com saldo devedor
  /// (`outstandingCents` > 0), mais antigas primeiro.
  Future<List<Payment>> openDebts();

  /// Quita a divida [paymentId] por Pix (`POST /payments/{id}/retry`): devolve a cobranca `debt_settlement`
  /// com o QR. Um Pix pendente e valido da mesma divida e reaproveitado pela API.
  Future<Payment> payDebtPix(String paymentId, {String? idempotencyKey});

  /// Pagamento do cliente (acompanha a quitacao ate `paid`).
  Future<Payment> payment(String id);

  // aluguel
  Future<Rental?> currentRental();
  /// Aluguel atual com a troca na estacao em andamento (um GET so).
  Future<CurrentRentalState> currentRentalState();
  Future<Rental> rental(String id);
  Future<Rental> pause(String id);
  Future<Rental> resume(String id);
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
  /// [idempotencyKey]: uma por tentativa do cliente, reutilizada nas repeticoes. [cardId]: cartao mostrado na confirmacao.
  Future<Subscription> subscribe(SubscriptionPlanCode code, {String? cardId, String? idempotencyKey});
  Future<void> cancelSubscription(String id);
  Future<Dispute> dispute(String rentalId, String reason, String? description);
  Future<Claim> claim(String rentalId, ClaimType type, String description, {List<String> photoKeys = const []});
  Future<List<Dispute>> disputes();
  Future<List<Claim>> claims();
  /// URL pre-assinada para anexo (sinistro, boletim de ocorrencia, chat).
  Future<PresignedUpload> supportUpload(UploadContentType contentType);
  Future<List<SupportConversation>> conversations();
  Future<SupportConversation> openConversation(String subject, String message, {String? rentalId});
  Future<List<SupportMessage>> messages(String conversationId);
  Future<SupportMessage> sendMessage(String conversationId, String body, {List<String> attachmentKeys = const []});
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
  Future<List<Depot>> depots({double? lat, double? lng}) =>
      _run(() async => (await _api.getDepotsApi().listDepots(lat: lat, lng: lng)).data!.items.toList());

  @override
  Future<Depot> depot(String id) => _run(() async => (await _api.getDepotsApi().getDepot(id: id)).data!);

  @override
  Future<List<Vehicle>> depotVehicles(String depotId) =>
      _run(() async => (await _api.getDepotsApi().listDepotVehicles(id: depotId)).data!.items.toList());

  @override
  Future<List<VehicleModel>> vehicleModels() =>
      _run(() async => (await _api.getCatalogApi().listVehicleModels()).data!.items.toList());

  @override
  Future<List<SwapStation>> swapStations({double? lat, double? lng}) =>
      _run(() async => (await _api.getStationsApi().listSwapStations(lat: lat, lng: lng)).data!.items.toList());

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
  Future<StationSwap> createStationSwap({
    required String stationId,
    required String stationCode,
    required String rentalId,
    required double lat,
    required double lng,
    required String idempotencyKey,
  }) =>
      _run(() async => (await _api.getStationsApi().createStationSwap(
            id: stationId,
            idempotencyKey: idempotencyKey,
            stationSwapRequest: StationSwapRequest((b) => b
              ..stationCode = stationCode
              ..rentalId = rentalId
              ..lat = lat
              ..lng = lng),
            validateStatus: (s) => s != null && s >= 200 && s < 300,
          ))
          .data!);

  @override
  Future<StationSwap> stationSwap(String stationId, String swapId) =>
      _run(() async => (await _api.getStationsApi().getStationSwap(id: stationId, swapId: swapId)).data!);

  @override
  Future<StationSwap> cancelStationSwap(String stationId, String swapId) =>
      _run(() async => (await _api.getStationsApi().cancelStationSwap(id: stationId, swapId: swapId)).data!);

  @override
  Future<Reservation?> currentReservation() =>
      _run(() async => (await _api.getReservationsApi().getCurrentReservation()).data?.reservation);

  @override
  Future<Reservation> createDepotReservation(ReservationCreate request, {String? idempotencyKey}) =>
      _run(() async => (await _api.getReservationsApi().createReservation(
            reservationCreate: request,
            idempotencyKey: idempotencyKey ?? newIdempotencyKey(),
          ))
          .data!);

  @override
  Future<void> cancelReservation(String id) => _run(() async {
        await _api.getReservationsApi().cancelReservation(id: id);
      });

  @override
  Future<Handover> handover(String id) => _run(() async => (await _api.getHandoversApi().getHandover(id: id)).data!);

  @override
  Future<Rental> acceptHandover(String id, String idempotencyKey) => _run(() async => (await _api.getHandoversApi().acceptHandover(
        id: id,
        idempotencyKey: idempotencyKey,
        validateStatus: (s) => s != null && s >= 200 && s < 300,
      ))
          .data!);

  @override
  Future<Handover> disputeHandover(String id, String reason) => _run(() async => (await _api.getHandoversApi().disputeHandover(
        id: id,
        handoverDispute: HandoverDispute((b) => b..reason = reason),
      ))
          .data!);

  @override
  Future<List<PricingPlan>> plans() =>
      _run(() async => (await _api.getPricingApi().listPricingPlans()).data!.items.toList());

  @override
  Future<List<InsuranceCoverageOption>> coverages() =>
      _run(() async => (await _api.getInsuranceApi().listInsuranceCoverages()).data!.items.toList());

  @override
  Future<Quote> quote(PlanCode plan, InsuranceCoverage coverage, {String? coupon, String? vehicleId}) =>
      _run(() async => (await _api.getPricingApi().quotePrice(
            quoteRequest: QuoteRequest((b) => b
              ..planCode = plan
              ..coverage = coverage
              ..couponCode = (coupon == null || coupon.isEmpty) ? null : coupon
              ..vehicleId = vehicleId),
          ))
          .data!);

  @override
  Future<CouponValidation> validateCoupon(String code, {PlanCode? plan}) =>
      _run(() async => (await _api.getPricingApi().validateMyCoupon(
            couponCodeRequest: CouponCodeRequest((b) => b
              ..code = code
              ..planCode = plan),
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
  Future<PaymentCard> setDefaultCard(String id) =>
      _run(() async => (await _api.getPaymentsApi().setDefaultPaymentCard(id: id)).data!);

  @override
  Future<void> deleteCard(String id) => _run(() async {
        await _api.getPaymentsApi().deletePaymentCard(id: id);
      });

  @override
  Future<Wallet> wallet() => _run(() async => (await _api.getWalletApi().getWallet()).data!);

  @override
  Future<List<MinutePackage>> minutePackages() =>
      _run(() async => (await _api.getWalletApi().listMinutePackages()).data!.items.toList());

  @override
  Future<TopUp> topUp({String? packageId, int? amountCents, String? idempotencyKey}) {
    assert((packageId == null) != (amountCents == null), 'informe packageId ou amountCents');
    return _run(() async => (await _api.getWalletApi().createWalletTopUp(
          idempotencyKey: idempotencyKey ?? newIdempotencyKey(),
          topUpRequest: TopUpRequest((b) => b
            ..method = TopUpMethod.pix
            ..packageId = packageId
            ..amountCents = amountCents),
        ))
            .data!);
  }

  @override
  Future<TopUp> topUpStatus(String id) => _run(() async => (await _api.getWalletApi().getWalletTopUp(id: id)).data!);

  @override
  Future<List<WalletEntry>> walletLedger() =>
      _run(() async => (await _api.getWalletApi().listWalletLedger(limit: 50)).data!.items.toList());

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
  Future<List<Payment>> openDebts() => _run(() async {
        // Todas as paginas: o aviso da home soma todas as dividas em aberto.
        final debts = <Payment>[];
        String? cursor;
        for (var i = 0; i < 20; i++) {
          final page = (await _api.getPaymentsApi().listPayments(status: PaymentStatus.failed, limit: 100, cursor: cursor)).data!;
          debts.addAll(page.items.where((p) => (p.outstandingCents ?? 0) > 0));
          cursor = page.nextCursor;
          if (cursor == null || cursor.isEmpty) break;
        }
        return debts..sort((a, b) => a.createdAt.compareTo(b.createdAt));
      });

  @override
  Future<Payment> payDebtPix(String paymentId, {String? idempotencyKey}) => _run(() async => (await _api.getPaymentsApi().payDebt(
            id: paymentId,
            idempotencyKey: idempotencyKey ?? newIdempotencyKey(),
            debtPaymentRequest: DebtPaymentRequest((b) => b..method = DebtPaymentRequestMethodEnum.pix),
          ))
          .data!);

  @override
  Future<Payment> payment(String id) => _run(() async => (await _api.getPaymentsApi().getPayment(id: id)).data!);

  @override
  Future<Rental?> currentRental() async => (await currentRentalState()).rental;

  @override
  Future<CurrentRentalState> currentRentalState() => _run(() async {
        final data = (await _api.getRentalsApi().getCurrentRental()).data;
        return (rental: data?.rental, stationSwap: data?.currentStationSwap, batterySwapFeeCents: data?.batterySwapFeeCents);
      });

  @override
  Future<Rental> rental(String id) => _run(() async => (await _api.getRentalsApi().getRental(id: id)).data!);

  @override
  Future<Rental> pause(String id) => _run(() async => (await _api.getRentalsApi().pauseRental(id: id)).data!);

  @override
  Future<Rental> resume(String id) => _run(() async => (await _api.getRentalsApi().resumeRental(id: id)).data!);

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
  Future<Subscription> subscribe(SubscriptionPlanCode code, {String? cardId, String? idempotencyKey}) =>
      _run(() async => (await _api.getPaymentsApi().createSubscription(
            idempotencyKey: idempotencyKey ?? newIdempotencyKey(),
            subscriptionCreate: SubscriptionCreate((b) => b
              ..planCode = code
              ..cardId = cardId),
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
  Future<Claim> claim(String rentalId, ClaimType type, String description, {List<String> photoKeys = const []}) =>
      _run(() async => (await _api.getSupportApi().createClaim(
            claimCreate: ClaimCreate((b) {
              b
                ..rentalId = rentalId
                ..type = type
                ..description = description
                ..occurredAt = DateTime.now().toUtc();
              if (photoKeys.isNotEmpty) b.photoObjectKeys.addAll(photoKeys);
            }),
          ))
          .data!);

  @override
  Future<List<Dispute>> disputes() =>
      _run(() async => (await _api.getSupportApi().listDisputes(limit: 50)).data!.items.toList());

  @override
  Future<List<Claim>> claims() => _run(() async => (await _api.getSupportApi().listClaims(limit: 50)).data!.items.toList());

  @override
  Future<PresignedUpload> supportUpload(UploadContentType contentType) =>
      _run(() async => (await _api.getSupportApi().createSupportUpload(
            uploadRequest: UploadRequest((b) => b..contentType = contentType),
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
  Future<SupportMessage> sendMessage(String conversationId, String body, {List<String> attachmentKeys = const []}) =>
      _run(() async => (await _api.getSupportApi().sendSupportMessage(
            id: conversationId,
            supportMessageCreate: SupportMessageCreate((b) {
              b.body = body;
              if (attachmentKeys.isNotEmpty) b.attachmentObjectKeys.addAll(attachmentKeys);
            }),
          ))
          .data!);

  @override
  Future<LgpdExport> exportData() => _run(() async => (await _api.getLgpdApi().exportMyData()).data!);

  @override
  Future<AccountDeletion> deleteAccount() => _run(() async => (await _api.getLgpdApi().deleteMyAccount()).data!);
}

final backendProvider = Provider<Backend>((ref) => ApiBackend(ref.watch(apiClientProvider)));
