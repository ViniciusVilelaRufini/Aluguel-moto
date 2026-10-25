// ignore_for_file: deprecated_member_use
// Push (roteamento do payload, inicializacao sem Firebase, primeiro plano e toque) e crash reporting sem PII.

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/crash_reporting.dart';
import 'package:volti_cliente/core/push_routing.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/home/home_screen.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';
import 'home_parity_test.dart' show ParityBackend, phone;

class _Device extends ParityBackend {
  final tokens = <String>[];
  @override
  Future<void> registerDevice(String fcmToken, DevicePlatform platform) async => tokens.add(fcmToken);
}

class _Transport implements PushTransport {
  _Transport({this.configured = true, this.initial});
  final bool configured;
  final PushPayload? initial;
  int permissionAsked = 0;
  final message = StreamController<PushPayload>.broadcast();
  final opened = StreamController<PushPayload>.broadcast();
  final refresh = StreamController<String>.broadcast();

  @override
  Future<bool> init() async => configured;
  @override
  Future<void> requestPermission() async => permissionAsked++;
  @override
  Future<String?> getToken() async => 'tok-1';
  @override
  Stream<String> get onTokenRefresh => refresh.stream;
  @override
  Stream<PushPayload> get onMessage => message.stream;
  @override
  Stream<PushPayload> get onMessageOpenedApp => opened.stream;
  @override
  Future<PushPayload?> getInitialMessage() async => initial;
}

