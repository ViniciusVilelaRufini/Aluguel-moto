//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

import 'dart:async';

import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:dio/dio.dart';

import 'package:volti_api/src/api_util.dart';
import 'package:volti_api/src/model/current_reservation.dart';
import 'package:volti_api/src/model/handover.dart';
import 'package:volti_api/src/model/problem.dart';
import 'package:volti_api/src/model/reservation.dart';
import 'package:volti_api/src/model/reservation_create.dart';

class ReservationsApi {
  final Dio _dio;

  final Serializers _serializers;

  const ReservationsApi(this._dio, this._serializers);

  /// Cancelar reserva
  /// Grátis. A moto volta a &#x60;free&#x60; e, em reserva de galpão antiga feita com caução, a caução é liberada (pré-autorização cancelada ou Pix estornado); a pré-reserva atual não tem caução. Reserva com status &#x60;handover&#x60; (entrega aberta) → &#x60;409&#x60; &#x60;reservation-in-handover&#x60;: o operador cancela a entrega. Reserva já encerrada → &#x60;409&#x60;.
  ///
  /// Parameters:
  /// * [id]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future]
  /// Throws [DioException] if API call or serialization fails
  Future<Response<void>> cancelReservation({
    required String id,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/reservations/{id}'.replaceAll(
        '{' r'id' '}',
        encodeQueryParameter(_serializers, id, const FullType(String))
            .toString());
    final _options = Options(
      method: r'DELETE',
      headers: <String, dynamic>{
        ...?headers,
      },
      extra: <String, dynamic>{
        'secure': <Map<String, String>>[
          {
            'type': 'http',
            'scheme': 'bearer',
            'name': 'customerAuth',
          },
        ],
        ...?extra,
      },
      validateStatus: validateStatus,
    );

    final _response = await _dio.request<Object>(
      _path,
      options: _options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );

    return _response;
  }

