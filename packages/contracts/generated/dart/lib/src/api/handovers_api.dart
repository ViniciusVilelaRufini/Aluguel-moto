//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

import 'dart:async';

import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:dio/dio.dart';

import 'package:volti_api/src/api_util.dart';
import 'package:volti_api/src/model/handover.dart';
import 'package:volti_api/src/model/handover_cancel.dart';
import 'package:volti_api/src/model/handover_create.dart';
import 'package:volti_api/src/model/handover_dispute.dart';
import 'package:volti_api/src/model/handover_page.dart';
import 'package:volti_api/src/model/handover_status.dart';
import 'package:volti_api/src/model/handover_type.dart';
import 'package:volti_api/src/model/presigned_upload.dart';
import 'package:volti_api/src/model/problem.dart';
import 'package:volti_api/src/model/rental.dart';
import 'package:volti_api/src/model/upload_request.dart';

class HandoversApi {
  final Dio _dio;

  final Serializers _serializers;

  const HandoversApi(this._dio, this._serializers);

  /// Aceitar a moto e destravar
  /// Só o cliente dono (outro cliente → &#x60;404&#x60;) e só com a entrega &#x60;pending_customer&#x60; (senão &#x60;422&#x60; &#x60;handover-not-pending&#x60;). Numa transação idempotente por entrega: cria o aluguel com o plano, o seguro e a caução da reserva, cobra o plano (assinatura em &#x60;weekly&#x60;/&#x60;monthly&#x60;), converte a reserva, pede o destravamento e a moto vai de &#x60;reserved&#x60; a &#x60;rented&#x60;. Aceites repetidos (mesma ou outra &#x60;Idempotency-Key&#x60;) devolvem o mesmo aluguel, com uma única cobrança. Exige consentimento de localização (&#x60;403&#x60; &#x60;location-consent-required&#x60;).  Pagamento recusado → &#x60;422&#x60; &#x60;payment-declined&#x60;: nada muda, a entrega continua &#x60;pending_customer&#x60; com &#x60;lastError&#x60; e a moto não destrava. Gateway fora → &#x60;503&#x60; &#x60;gateway-unavailable&#x60;. Aluguel já ativo → &#x60;409&#x60; &#x60;rental-already-active&#x60;. &#x60;Idempotency-Key&#x60; ausente ou curta → &#x60;400&#x60;.
  ///
  /// Parameters:
  /// * [id]
  /// * [idempotencyKey] - Chave única por intenção (UUID v4 recomendado). Válida por 24 h.
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [Rental] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<Rental>> acceptHandover({
    required String id,
    required String idempotencyKey,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/handovers/{id}/accept'.replaceAll(
        '{' r'id' '}',
        encodeQueryParameter(_serializers, id, const FullType(String))
            .toString());
    final _options = Options(
      method: r'POST',
      headers: <String, dynamic>{
        r'Idempotency-Key': idempotencyKey,
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

    Rental? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(Rental),
            ) as Rental;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<Rental>(
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

  /// Cancelar a entrega de saída (operação)
  /// Para a saída &#x60;pickup&#x60; com status &#x60;pending_customer&#x60; ou &#x60;disputed&#x60; (outro status ou &#x60;return_depot&#x60; → &#x60;422&#x60; &#x60;handover-not-pending&#x60;; já aceita ou com aceite em andamento → &#x60;409&#x60;). Na mesma transação: a entrega vira &#x60;canceled&#x60; (AuditLog &#x60;handover.cancel&#x60;, evento &#x60;handover.updated&#x60;) e a reserva volta a &#x60;active&#x60; se ainda estiver no prazo (&#x60;expiresAt&#x60; no futuro; o &#x60;pickupCode&#x60; volta em &#x60;GET /reservations/current&#x60; e o operador pode registrar uma nova saída); fora do prazo, a reserva vira &#x60;expired&#x60;, a caução é liberada e a moto volta a &#x60;free&#x60; no galpão.
  ///
  /// Parameters:
  /// * [id]
  /// * [handoverCancel]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [Handover] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<Handover>> cancelHandover({
    required String id,
    required HandoverCancel handoverCancel,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/handovers/{id}/cancel'.replaceAll(
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
            'name': 'staffAuth',
          },
        ],
        ...?extra,
      },
      contentType: 'application/json',
      validateStatus: validateStatus,
    );

    dynamic _bodyData;

    try {
      const _type = FullType(HandoverCancel);
      _bodyData = _serializers.serialize(handoverCancel, specifiedType: _type);
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

  /// Registrar entrega (saída ou chegada no galpão)
  /// - &#x60;pickup&#x60;: o operador lê o &#x60;pickupCode&#x60; da reserva (precisa estar &#x60;active&#x60;, no galpão, com a moto &#x60;reserved&#x60;),   envia checklist de saída, fotos (&#x60;POST /handovers/uploads&#x60;) e bateria. Cria a entrega &#x60;pending_customer&#x60;, a   reserva passa a &#x60;handover&#x60; e o cliente recebe o evento &#x60;handover.pending&#x60;. Código adulterado ou vencido → &#x60;404&#x60;. - &#x60;return_depot&#x60;: chegada do aluguel &#x60;rentalId&#x60; no galpão. A entrega já nasce &#x60;accepted&#x60;, o aluguel é encerrado   pelo fechamento normal e a moto volta a &#x60;free&#x60; com o &#x60;depotId&#x60; do galpão, ou vai para &#x60;maintenance&#x60; se algum   item do checklist vier com &#x60;ok: false&#x60;.
  ///
  /// Parameters:
  /// * [handoverCreate]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [Handover] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<Handover>> createHandover({
    required HandoverCreate handoverCreate,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/handovers';
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
            'name': 'staffAuth',
          },
        ],
        ...?extra,
      },
      contentType: 'application/json',
      validateStatus: validateStatus,
    );

    dynamic _bodyData;

    try {
      const _type = FullType(HandoverCreate);
      _bodyData = _serializers.serialize(handoverCreate, specifiedType: _type);
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

  /// URL de upload da foto da entrega
  /// Upload direto ao bucket (&#x60;handovers/&lt;uuid&gt;.&lt;ext&gt;&#x60;); depois envie as chaves em &#x60;photoKeys&#x60; de &#x60;POST /handovers&#x60;.
  ///
  /// Parameters:
  /// * [uploadRequest]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [PresignedUpload] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<PresignedUpload>> createHandoverPhotoUpload({
    required UploadRequest uploadRequest,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/handovers/uploads';
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
            'name': 'staffAuth',
          },
        ],
        ...?extra,
      },
      contentType: 'application/json',
      validateStatus: validateStatus,
    );

    dynamic _bodyData;

    try {
      const _type = FullType(UploadRequest);
      _bodyData = _serializers.serialize(uploadRequest, specifiedType: _type);
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

    PresignedUpload? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(PresignedUpload),
            ) as PresignedUpload;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<PresignedUpload>(
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

  /// Apontar problema na moto
  /// Só o cliente dono (outro cliente → &#x60;404&#x60;) e só com a entrega &#x60;pending_customer&#x60; (&#x60;422&#x60; &#x60;handover-not-pending&#x60;). A entrega passa a &#x60;disputed&#x60;, abre um ticket de suporte e a moto continua separada (&#x60;reserved&#x60;) até o suporte resolver.
  ///
  /// Parameters:
  /// * [id]
  /// * [handoverDispute]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [Handover] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<Handover>> disputeHandover({
    required String id,
    required HandoverDispute handoverDispute,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/handovers/{id}/dispute'.replaceAll(
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
      contentType: 'application/json',
      validateStatus: validateStatus,
    );

    dynamic _bodyData;

    try {
      const _type = FullType(HandoverDispute);
      _bodyData = _serializers.serialize(handoverDispute, specifiedType: _type);
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

  /// Entrega (\&quot;Confira sua moto\&quot;)
  /// Cliente: só a entrega da própria reserva ou aluguel (senão &#x60;404&#x60;). Traz checklist, bateria e as fotos em &#x60;photoUrls&#x60; (links assinados, 24 h). O operador acompanha o status e &#x60;lastError&#x60; (ex.: pagamento não aprovado).
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
  Future<Response<Handover>> getHandover({
    required String id,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/handovers/{id}'.replaceAll(
        '{' r'id' '}',
        encodeQueryParameter(_serializers, id, const FullType(String))
            .toString());
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
            'name': 'staffAuth',
          },
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

  /// Entregas (operação, painel e disputas)
  /// Mais recentes primeiro. &#x60;suporte&#x60; usa &#x60;status&#x3D;disputed&#x60; para a fila de disputas.
  ///
  /// Parameters:
  /// * [cursor] - Cursor opaco devolvido em `nextCursor` da página anterior.
  /// * [limit] - Itens por página.
  /// * [status]
  /// * [depotId]
  /// * [type]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [HandoverPage] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<HandoverPage>> listHandovers({
    String? cursor,
    int? limit = 20,
    HandoverStatus? status,
    String? depotId,
    HandoverType? type,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/handovers';
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
            'name': 'staffAuth',
          },
        ],
        ...?extra,
      },
      validateStatus: validateStatus,
    );

    final _queryParameters = <String, dynamic>{
      if (cursor != null)
        r'cursor':
            encodeQueryParameter(_serializers, cursor, const FullType(String)),
      if (limit != null)
        r'limit':
            encodeQueryParameter(_serializers, limit, const FullType(int)),
      if (status != null)
        r'status': encodeQueryParameter(
            _serializers, status, const FullType(HandoverStatus)),
      if (depotId != null)
        r'depotId':
            encodeQueryParameter(_serializers, depotId, const FullType(String)),
      if (type != null)
        r'type': encodeQueryParameter(
            _serializers, type, const FullType(HandoverType)),
    };

    final _response = await _dio.request<Object>(
      _path,
      options: _options,
      queryParameters: _queryParameters,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );

    HandoverPage? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(HandoverPage),
            ) as HandoverPage;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<HandoverPage>(
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
