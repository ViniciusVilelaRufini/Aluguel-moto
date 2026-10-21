//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

import 'dart:async';

import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:dio/dio.dart';

import 'package:volti_api/src/model/mercado_pago_webhook_event.dart';
import 'package:volti_api/src/model/problem.dart';
import 'package:volti_api/src/model/webhook_ack.dart';

class WebhooksApi {
  final Dio _dio;

  final Serializers _serializers;

  const WebhooksApi(this._dio, this._serializers);

  /// Webhook do Mercado Pago
  /// Público. Valida &#x60;x-signature&#x60; (HMAC-SHA256 com &#x60;MERCADOPAGO_WEBHOOK_SECRET&#x60; sobre &#x60;id:&lt;data.id&gt;;request-id:&lt;x-request-id&gt;;ts:&lt;ts&gt;;&#x60;); assinatura inválida → &#x60;401&#x60; e nada é enfileirado. Evento válido é enfileirado e processado de forma idempotente (deduplicação por id do evento): o mesmo evento duas vezes gera um efeito só. Os campos do corpo seguem o formato do Mercado Pago (snake_case).
  ///
  /// Parameters:
  /// * [xSignature] - `ts=<epoch>,v1=<hmac hex>`.
  /// * [xRequestId]
  /// * [mercadoPagoWebhookEvent]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [WebhookAck] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<WebhookAck>> receiveMercadoPagoWebhook({
    required String xSignature,
    required String xRequestId,
    required MercadoPagoWebhookEvent mercadoPagoWebhookEvent,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/webhooks/mercadopago';
    final _options = Options(
      method: r'POST',
      headers: <String, dynamic>{
        r'x-signature': xSignature,
        r'x-request-id': xRequestId,
        ...?headers,
      },
      extra: <String, dynamic>{
        'secure': <Map<String, String>>[],
        ...?extra,
      },
      contentType: 'application/json',
      validateStatus: validateStatus,
    );

    dynamic _bodyData;

    try {
      const _type = FullType(MercadoPagoWebhookEvent);
      _bodyData =
          _serializers.serialize(mercadoPagoWebhookEvent, specifiedType: _type);
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

    WebhookAck? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(WebhookAck),
            ) as WebhookAck;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<WebhookAck>(
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
