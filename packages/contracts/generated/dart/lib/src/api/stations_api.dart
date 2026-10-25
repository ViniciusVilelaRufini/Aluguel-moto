//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

import 'dart:async';

import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:dio/dio.dart';

import 'package:volti_api/src/api_util.dart';
import 'package:volti_api/src/model/problem.dart';
import 'package:volti_api/src/model/station_swap.dart';
import 'package:volti_api/src/model/station_swap_page.dart';
import 'package:volti_api/src/model/station_swap_request.dart';
import 'package:volti_api/src/model/station_swap_status.dart';
import 'package:volti_api/src/model/swap_station_admin.dart';
import 'package:volti_api/src/model/swap_station_admin_list.dart';
import 'package:volti_api/src/model/swap_station_input.dart';
import 'package:volti_api/src/model/swap_station_list.dart';
import 'package:volti_api/src/model/swap_station_qr.dart';
import 'package:volti_api/src/model/swap_station_update.dart';

class StationsApi {
  final Dio _dio;

  final Serializers _serializers;

  const StationsApi(this._dio, this._serializers);

  /// Cancelar troca na estação
  /// Só o dono e só antes da devolução (&#x60;opening_slot&#x60; ou &#x60;awaiting_return&#x60;) → &#x60;canceled&#x60; (&#x60;endReason: canceled_by_customer&#x60;). Depois disso → &#x60;422&#x60; &#x60;swap-not-cancelable&#x60; (a estação precisa liberar a carregada). Troca já cancelada → &#x60;200&#x60; como está. Bateria devolvida mesmo assim entra no estoque da estação.
  ///
  /// Parameters:
  /// * [id]
  /// * [swapId]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [StationSwap] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<StationSwap>> cancelStationSwap({
    required String id,
    required String swapId,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/swap-stations/{id}/swaps/{swapId}/cancel'
        .replaceAll(
            '{' r'id' '}',
            encodeQueryParameter(_serializers, id, const FullType(String))
                .toString())
        .replaceAll(
            '{' r'swapId' '}',
            encodeQueryParameter(_serializers, swapId, const FullType(String))
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

    StationSwap? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(StationSwap),
            ) as StationSwap;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<StationSwap>(
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

  /// Iniciar troca de bateria na estação (QR)
  /// O cliente escaneou o QR fixo da estação (&#x60;stationCode&#x60;, código assinado sem dado pessoal) com um aluguel em andamento. A API valida, nesta ordem: - QR inválido, adulterado ou de outra estação (o &#x60;id&#x60; do caminho tem que ser a estação do QR) → &#x60;404&#x60;   &#x60;station-not-found&#x60;; - aluguel do próprio cliente (senão &#x60;404&#x60;) e &#x60;active&#x60; ou &#x60;paused&#x60; → senão &#x60;409&#x60; &#x60;rental-not-active&#x60;; - uma troca aberta por aluguel → &#x60;409&#x60; &#x60;swap-open&#x60;; - estação ativa, aberta (&#x60;open24h&#x60; ou dentro de &#x60;openingHours&#x60; quando o texto é interpretável, no fuso   America/Sao_Paulo) e com bateria carregada livre (&#x60;availableBatteries&#x60; menos as trocas em andamento) → senão   &#x60;422&#x60; &#x60;station-unavailable&#x60;; - celular (&#x60;lat&#x60;/&#x60;lng&#x60;) a no máximo 50 m da estação → senão &#x60;422&#x60; &#x60;too-far&#x60;. A posição só é usada nesta   validação (LGPD): a troca guarda apenas a distância; - moto parada: velocidade 0 conhecida e recente, moto travada ou aluguel pausado. Velocidade desconhecida conta   como em movimento → &#x60;422&#x60; &#x60;vehicle-moving&#x60;.  Sucesso → &#x60;201&#x60; com a troca em &#x60;opening_slot&#x60;; a estação abre uma vaga vazia. A partir daí o status avança pelos eventos da estação (&#x60;station_swap.updated&#x60; no WebSocket): &#x60;awaiting_return&#x60; (vaga aberta, &#x60;slotNumber&#x60;) → &#x60;returned&#x60; (bateria devolvida) → &#x60;releasing&#x60; (vaga fechada, estação libera a carregada) → &#x60;completed&#x60;. Cada etapa tem prazo de 3 min (&#x60;expiresAt&#x60;): sem resposta da estação → &#x60;failed&#x60;; sem devolução → &#x60;canceled&#x60;; nenhuma bateria é liberada sem a devolução registrada.  Taxa (&#x60;feeCents&#x60;, congelada aqui): 0 nos planos &#x60;day&#x60;, &#x60;weekly&#x60; e &#x60;monthly&#x60;; nos planos &#x60;minute&#x60; e &#x60;hour&#x60;, a taxa de sistema &#x60;battery_swap_fee&#x60; (padrão 500, editável em &#x60;PUT /pricing/fees/{id}&#x60;). Não é cobrada na hora: entra como linha &#x60;battery_swap_fee&#x60; no &#x60;breakdown&#x60; do fechamento do aluguel, só para trocas &#x60;completed&#x60;.  Idempotência: a mesma &#x60;Idempotency-Key&#x60; devolve a mesma troca e não abre outra vaga.
  ///
  /// Parameters:
  /// * [idempotencyKey] - Chave única por intenção (UUID v4 recomendado). Válida por 24 h.
  /// * [id]
  /// * [stationSwapRequest]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [StationSwap] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<StationSwap>> createStationSwap({
    required String idempotencyKey,
    required String id,
    required StationSwapRequest stationSwapRequest,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/swap-stations/{id}/swaps'.replaceAll(
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
      contentType: 'application/json',
      validateStatus: validateStatus,
    );

