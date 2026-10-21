import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.responses);
  final List<Object> responses; // ResponseBody ou DioException-builder
  final calls = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async {
    calls.add(o);
    final r = responses[calls.length > responses.length ? responses.length - 1 : calls.length - 1];
    if (r is int) {
      return ResponseBody.fromString('{}', r, headers: {
        Headers.contentTypeHeader: ['application/json']
      });
    }
    throw DioException.connectionError(requestOptions: o, reason: 'offline');
  }

  @override
  void close({bool force = false}) {}
}

class _StubAuth implements AuthRepository {
  @override
  AuthMode get mode => AuthMode.dev;
  @override
  AuthSession? get session => null;
  @override
  Future<String?> accessToken() async => 'tok';
  @override
  Future<void> signOut() async {}
}

void main() {
  test('retry: erro de rede e 5xx com backoff e sucesso na 3a tentativa', () async {
    final adapter = _FakeAdapter(['net', 503, 200]);
    final sleeps = <Duration>[];
    final api = buildVoltiApi(
      baseUrl: 'http://x',
      auth: _StubAuth(),
      httpClientAdapter: adapter,
      sleep: (d) async => sleeps.add(d),
    );
    final res = await api.dio.get<dynamic>('/vehicles');
    expect(res.statusCode, 200);
    expect(adapter.calls.length, 3);
    expect(sleeps, [const Duration(milliseconds: 300), const Duration(milliseconds: 600)]);
    expect(adapter.calls.first.headers['Authorization'], 'Bearer tok');
  });

  test('retry: desiste depois de 3 tentativas', () async {
    final adapter = _FakeAdapter([500]);
    final api = buildVoltiApi(
        baseUrl: 'http://x', auth: _StubAuth(), httpClientAdapter: adapter, sleep: (_) async {});
    await expectLater(api.dio.get<dynamic>('/vehicles'), throwsA(isA<DioException>()));
    expect(adapter.calls.length, 3);
  });

  test('retry: 4xx e POST com 5xx nao repetem', () async {
    final a1 = _FakeAdapter([404]);
    final api1 = buildVoltiApi(
        baseUrl: 'http://x', auth: _StubAuth(), httpClientAdapter: a1, sleep: (_) async {});
    await expectLater(api1.dio.get<dynamic>('/x'), throwsA(isA<DioException>()));
    expect(a1.calls.length, 1);

    final a2 = _FakeAdapter([500]);
    final api2 = buildVoltiApi(
        baseUrl: 'http://x', auth: _StubAuth(), httpClientAdapter: a2, sleep: (_) async {});
    await expectLater(api2.dio.post<dynamic>('/x'), throwsA(isA<DioException>()));
    expect(a2.calls.length, 1);
  });

  test('POST + connectionError: exatamente 1 chamada', () async {
    final a = _FakeAdapter(['net']);
    final api = buildVoltiApi(
        baseUrl: 'http://x', auth: _StubAuth(), httpClientAdapter: a, sleep: (_) async {});
    await expectLater(api.dio.post<dynamic>('/rentals'), throwsA(isA<DioException>()));
    expect(a.calls.length, 1);
  });

  test('POST com Idempotency-Key ou extra retryable repete', () async {
    final a = _FakeAdapter(['net', 200]);
    final api = buildVoltiApi(
        baseUrl: 'http://x', auth: _StubAuth(), httpClientAdapter: a, sleep: (_) async {});
    final r = await api.dio.post<dynamic>('/rentals',
        options: Options(headers: {'Idempotency-Key': 'k1'}));
    expect(r.statusCode, 200);
    expect(a.calls.length, 2);

    final b = _FakeAdapter(['net', 200]);
    final api2 = buildVoltiApi(
        baseUrl: 'http://x', auth: _StubAuth(), httpClientAdapter: b, sleep: (_) async {});
    await api2.dio.post<dynamic>('/rentals', options: Options(extra: {'retryable': true}));
    expect(b.calls.length, 2);
  });

  test('DevAuthRepository usa POST /dev/token', () async {
    final adapter = _TokenAdapter();
    final repo = DevAuthRepository(baseUrl: 'http://x', dio: Dio()..httpClientAdapter = adapter);
    expect(await repo.accessToken(), isNull);
    await repo.signIn(sub: 'u1', email: 'a@b.com', pool: DevAuthPool.staff, groups: ['campo']);
    expect(await repo.accessToken(), 'jwt');
    expect(adapter.last!.path, '/dev/token');
    expect(adapter.last!.data, {
      'sub': 'u1',
      'email': 'a@b.com',
      'groups': ['campo'],
      'pool': 'staff',
    });
    await repo.signOut();
    expect(await repo.accessToken(), isNull);
  });

  test('Cognito: login nao implementado, com mensagem clara', () {
    final repo = CognitoAuthRepository();
    expect(() => repo.signIn(), throwsA(isA<UnimplementedError>()));
  });
}

class _TokenAdapter implements HttpClientAdapter {
  RequestOptions? last;
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async {
    last = o;
    return ResponseBody.fromString(jsonEncode({'accessToken': 'jwt', 'tokenType': 'Bearer', 'expiresIn': 3600}), 200,
        headers: {
          Headers.contentTypeHeader: ['application/json']
        });
  }

  @override
  void close({bool force = false}) {}
}