  /// Reservar moto
  /// Uma reserva ativa por cliente (&#x60;409&#x60; &#x60;reservation-already-active&#x60;). Dura 15 minutos (TTL no Redis); ao expirar, a moto volta a &#x60;free&#x60;. Exige KYC aprovado (&#x60;403&#x60; &#x60;kyc-not-approved&#x60;) e cliente sem bloqueio. Cliente inadimplente ou com dívida em aberto (pagamento de aluguel/assinatura &#x60;failed&#x60; não quitado, ou débito do balcão &#x60;pending&#x60; com método de balcão) → &#x60;409&#x60; &#x60;payment-pending&#x60; (\&quot;Há um valor a acertar no galpão. Acerte no balcão para pré-reservar de novo.\&quot;); a dívida é acertada no balcão (&#x60;POST /payments/{id}/counter-settle&#x60;).  Sem &#x60;depotId&#x60; (reserva de rua): moto com &#x60;depotId&#x60;, separada por reserva de galpão ou &#x60;awaiting_pickup&#x60; → &#x60;409&#x60; &#x60;vehicle-unavailable&#x60;. Moto do galpão só sai pela entrega.  **Pré-reserva no galpão** (com &#x60;depotId&#x60;): exige &#x60;Idempotency-Key&#x60; e &#x60;pickupMode&#x60; (e &#x60;pickupAt&#x60; em &#x60;scheduled&#x60;). Sem caução, sem plano e sem pagamento no app: &#x60;planCode&#x60;, &#x60;coverage&#x60;, &#x60;depositMethod&#x60;, &#x60;cardId&#x60; e &#x60;couponCode&#x60; são aceitos (apps antigos) e **ignorados**; plano, seguro, contrato e pagamento são feitos no balcão (&#x60;POST /handovers/{id}/counter-checkout&#x60;). Além do KYC, exige termos vigentes e consentimento de localização (&#x60;403&#x60; &#x60;location-consent-required&#x60;; o contrato em papel não substitui o consentimento digital). Valida galpão ativo (&#x60;422&#x60; &#x60;depot-inactive&#x60;), horário dentro do funcionamento (&#x60;422&#x60; &#x60;pickup-outside-hours&#x60;) e de &#x60;maxScheduleDays&#x60; (&#x60;422&#x60; &#x60;pickup-too-far-ahead&#x60;), moto &#x60;free&#x60; no galpão (&#x60;409&#x60; &#x60;vehicle-unavailable&#x60;, inclusive quando outro cliente reservou no mesmo instante) e cliente sem aluguel nem reserva aberta (&#x60;409&#x60; &#x60;rental-already-active&#x60; / &#x60;reservation-open&#x60;), e separa a moto (&#x60;free&#x60; → &#x60;reserved&#x60;). A resposta traz &#x60;pickupCode&#x60; (QR de retirada). Cancelar (&#x60;DELETE /reservations/{id}&#x60;) é grátis; ao vencer &#x60;expiresAt&#x60;, um job expira a reserva.
  ///
  /// Parameters:
  /// * [reservationCreate]
  /// * [idempotencyKey] - Recomendado para reenvios da fila offline. Válida por 24 h.
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [Reservation] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<Reservation>> createReservation({
    required ReservationCreate reservationCreate,
    String? idempotencyKey,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/reservations';
    final _options = Options(
      method: r'POST',
      headers: <String, dynamic>{
        if (idempotencyKey != null) r'Idempotency-Key': idempotencyKey,
        ...?headers,
      },
      extra: <String, dynamic>{
        'secure': <Map<String, String>>[
          {
            'type': 'http',
            'scheme': 'bearer',
            'name': 'customerAuth',
          },
        ],
        ...?extra,
      },
      contentType: 'application/json',
      validateStatus: validateStatus,
    );

    dynamic _bodyData;

    try {
      const _type = FullType(ReservationCreate);
      _bodyData =
          _serializers.serialize(reservationCreate, specifiedType: _type);
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _options.compose(
          _dio.options,
          _path,
        ),
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    final _response = await _dio.request<Object>(
      _path,
      data: _bodyData,
      options: _options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );

    Reservation? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(Reservation),
            ) as Reservation;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<Reservation>(
      data: _responseData,
      headers: _response.headers,
      isRedirect: _response.isRedirect,
      requestOptions: _response.requestOptions,
      redirects: _response.redirects,
      statusCode: _response.statusCode,
      statusMessage: _response.statusMessage,
      extra: _response.extra,
    );
  }

  /// Entrega simulada (só em ambiente de teste)
  /// **Só existe em ambiente de teste**: a API registra esta rota apenas com &#x60;ALLOW_TEST_HANDOVER&#x3D;true&#x60; (em produção, só junto com &#x60;PAYMENT_PROVIDER&#x3D;fake&#x60; e &#x60;ALLOW_FAKE_PAYMENTS&#x3D;true&#x60;). Fora disso a rota não existe e responde &#x60;404&#x60;.  Faz o papel da equipe do galpão para o app de teste: na reserva de galpão &#x60;active&#x60; do próprio cliente, assina o &#x60;pickupCode&#x60; da reserva e cria a entrega de saída como em &#x60;POST /handovers&#x60; (&#x60;pickup&#x60;), com checklist de teste (&#x60;[{ code: teste, ok: true }]&#x60;), sem fotos e com a bateria atual da moto. Mesmas verificações de &#x60;POST /handovers&#x60; (moto &#x60;reserved&#x60;, uma entrega aberta por reserva). Em seguida simula também o checkout do balcão (&#x60;POST /handovers/{id}/counter-checkout&#x60;) com plano &#x60;day&#x60;, quantidade 1, seguro &#x60;basic&#x60;, sem fotos de contrato e pagamento &#x60;cash&#x60; de teste (&#x60;reference: teste&#x60;) no valor da prévia: o aluguel começa, a reserva é convertida e a moto destrava. Devolve a entrega já &#x60;accepted&#x60; (com &#x60;rentalId&#x60;). O operador da entrega é um ator de sistema (o cliente vê \&quot;Equipe Volti\&quot;).  Reserva inexistente, de outro cliente ou sem galpão → &#x60;404&#x60;. Reserva fora de &#x60;active&#x60; (entrega já aberta, encerrada) ou moto não separada → &#x60;409&#x60; (&#x60;conflict&#x60;, &#x60;vehicle-unavailable&#x60;).
  ///
  /// Parameters:
  /// * [id]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [Handover] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<Handover>> createTestHandover({
    required String id,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/reservations/{id}/test-handover'.replaceAll(
        '{' r'id' '}',
        encodeQueryParameter(_serializers, id, const FullType(String))
            .toString());
    final _options = Options(
      method: r'POST',
      headers: <String, dynamic>{
        ...?headers,
      },
      extra: <String, dynamic>{
        'secure': <Map<String, String>>[
          {
            'type': 'http',
            'scheme': 'bearer',
            'name': 'customerAuth',
          },
        ],
        ...?extra,
      },
      validateStatus: validateStatus,
    );

    final _response = await _dio.request<Object>(
      _path,
      options: _options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );

    Handover? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(Handover),
            ) as Handover;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<Handover>(
      data: _responseData,
      headers: _response.headers,
      isRedirect: _response.isRedirect,
      requestOptions: _response.requestOptions,
      redirects: _response.redirects,
      statusCode: _response.statusCode,
      statusMessage: _response.statusMessage,
      extra: _response.extra,
    );
  }

  /// Reserva ativa do cliente
  /// Sempre &#x60;200&#x60;; &#x60;reservation&#x60; fica ausente quando não há reserva aberta. Reserva aberta &#x3D; &#x60;active&#x60; ou &#x60;handover&#x60; (entrega de galpão aberta, aguardando o checkout no balcão; o app mostra \&quot;Sua moto está sendo preparada\&quot; com &#x60;handoverId&#x60;).
  ///
  /// Parameters:
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [CurrentReservation] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<CurrentReservation>> getCurrentReservation({
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/reservations/current';
    final _options = Options(
      method: r'GET',
      headers: <String, dynamic>{
        ...?headers,
      },
      extra: <String, dynamic>{
        'secure': <Map<String, String>>[
          {
            'type': 'http',
            'scheme': 'bearer',
            'name': 'customerAuth',
          },
        ],
        ...?extra,
      },
      validateStatus: validateStatus,
    );

    final _response = await _dio.request<Object>(
      _path,
      options: _options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );

    CurrentReservation? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(CurrentReservation),
            ) as CurrentReservation;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<CurrentReservation>(
      data: _responseData,
      headers: _response.headers,
      isRedirect: _response.isRedirect,
      requestOptions: _response.requestOptions,
      redirects: _response.redirects,
      statusCode: _response.statusCode,
      statusMessage: _response.statusMessage,
      extra: _response.extra,
    );
  }
}