    dynamic _bodyData;

    try {
      const _type = FullType(StationSwapRequest);
      _bodyData =
          _serializers.serialize(stationSwapRequest, specifiedType: _type);
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

    StationSwap? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(StationSwap),
            ) as StationSwap;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<StationSwap>(
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

  /// Cadastrar estação de troca (painel)
  /// Nome, endereço, posição, horário (&#x60;openingHours&#x60;, texto livre como \&quot;Seg a sáb, 7h às 22h\&quot;, obrigatório sem &#x60;open24h&#x60;; com &#x60;open24h&#x60; e sem texto vale \&quot;Todos os dias, 24 h\&quot;), &#x60;totalSlots&#x60; (≥ 1) e a *thing* do armário no IoT Core (&#x60;thingName&#x60;, padrão &#x60;station-{id}&#x60;; formato &#x60;station-&lt;uuid&gt;&#x60;, o mesmo do provisionamento e da regra IoT). &#x60;thingName&#x60; já usado por outra estação → &#x60;409&#x60; &#x60;thing-name-taken&#x60;. A estação nasce com o QR fixo emitido (o mesmo código do script &#x60;stations:qr&#x60;, lido em &#x60;GET /swap-stations/{id}/qr&#x60;) e sem baterias (&#x60;availableBatteries&#x60; &#x3D; 0; o estoque entra pela van, &#x60;POST /batteries/van-stock/unload&#x60;). Grava AuditLog (&#x60;swap_station.create&#x60;, sem o QR).
  ///
  /// Parameters:
  /// * [swapStationInput]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [SwapStationAdmin] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<SwapStationAdmin>> createSwapStation({
    required SwapStationInput swapStationInput,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/swap-stations';
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
      const _type = FullType(SwapStationInput);
      _bodyData =
          _serializers.serialize(swapStationInput, specifiedType: _type);
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

    SwapStationAdmin? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(SwapStationAdmin),
            ) as SwapStationAdmin;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<SwapStationAdmin>(
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

  /// Consultar troca na estação
  /// Dono (cliente) ou staff. Troca de outro cliente ou de outra estação → &#x60;404&#x60;.
  ///
  /// Parameters:
  /// * [id]
  /// * [swapId]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [StationSwap] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<StationSwap>> getStationSwap({
    required String id,
    required String swapId,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/swap-stations/{id}/swaps/{swapId}'
        .replaceAll(
            '{' r'id' '}',
            encodeQueryParameter(_serializers, id, const FullType(String))
                .toString())
        .replaceAll(
            '{' r'swapId' '}',
            encodeQueryParameter(_serializers, swapId, const FullType(String))
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

    StationSwap? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(StationSwap),
            ) as StationSwap;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<StationSwap>(
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

  /// QR da estação (admin e operação)
  /// Conteúdo do QR fixo da estação (&#x60;stationCode&#x60;, o mesmo código que o script &#x60;stations:qr&#x60; grava) para imprimir o adesivo pelo painel. Estação ainda sem código → emitido agora com o segredo atual. Grava AuditLog (sem o código). Reemissão em massa (troca do segredo) é pelo script de operação &#x60;stations:qr --reissue&#x60; (ver &#x60;services/api/README.md&#x60;). O código nunca sai em &#x60;SwapStation&#x60;, em &#x60;SwapStationAdmin&#x60; nem para o cliente.
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
  /// Returns a [Future] containing a [Response] with a [SwapStationQr] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<SwapStationQr>> getSwapStationQr({
    required String id,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/swap-stations/{id}/qr'.replaceAll(
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

    SwapStationQr? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(SwapStationQr),
            ) as SwapStationQr;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<SwapStationQr>(
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

  /// Trocas da estação (painel)
  /// Mais recentes primeiro, com nº de série devolvido/liberado. Estação inexistente → &#x60;404&#x60; &#x60;station-not-found&#x60;.
  ///
  /// Parameters:
  /// * [id]
  /// * [cursor] - Cursor opaco devolvido em `nextCursor` da página anterior.
  /// * [limit] - Itens por página.
  /// * [status]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [StationSwapPage] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<StationSwapPage>> listStationSwaps({
    required String id,
    String? cursor,
    int? limit = 20,
    StationSwapStatus? status,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/swap-stations/{id}/swaps'.replaceAll(
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
            _serializers, status, const FullType(StationSwapStatus)),
    };

