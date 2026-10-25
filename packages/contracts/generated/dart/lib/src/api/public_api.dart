//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

import 'dart:async';

import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:dio/dio.dart';

import 'package:volti_api/src/api_util.dart';
import 'package:volti_api/src/model/problem.dart';
import 'package:volti_api/src/model/shared_location.dart';

class PublicApi {
  final Dio _dio;

  final Serializers _serializers;

  const PublicApi(this._dio, this._serializers);

  /// Localização compartilhada (link público do SOS)
  /// Sem autenticação: quem tem o link vê **só** a última posição da moto e o horário dela, enquanto o compartilhamento estiver dentro da validade e o aluguel continuar aberto. Nenhum dado pessoal (nome, telefone, moto, trajeto). Token desconhecido, expirado ou aluguel encerrado → 404 (mesma resposta, sem revelar qual). Rate limit por IP. &#x60;Cache-Control: no-store&#x60;, &#x60;Referrer-Policy: no-referrer&#x60;, &#x60;X-Robots-Tag: noindex&#x60;.
  ///
  /// Parameters:
  /// * [token] - Token do link de localização compartilhada (base64url, 32 caracteres).
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [SharedLocation] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<SharedLocation>> getSharedLocation({
    required String token,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/public/location-shares/{token}'.replaceAll(
        '{' r'token' '}',
        encodeQueryParameter(_serializers, token, const FullType(String))
            .toString());
    final _options = Options(
      method: r'GET',
      headers: <String, dynamic>{
        ...?headers,
      },
      extra: <String, dynamic>{
        'secure': <Map<String, String>>[],
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

    SharedLocation? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(SharedLocation),
            ) as SharedLocation;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<SharedLocation>(
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

  /// Página da localização compartilhada
  /// Página HTML mínima (pt-BR) aberta pelo link de &#x60;POST /rentals/{id}/location-share&#x60; (&#x60;PUBLIC_SHARE_BASE_URL/{token}&#x60;): mostra a última posição e o horário (fuso America/Sao_Paulo), com link para abrir no mapa, e se atualiza sozinha a cada 15 s lendo &#x60;GET /public/location-shares/{token}&#x60;. Sem autenticação, sem cookies e sem scripts de terceiros.
  ///
  /// Parameters:
  /// * [token] - Token do link de localização compartilhada (base64url, 32 caracteres).
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [String] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<String>> getSharedLocationPage({
    required String token,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/share/{token}'.replaceAll(
        '{' r'token' '}',
        encodeQueryParameter(_serializers, token, const FullType(String))
            .toString());
    final _options = Options(
      method: r'GET',
      headers: <String, dynamic>{
        ...?headers,
      },
      extra: <String, dynamic>{
        'secure': <Map<String, String>>[],
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

    String? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null ? null : rawResponse as String;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<String>(
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
