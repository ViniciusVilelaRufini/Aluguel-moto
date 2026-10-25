// Home: as duas folhas sobre o mapa (cartao do galpao e "Troca de bateria")
// arrastam entre recolhida, meia altura e expandida.
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/features/home/home_sheet.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'home_stations_test.dart' show StationsBackend, st, phone, settle, pumpHome, mixed, opened;

const screenH = 915.0;

final depotCard = find.byKey(const Key('depot-card'));
final depotHandle = find.byKey(const Key('depot-sheet-handle'));
final stationsSheet = find.byKey(const Key('stations-sheet'));
final stationsHandle = find.byKey(const Key('stations-sheet-handle'));
final pick = find.byKey(const Key('home-pick'));
final toggle = find.byKey(const Key('home-stations-toggle'));

HomeSheetState sheetState(WidgetTester t) => t.state<HomeSheetState>(find.byType(HomeSheet));

/// Fracao da tela coberta pela folha (altura da superficie).
double frac(WidgetTester t, Finder surface) => t.getRect(surface).height / screenH;

Future<void> flick(WidgetTester t, Finder handle, double dy) async {
  await t.fling(handle, Offset(0, dy), 1500);
  await settle(t);
}

StationsBackend many() => StationsBackend(depots: [depotFixture()])
  ..stations = [for (var i = 0; i < 9; i++) st('st-$i', 'Estação $i', available: 3 + i, distanceM: 200 + i * 150)];