    final _response = await _dio.request<Object>(
      _path,
      options: _options,
      queryParameters: _queryParameters,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );

    StationSwapPage? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(StationSwapPage),
            ) as StationSwapPage;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<StationSwapPage>(
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

  /// Cadastro das estações (painel)
  /// Todas as estações, ativas e inativas, em ordem alfabética, com os campos de cadastro (&#x60;SwapStationAdmin&#x60;: ativa, &#x60;thingName&#x60;, baterias na estação, trocas em andamento e galpões ligados). Nunca traz o QR (&#x60;stationCode&#x60;).
  ///
  /// Parameters:
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [SwapStationAdminList] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<SwapStationAdminList>> listSwapStationRegistry({
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/swap-stations/registry';
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

    final _response = await _dio.request<Object>(
      _path,
      options: _options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );

    SwapStationAdminList? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(SwapStationAdminList),
            ) as SwapStationAdminList;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<SwapStationAdminList>(
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

  /// Estações de troca de bateria (mapa)
  /// Estações ativas com posição, endereço, horário e baterias carregadas disponíveis. Com &#x60;lat&#x60;/&#x60;lng&#x60;, filtra pelo raio e ordena por distância (&#x60;distanceM&#x60;); sem eles, todas em ordem alfabética.  Leitura aberta a qualquer cliente autenticado (&#x60;customerAuth&#x60;, sem grupo: o mapa e a folha \&quot;Troca de bateria\&quot; do app). &#x60;x-required-groups&#x60; vale só para &#x60;staffAuth&#x60;. A resposta traz apenas os campos públicos de &#x60;SwapStation&#x60; (identificador, nome, endereço, posição, baterias, vagas, horário e distância); dados internos da estação (ativa/inativa, datas de cadastro) não saem desta rota, para nenhum pool; o painel lê o cadastro em &#x60;GET /swap-stations/registry&#x60; (admin/operacao).
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

  /// Editar ou desativar estação de troca (painel)
  /// Campos ausentes não mudam. Validações: - &#x60;totalSlots&#x60; menor que as baterias na estação (o maior entre &#x60;availableBatteries&#x60; e as baterias &#x60;in_station&#x60;   dela) → &#x60;422&#x60; &#x60;slots-below-stock&#x60;; - &#x60;thingName&#x60; de outra estação → &#x60;409&#x60; &#x60;thing-name-taken&#x60;; - desativar (&#x60;active: false&#x60;) ou trocar o &#x60;thingName&#x60; com troca por QR em andamento na estação → &#x60;409&#x60;   &#x60;station-swap-in-progress&#x60; (espere terminar; a desativação e a criação de troca se serializam pela linha da   estação). Estação inativa some de &#x60;GET /swap-stations&#x60; e recusa troca nova (&#x60;422&#x60; &#x60;station-unavailable&#x60;). O QR não muda. Grava AuditLog (&#x60;swap_station.update&#x60;, nomes dos campos).
  ///
  /// Parameters:
  /// * [id]
  /// * [swapStationUpdate]
  /// * [cancelToken] - A [CancelToken] that can be used to cancel the operation
  /// * [headers] - Can be used to add additional headers to the request
  /// * [extras] - Can be used to add flags to the request
  /// * [validateStatus] - A [ValidateStatus] callback that can be used to determine request success based on the HTTP status of the response
  /// * [onSendProgress] - A [ProgressCallback] that can be used to get the send progress
  /// * [onReceiveProgress] - A [ProgressCallback] that can be used to get the receive progress
  ///
  /// Returns a [Future] containing a [Response] with a [SwapStationAdmin] as data
  /// Throws [DioException] if API call or serialization fails
  Future<Response<SwapStationAdmin>> updateSwapStation({
    required String id,
    required SwapStationUpdate swapStationUpdate,
    CancelToken? cancelToken,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? extra,
    ValidateStatus? validateStatus,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    final _path = r'/swap-stations/{id}'.replaceAll(
        '{' r'id' '}',
        encodeQueryParameter(_serializers, id, const FullType(String))
            .toString());
    final _options = Options(
      method: r'PATCH',
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
      const _type = FullType(SwapStationUpdate);
      _bodyData =
          _serializers.serialize(swapStationUpdate, specifiedType: _type);
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

    SwapStationAdmin? _responseData;

    try {
      final rawResponse = _response.data;
      _responseData = rawResponse == null
          ? null
          : _serializers.deserialize(
              rawResponse,
              specifiedType: const FullType(SwapStationAdmin),
            ) as SwapStationAdmin;
    } catch (error, stackTrace) {
      throw DioException(
        requestOptions: _response.requestOptions,
        response: _response,
        type: DioExceptionType.unknown,
        error: error,
        stackTrace: stackTrace,
      );
    }

    return Response<SwapStationAdmin>(
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
