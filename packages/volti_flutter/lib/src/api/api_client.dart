import 'dart:async';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';

import '../auth/auth_repository.dart';

/// URL base da API: `--dart-define=API_BASE_URL=...`. Sem o define, usa
/// `http://10.0.2.2:3000` no emulador Android e `http://localhost:3000` no resto.
String defaultApiBaseUrl() {
  const fromEnv = String.fromEnvironment('API_BASE_URL');
  if (fromEnv.isNotEmpty) return fromEnv;
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
}

/// Anexa `Authorization: Bearer` com o token do [AuthRepository].
class BearerTokenInterceptor extends Interceptor {
  BearerTokenInterceptor(this._auth);
  final AuthRepository _auth;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    if (!options.headers.containsKey('Authorization')) {
      final token = await _auth.accessToken();
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

/// Retry com backoff exponencial (300 ms, 600 ms, ...) para erros de rede e
/// 5xx. Maximo de [maxAttempts] tentativas no total (padrao 3). Em 5xx so
/// repete metodos idempotentes (GET, HEAD, PUT, DELETE); erro de conexao
/// (a requisicao nao chegou ao servidor) repete qualquer metodo.
class RetryInterceptor extends Interceptor {
  RetryInterceptor({
    required this.dio,
    this.maxAttempts = 3,
    this.baseDelay = const Duration(milliseconds: 300),
    this.sleep = _defaultSleep,
  });

  final Dio dio;
  final int maxAttempts;
  final Duration baseDelay;
  final Future<void> Function(Duration) sleep;

  static const _attemptKey = 'volti_retry_attempt';

  static Future<void> _defaultSleep(Duration d) => Future<void>.delayed(d);

  static bool _idempotent(String m) {
    final u = m.toUpperCase();
    return u == 'GET' || u == 'HEAD' || u == 'PUT' || u == 'DELETE';
  }

  bool _retryable(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionError:
      case DioExceptionType.connectionTimeout:
        return true;
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return _idempotent(e.requestOptions.method);
      case DioExceptionType.badResponse:
        final code = e.response?.statusCode ?? 0;
        return code >= 500 && _idempotent(e.requestOptions.method);
      default:
        return false;
    }
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final attempt = (err.requestOptions.extra[_attemptKey] as int?) ?? 1;
    if (attempt >= maxAttempts || !_retryable(err)) {
      return handler.next(err);
    }
    await sleep(baseDelay * pow(2, attempt - 1).toInt());
    final opts = err.requestOptions..extra[_attemptKey] = attempt + 1;
    try {
      handler.resolve(await dio.fetch<dynamic>(opts));
    } on DioException catch (e) {
      handler.next(e);
    }
  }
}

/// Monta o cliente `volti_api` com bearer e retry.
VoltiApi buildVoltiApi({
  required String baseUrl,
  required AuthRepository auth,
  int maxAttempts = 3,
  Duration baseDelay = const Duration(milliseconds: 300),
  Future<void> Function(Duration)? sleep,
  HttpClientAdapter? httpClientAdapter,
}) {
  final api = VoltiApi(basePathOverride: baseUrl, interceptors: const []);
  if (httpClientAdapter != null) api.dio.httpClientAdapter = httpClientAdapter;
  api.dio.options
    ..connectTimeout = const Duration(seconds: 5)
    ..receiveTimeout = const Duration(seconds: 15);
  api.dio.interceptors.addAll([
    BearerTokenInterceptor(auth),
    RetryInterceptor(
      dio: api.dio,
      maxAttempts: maxAttempts,
      baseDelay: baseDelay,
      sleep: sleep ?? RetryInterceptor._defaultSleep,
    ),
  ]);
  return api;
}

/// URL base da API (sobrescreva em testes/apps).
final apiBaseUrlProvider = Provider<String>((ref) => defaultApiBaseUrl());

/// Repositorio de autenticacao (`dev` por padrao; `--dart-define=AUTH_MODE=cognito`).
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository.create(
    AuthRepository.modeFromEnvironment(),
    baseUrl: ref.watch(apiBaseUrlProvider),
  );
});

/// Cliente da API Volti (`volti_api`) com bearer e retry exponencial.
final apiClientProvider = Provider<VoltiApi>((ref) {
  return buildVoltiApi(
    baseUrl: ref.watch(apiBaseUrlProvider),
    auth: ref.watch(authRepositoryProvider),
  );
});

/// Alias com o nome citado no plano (`ApiClientProvider`).
// ignore: non_constant_identifier_names
final ApiClientProvider = apiClientProvider;
