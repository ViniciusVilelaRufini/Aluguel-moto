//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

import 'dart:async';

import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:dio/dio.dart';

import 'package:volti_api/src/api_util.dart';
import 'package:volti_api/src/model/problem.dart';
import 'package:volti_api/src/model/swap_station_list.dart';

class StationsApi {
  final Dio _dio;

  final Serializers _serializers;

  const StationsApi(this._dio, this._serializers);

  /// Estações de troca de bateria (mapa)
  /// Estações ativas com posição, endereço, horário e baterias carregadas disponíveis. Com &#x60;lat&#x60;/&#x60;lng&#x60;, filtra pelo raio e ordena por distância (&#x60;distanceM&#x60;); sem eles, todas em ordem alfabética.  Leitura aberta a qualquer cliente autenticado (&#x60;customerAuth&#x60;, sem grupo: o mapa e a folha \&quot;Troca de bateria\&quot; do app). &#x60;x-required-groups&#x60; vale só para &#x60;staffAuth&#x60;. A resposta traz apenas os campos públicos de &#x60;SwapStation&#x60; (identificador, nome, endereço, posição, baterias, vagas, horário e distância); dados internos da estação (ativa/inativa, datas de cadastro) não saem da API, para nenhum pool.
  ///
  /// Parameters:
  /// * [lat]
  /// * [lng]
  /// * [radiusM] - Raio em metros (só com `lat`/`lng`).
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [SwapStationList] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<SwapStationList>> listSwapStations({
    double? lat,
    double? lng,
    int? radiusM = 10000,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/swap-stations';
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

    final _queryParameters = <String, dynamic>{
      if (lat != null)
        r'lat': encodeQueryParameter(_serializers, lat, const FullType(double)),
      if (lng != null)
        r'lng': encodeQueryParameter(_serializers, lng, const FullType(double)),
      if (radiusM != null)
        r'radiusM':
            encodeQueryParameter(_serializers, radiusM, const FullType(int)),
    };

    final _response = await _dio.request<Object>(
      _path,
      options: _options,
      queryParameters: _queryParameters,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );

    SwapStationList? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(SwapStationList),
            ) as SwapStationList;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<SwapStationList>(
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
