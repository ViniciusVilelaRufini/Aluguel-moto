import 'package:built_collection/built_collection.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/flash.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/home/home_screen.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';
import 'pick_catalog_test.dart' show loadFonts;

class _LongNameBackend extends ParityBackend {
  @override
  Future<List<Depot>> depots({double? lat, double? lng}) async => [depotFixture(district: 'Vila Madalena')];
}

class ParityBackend extends GalpaoBackend {
  ParityBackend({this.unread = 0, this.depotsFail = false});
  final int unread;
  bool depotsFail;

  @override
  Future<List<Depot>> depots({double? lat, double? lng}) async {
    if (depotsFail) throw Exception('depots');
    return super.depots(lat: lat, lng: lng);
  }

  @override
  Future<List<SupportConversation>> conversations() async => [
        // SupportConversation agora e abstrata no contrato: usa a variante concreta.
        LgpdSupportConversation((b) => b
          ..messages = ListBuilder<SupportMessage>()
          ..id = 'c'
          ..customerId = 'c1'
          ..subject = 'Ajuda'
          ..status = ConversationStatus.open
          ..unreadCount = unread
          ..createdAt = DateTime.utc(2026)
          ..lastMessageAt = DateTime.utc(2026)),
      ];
}

void phone(WidgetTester t, {double scale = 1}) {
  t.view.physicalSize = const Size(412, 915);
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

Future<void> pump(WidgetTester t, ParityBackend b, {KycStatus kyc = KycStatus.approved, FlashNotifier Function()? flash}) async {
  await t.pumpWidget(testApp(const HomeScreen(), overrides: [
    backendProvider.overrideWithValue(b),
    pushServiceProvider.overrideWithValue(NoopPushService()),
    locationServiceProvider.overrideWithValue(FakeLocation()),
    sessionProvider.overrideWith(() => FakeSession(session(kyc: kyc))),
    clockProvider.overrideWithValue(() => thu10),
    if (flash != null) flashProvider.overrideWith(flash),
  ]));
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

class _Flash extends FlashNotifier {
  @override
  FlashMessage? build() => const FlashMessage('Reserva cancelada');
}

void main() {
  setUpAll(loadFonts);
  testWidgets('cabecalho e promocoes como no design; sem filtros de motos na rua', (t) async {
    phone(t);
    await pump(t, ParityBackend());
    expect(find.text('AL'), findsOneWidget);
    expect(find.text('Retire em'), findsOneWidget);
    expect(find.text('Galpão Volti · Pinheiros'), findsOneWidget);
    expect(find.textContaining('Perto'), findsNothing);
    expect(find.text('Desbloqueie seu plano'), findsOneWidget);
    expect(find.text('1ª corrida grátis'), findsNothing);
    for (final f in ['Todas', 'Autonomia 10+ km', 'Pontos de retirada', 'Escanear para andar']) {
      expect(find.text(f), findsNothing);
    }
    expect(find.text('Escolher moto'), findsOneWidget);
    // Sem central de notificacoes no contrato: nao ha sino; o suporte tem entrada na Conta.
    expect(find.byKey(const Key('home-bell')), findsNothing);
    expect(find.byKey(const Key('home-avatar-dot')), findsNothing);
    expect(t.takeException(), isNull);
  });

  testWidgets('mensagem nao lida do suporte: bolinha no avatar da Conta, sem sino', (t) async {
    phone(t);
    await pump(t, ParityBackend(unread: 2));
    expect(find.byKey(const Key('home-bell')), findsNothing);
    expect(find.byKey(const Key('home-avatar-dot')), findsOneWidget);
    expect(find.bySemanticsLabel('Conta, mensagens novas do suporte'), findsOneWidget);
  });

  // Q-10: o nome do galpao quebra em ate 2 linhas em vez de terminar em reticencias.
  for (final scale in [1.0, 2.0]) {
    testWidgets('pilula da localizacao com nome longo a ${(scale * 100).round()}%: sem reticencias', (t) async {
      phone(t, scale: scale);
      await pump(t, _LongNameBackend());
      final place = find.descendant(of: find.byKey(const Key('home-location')), matching: find.textContaining('Vila Madalena'));
      expect(place, findsOneWidget);
      expect(t.renderObject<RenderParagraph>(place).didExceedMaxLines, isFalse);
      expect(t.takeException(), isNull);
    });
  }

  testWidgets('200% de texto sem estouro com aviso de KYC', (t) async {
    phone(t, scale: 2);
    await pump(t, ParityBackend(), kyc: KycStatus.pending);
    expect(find.text('Escolher moto'), findsOneWidget);
    expect(t.takeException(), isNull);
  });

  testWidgets('erro ao carregar o galpao: tentar de novo recarrega', (t) async {
    phone(t);
    final b = ParityBackend(depotsFail: true);
    await pump(t, b);
    expect(find.text('Escolher moto'), findsNothing);
    b.depotsFail = false;
    await t.tap(find.text('Tentar de novo'));
    for (var i = 0; i < 4; i++) {
      await t.pump(const Duration(milliseconds: 300));
    }
    expect(find.text('Escolher moto'), findsOneWidget);
  });

  testWidgets('mostra o toast deixado por outra tela uma vez (H8)', (t) async {
    phone(t);
    await pump(t, ParityBackend(), flash: _Flash.new);
    expect(find.text('Reserva cancelada'), findsOneWidget);
  });

  testWidgets('toast deixado por outra tela fica no topo, fora do mapa e da folha', (t) async {
    phone(t);
    await pump(t, ParityBackend(), flash: _Flash.new);
    final toast = find.byKey(const Key('volti-toast'));
    expect(toast, findsOneWidget);
    // Logo abaixo da barra de status (no meio do mapa cobria o pin do galpao).
    expect(t.getTopLeft(toast).dy, lessThan(120));
    // Some sozinho.
    await t.pump(const Duration(seconds: 5));
    await t.pump(const Duration(milliseconds: 500));
    expect(toast, findsNothing);
  });
}