void main() {
  group('routeForPush', () {
    test('lembrete de reserva abre a reserva', () {
      expect(routeForPush({'type': 'reservation.reminder', 'reservationId': 'r-1'}), '/reservation/r-1');
    });
    test('entrega pendente abre "Confira sua moto"; sem handoverId cai na reserva', () {
      expect(routeForPush({'type': 'handover.pending', 'handoverId': 'h1', 'reservationId': 'r1'}), '/handover/h1');
      expect(routeForPush({'type': 'handover.pending', 'reservationId': 'r1'}), '/reservation/r1');
    });
    test('corrida, troca de bateria, recibo e cadastro', () {
      expect(routeForPush({'type': 'rental.updated', 'rentalId': 'a'}), '/ride');
      expect(routeForPush({'type': 'swap.updated', 'stationId': 's1', 'swapId': 'w1'}), '/station-swap/s1/w1');
      expect(routeForPush({'type': 'swap.updated', 'stationId': 's1'}), '/home');
      expect(routeForPush({'type': 'receipt', 'rentalId': 'a1'}), '/summary/a1');
      expect(routeForPush({'kind': 'kyc', 'status': 'approved'}), '/account/verification');
    });
    test('tipo desconhecido, vazio ou id malicioso vao para o inicio', () {
      expect(routeForPush({}), '/home');
      expect(routeForPush({'type': 'algo.novo'}), '/home');
      expect(routeForPush({'type': 'reservation.reminder'}), '/home');
      expect(routeForPush({'type': 'reservation.reminder', 'reservationId': '../account/privacy'}), '/home');
      expect(routeForPush({'type': 'receipt', 'rentalId': 'a?b=1'}), '/home');
    });
  });

  group('FirebasePushService', () {
    test('sem Firebase configurado: nao lanca, nao registra, nao pede permissao', () async {
      final t = _Transport(configured: false);
      final b = _Device();
      await FirebasePushService(transport: t).register(b, onOpen: (_) {}, onForeground: (_) {});
      expect(b.tokens, isEmpty);
      expect(t.permissionAsked, 0);
    });

    test('configurado: registra o token, repassa mensagens e rota do toque; ouvintes uma vez so', () async {
      final t = _Transport(initial: const PushPayload(data: {'type': 'receipt', 'rentalId': 'r9'}));
      final b = _Device();
      final svc = FirebasePushService(transport: t);
      final routes = <String>[];
      final shown = <String?>[];
      await svc.register(b, onOpen: routes.add, onForeground: (m) => shown.add(m.title));
      expect(b.tokens, ['tok-1']);
      expect(routes, ['/summary/r9']);
      t.message.add(const PushPayload(title: 'Oi'));
      t.opened.add(const PushPayload(data: {'type': 'rental.updated'}));
      t.refresh.add('tok-2');
      await Future<void>.delayed(Duration.zero);
      expect(shown, ['Oi']);
      expect(routes, ['/summary/r9', '/ride']);
      expect(b.tokens, ['tok-1', 'tok-2']);
      // Segunda abertura da home: so registra o token de novo e troca os callbacks.
      final routes2 = <String>[];
      await svc.register(b, onOpen: routes2.add);
      t.opened.add(const PushPayload(data: {'type': 'rental.updated'}));
      await Future<void>.delayed(Duration.zero);
      expect(routes, hasLength(2));
      expect(routes2, ['/ride']);
    });
  });

  group('home com push', () {
    Future<_Transport> pumpHome(WidgetTester t) async {
      phone(t);
      final transport = _Transport();
      final router = GoRouter(initialLocation: '/home', routes: [
        GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
        GoRoute(path: '/reservation/:id', builder: (_, s) => Scaffold(body: Text('reserva ${s.pathParameters['id']}'))),
      ]);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(_Device()),
        pushServiceProvider.overrideWithValue(FirebasePushService(transport: transport)),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => thu10),
      ]));
      for (var i = 0; i < 6; i++) {
        await t.pump(const Duration(milliseconds: 300));
      }
      return transport;
    }

    testWidgets('mensagem em primeiro plano vira aviso na tela', (t) async {
      final transport = await pumpHome(t);
      transport.message.add(const PushPayload(title: 'Retirada no galpão', body: 'Sua retirada vence às 10:30'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      expect(find.textContaining('Sua retirada vence às 10:30'), findsOneWidget);
      await t.pump(const Duration(seconds: 6));
    });

    testWidgets('toque na notificacao abre a reserva', (t) async {
      final transport = await pumpHome(t);
      transport.opened.add(const PushPayload(data: {'type': 'reservation.reminder', 'reservationId': 'r7'}));
      for (var i = 0; i < 4; i++) {
        await t.pump(const Duration(milliseconds: 300));
      }
      expect(find.text('reserva r7'), findsOneWidget);
    });
  });

  group('crash reporting', () {
    test('desligado sem DSN e em debug', () {
      expect(crashReportingEnabled(dsn: '', isDebug: false), isFalse);
      expect(crashReportingEnabled(dsn: '  ', isDebug: false), isFalse);
      expect(crashReportingEnabled(dsn: 'https://k@o.ingest.sentry.io/1', isDebug: true), isFalse);
      expect(crashReportingEnabled(dsn: 'https://k@o.ingest.sentry.io/1', isDebug: false), isTrue);
    });

    test('scrubText redige token, e-mail, CPF e coordenadas', () {
      final out = scrubText('Bearer abc.def ana@x.com 123.456.789-09 em -23.561414, -46.655881');
      expect(out, isNot(contains('abc.def')));
      expect(out, isNot(contains('ana@x.com')));
      expect(out, isNot(contains('123.456.789-09')));
      expect(out, isNot(contains('-23.561414')));
    });

    test('scrubEvent tira usuario, requisicao, trilha e extras', () {
      final event = SentryEvent(
        user: SentryUser(id: 'u1', email: 'ana@x.com', ipAddress: '1.2.3.4'),
        request: SentryRequest(url: 'https://api/x?token=1', headers: {'authorization': 'Bearer t'}, cookies: 'a=b', data: {'cpf': '1'}),
        breadcrumbs: [Breadcrumb(message: 'GET /me/location')],
        extra: {'lat': -23.5},
        tags: {'cpf': '1'},
        serverName: 'pc-da-ana',
        transaction: '/rentals/abc',
        exceptions: [SentryException(type: 'StateError', value: 'falha para ana@x.com')],
        message: SentryMessage('Bearer xyz.123'),
      );
      final out = scrubEvent(event)!;
      expect(out.user, isNull);
      expect(out.request, isNull);
      expect(out.breadcrumbs, isNull);
      expect(out.extra, isNull);
      expect(out.tags, isNull);
      expect(out.serverName, isNull);
      expect(out.transaction, isNull);
      expect(out.exceptions!.single.value, isNot(contains('ana@x.com')));
      expect(out.message!.formatted, isNot(contains('xyz.123')));
    });

    test('configureSentry nao envia PII, tela nem trilha', () {
      final o = SentryFlutterOptions();
      configureSentry(o, dsn: 'https://k@o.ingest.sentry.io/1');
      expect(o.sendDefaultPii, isFalse);
      expect(o.attachScreenshot, isFalse);
      expect(o.maxBreadcrumbs, 0);
      expect(o.tracesSampleRate, isNull);
      expect(o.beforeBreadcrumb!(Breadcrumb(message: 'x'), Hint()), isNull);
    });
  });
}