void main() {
  setUp(opened.clear);

  test('paradas: recolhida < meia < expandida (abaixo da area segura); fecha so quando pedido', () {
    final s = homeSheetStops(height: 915, topInset: 24, collapsedPx: 250);
    expect(s.collapsed, closeTo(250 / 915, 1e-9));
    expect(s.half, .55);
    expect(s.expanded, closeTo((915 - 24 - 8) / 915, 1e-9));
    expect(s.closed, isNull);
    expect(homeSheetStops(height: 915, topInset: 24, collapsedPx: 250, closable: true).closed, lessThan(s.collapsed));
    // Recolhida alta (texto grande): a meia some.
    expect(homeSheetStops(height: 740, topInset: 24, collapsedPx: 600).half, isNull);
  });

  group('folha do galpao', () {
    testWidgets('arrasta entre recolhida, meia e expandida; com haptica leve a cada parada', (t) async {
      phone(t);
      final kinds = <VoltiHapticKind>[];
      VoltiHaptics.debugHandler = (k) async => kinds.add(k);
      addTearDown(() => VoltiHaptics.debugHandler = null);
      await pumpHome(t, StationsBackend(depots: [depotFixture()]));
      final stops = sheetState(t).stops!;
      expect(frac(t, depotCard), closeTo(stops.collapsed, .01));
      expect(find.byKey(const Key('depot-headline')).hitTestable(), findsOneWidget);
      expect(kinds, isEmpty, reason: 'sem haptica ao abrir');

      await flick(t, depotHandle, -200);
      expect(frac(t, depotCard), closeTo(stops.half!, .01));
      expect(kinds, [VoltiHapticKind.tap]);

      await flick(t, depotHandle, -200);
      expect(frac(t, depotCard), closeTo(stops.expanded, .01));
      expect(t.getRect(depotCard).top, greaterThanOrEqualTo(0), reason: 'abaixo da area segura');

      await flick(t, depotHandle, 200);
      expect(frac(t, depotCard), closeTo(stops.half!, .01));
      await flick(t, depotHandle, 200);
      expect(frac(t, depotCard), closeTo(stops.collapsed, .01));
      // Folha do galpao nao fecha: arrastar mais para baixo fica na recolhida.
      await flick(t, depotHandle, 300);
      expect(depotCard, findsOneWidget);
      expect(frac(t, depotCard), closeTo(stops.collapsed, .01));
      expect(kinds.length, 4);
      expect(kinds.toSet(), {VoltiHapticKind.tap});
      expect(t.takeException(), isNull);
    });

    testWidgets('arrastar o conteudo (nao so a alca) tambem sobe a folha', (t) async {
      phone(t);
      await pumpHome(t, StationsBackend(depots: [depotFixture()]));
      final stops = sheetState(t).stops!;
      await t.fling(find.byKey(const Key('depot-headline')), const Offset(0, -150), 1200);
      await settle(t);
      expect(frac(t, depotCard), greaterThan(stops.collapsed + .1));
    });

    testWidgets('"Escolher moto" sempre a vista e tocavel nas tres paradas', (t) async {
      phone(t);
      await pumpHome(t, StationsBackend(depots: [depotFixture()]));
      for (var i = 0; i < 3; i++) {
        final card = t.getRect(depotCard);
        final b = t.getRect(pick);
        expect(b.top, greaterThanOrEqualTo(card.top), reason: 'parada $i');
        expect(b.bottom, lessThanOrEqualTo(screenH), reason: 'parada $i');
        expect(pick.hitTestable(), findsOneWidget, reason: 'parada $i');
        if (i < 2) await flick(t, depotHandle, -200);
      }
      await t.tap(pick);
      await settle(t);
      expect(find.text('Escolha sua moto'), findsWidgets);
    });

    testWidgets('expandida: horarios da semana, endereco completo e Como chegar', (t) async {
      phone(t);
      await pumpHome(t, StationsBackend(depots: [depotFixture()]));
      expect(find.byKey(const Key('depot-details')).hitTestable(), findsNothing, reason: 'recolhida: so o topo');
      await flick(t, depotHandle, -200);
      await flick(t, depotHandle, -200);
      expect(find.text('Horários'), findsOneWidget);
      // Quinta (hoje no relogio dos testes) em destaque; domingo fechado; sabado 8h-18h.
      expect(find.bySemanticsLabel('Quinta, hoje: 7h às 20h'), findsOneWidget);
      expect(find.bySemanticsLabel('Sábado: 8h às 18h'), findsOneWidget);
      expect(find.bySemanticsLabel('Domingo: Fechado'), findsOneWidget);
      final rows = [for (final wd in [1, 2, 3, 4, 5, 6, 0]) t.getTopLeft(find.byKey(Key('depot-hours-$wd'))).dy];
      for (var i = 1; i < rows.length; i++) {
        expect(rows[i], greaterThan(rows[i - 1]), reason: 'segunda a domingo');
      }
      expect(find.byKey(const Key('depot-address-full')), findsOneWidget);
      await t.ensureVisible(find.byKey(const Key('depot-directions')));
      await settle(t);
      await t.tap(find.byKey(const Key('depot-directions')));
      await settle(t);
      expect(opened, isNotEmpty);
      expect(opened.first.toString(), contains('-23.566'));
    });

    testWidgets('alca acessivel: "Expandir"/"Recolher" com acao de toque (sem gesto)', (t) async {
      phone(t);
      final h = t.ensureSemantics();
      await pumpHome(t, StationsBackend(depots: [depotFixture()]));
      final stops = sheetState(t).stops!;
      var node = t.getSemantics(depotHandle);
      expect(node.label, 'Expandir');
      expect(node, isSemantics(isButton: true, hasTapAction: true));

      t.semantics.tap(find.semantics.byLabel('Expandir'));
      await settle(t);
      expect(frac(t, depotCard), closeTo(stops.expanded, .01));
      node = t.getSemantics(depotHandle);
      expect(node.label, 'Recolher');

      t.semantics.tap(find.semantics.byLabel('Recolher'));
      await settle(t);
      expect(frac(t, depotCard), closeTo(stops.collapsed, .01));
      expect(t.getSemantics(depotHandle).label, 'Expandir');
      h.dispose();
    });

    testWidgets('reduced motion: tocar na alca muda de parada na hora', (t) async {
      phone(t);
      await pumpHome(t, StationsBackend(depots: [depotFixture()]), reduceMotion: true);
      final stops = sheetState(t).stops!;
      await t.tap(depotHandle);
      await t.pump();
      expect(frac(t, depotCard), closeTo(stops.expanded, .01));
    });

    testWidgets('botoes do mapa sobem com a folha e somem quando ela cobre o mapa', (t) async {
      phone(t);
      await pumpHome(t, StationsBackend(depots: [depotFixture()]));
      double gap() => t.getRect(depotCard).top - t.getRect(toggle).bottom;
      final collapsedGap = gap();
      expect(collapsedGap, greaterThan(0));
      await flick(t, depotHandle, -200);
      expect(gap(), greaterThan(0), reason: 'meia: botoes acima da folha');
      expect(toggle.hitTestable(), findsOneWidget);
      await flick(t, depotHandle, -200);
      expect(toggle.hitTestable(), findsNothing, reason: 'expandida: sem mapa, sem botoes');
      await flick(t, depotHandle, 200);
      await flick(t, depotHandle, 200);
      expect(toggle.hitTestable(), findsOneWidget);
    });

    testWidgets('tema escuro: superficie da folha e o surface do tema', (t) async {
      phone(t);
      await pumpHome(t, StationsBackend(depots: [depotFixture()]), theme: VoltiTheme.dark());
      await flick(t, depotHandle, -200);
      final box = t.widget<Container>(depotCard).decoration! as BoxDecoration;
      expect(box.color, VoltiTheme.dark().colorScheme.surface);
      expect(t.takeException(), isNull);
    });

    for (final reduce in [false, true]) {
      testWidgets('200% em 360x740: recolhida e expandida sem estouro, Escolher moto a vista (reduced: $reduce)', (t) async {
        phone(t, scale: 2, size: const Size(360, 740));
        await pumpHome(t, StationsBackend(depots: [depotFixture()]), reduceMotion: reduce);
        expect(t.takeException(), isNull);
        final top = t.getRect(find.byKey(const Key('home-top')));
        expect(top.bottom, lessThanOrEqualTo(t.getRect(depotCard).top), reason: 'cabecalho acima da folha recolhida');
        expect(pick.hitTestable(), findsOneWidget);
        await t.tap(depotHandle);
        await settle(t);
        expect(t.takeException(), isNull);
        expect(pick.hitTestable(), findsOneWidget);
        expect(t.getRect(pick).bottom, lessThanOrEqualTo(740));
      });
    }
  });

  group('folha "Troca de bateria"', () {
    Future<void> openStations(WidgetTester t, StationsBackend b, {bool mapOn = false}) async {
      await pumpHome(t, b, mapOn: mapOn);
      await t.tap(toggle);
      await settle(t);
      expect(stationsSheet, findsOneWidget);
    }

    testWidgets('arrasta entre as tres paradas', (t) async {
      phone(t);
      await openStations(t, many());
      final stops = sheetState(t).stops!;
      expect(frac(t, stationsSheet), closeTo(stops.collapsed, .01));
      await flick(t, stationsHandle, -80);
      expect(frac(t, stationsSheet), closeTo(stops.half!, .01));
      await flick(t, stationsHandle, -80);
      expect(frac(t, stationsSheet), closeTo(stops.expanded, .01));
      await flick(t, stationsHandle, 80);
      expect(frac(t, stationsSheet), closeTo(stops.half!, .01));
    });

    testWidgets('expandida: a lista completa rola por dentro (e a folha fica expandida)', (t) async {
      phone(t);
      await openStations(t, many());
      final stops = sheetState(t).stops!;
      await t.tap(stationsHandle);
      await settle(t);
      expect(frac(t, stationsSheet), closeTo(stops.expanded, .01));
      final last = find.byKey(const Key('station-row-st-8'));
      expect(last.hitTestable(), findsNothing);
      final list = find.byKey(const Key('stations-list'));
      for (var i = 0; i < 6 && last.hitTestable().evaluate().isEmpty; i++) {
        await t.drag(list, const Offset(0, -300));
        await settle(t);
      }
      expect(last.hitTestable(), findsOneWidget, reason: 'ultima estacao alcancavel');
      expect(frac(t, stationsSheet), closeTo(stops.expanded, .01));
      final pos = t.widget<Scrollable>(find.descendant(of: list, matching: find.byType(Scrollable)).first);
      expect(pos, isNotNull);
      expect(find.byKey(const Key('station-row-st-0')).hitTestable(), findsNothing, reason: 'rolou: a primeira saiu de cima');
    });

    testWidgets('arrastar para baixo alem da recolhida fecha (como o X) e o cartao do galpao volta', (t) async {
      phone(t);
      await openStations(t, mixed());
      await flick(t, stationsHandle, 400);
      expect(stationsSheet, findsNothing);
      expect(depotCard, findsOneWidget);
      expect(t.takeException(), isNull);
    });

    testWidgets('pin tocado no mapa: linha da estacao destacada e rolada para a vista; linha tocada destaca o pin', (t) async {
      phone(t);
      final h = t.ensureSemantics();
      final b = StationsBackend(depots: [depotFixture()])
        ..stations = [
          st('st-a', 'Largo da Batata', distanceM: 100, lat: -23.567, lng: -46.686),
          st('st-b', 'Faria Lima', distanceM: 300, lat: -23.5645, lng: -46.6895),
          st('st-c', 'Fradique', distanceM: 500, lat: -23.5655, lng: -46.6875),
          st('st-d', 'Teodoro', distanceM: 700, lat: -23.5635, lng: -46.6855),
        ];
      await openStations(t, b, mapOn: true);
      expect(find.byType(FlutterMap), findsOneWidget);
      final row = find.byKey(const Key('station-row-st-d'));
      expect(row.hitTestable(), findsNothing, reason: 'recolhida: a ultima fica abaixo');
      final marker = find.byKey(const ValueKey('station-mode-st-d'));
      await t.tap(marker);
      await settle(t);
      expect(find.byKey(const Key('station-focus-st-d')).hitTestable(), findsOneWidget, reason: 'linha rolada para a vista');
      expect(t.getSemantics(find.byKey(const Key('station-focus-st-d'))), isSemantics(isSelected: true));
      expect(t.getSize(find.byKey(const Key('station-marker-disc-st-d'))).width, 46);

      await t.ensureVisible(find.byKey(const Key('station-focus-st-a')));
      await settle(t);
      await t.tap(find.byKey(const Key('station-focus-st-a')));
      await settle(t);
      expect(t.getSize(find.byKey(const Key('station-marker-disc-st-a'))).width, 46);
      expect(t.getSize(find.byKey(const Key('station-marker-disc-st-d'))).width, 38);
      h.dispose();
      await t.pumpWidget(const SizedBox());
    });
  });
}
