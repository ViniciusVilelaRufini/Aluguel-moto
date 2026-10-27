import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/features/battery/battery_swap_page.dart';
import 'package:volti_operador/features/fleet/van_stock_page.dart';

import 'helpers.dart';

/// Custodia de bateria na troca (2026-10-26): recusas da API por slug viram
/// mensagens em pt-BR (troca na tarefa e carregar a van).

DioException _problem(int status, String slug, String detail) {
  final req = RequestOptions(path: '/x');
  return DioException(
    requestOptions: req,
    response: Response(
      requestOptions: req,
      statusCode: status,
      data: {'type': 'https://api.volti.com.br/problems/$slug', 'title': slug, 'status': status, 'detail': detail},
    ),
  );
}

Future<void> _tap(WidgetTester t, Finder f) async {
  await t.ensureVisible(f);
  await t.tap(f);
  await t.pump();
}

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 4; i++) {
    await t.pump(const Duration(milliseconds: 20));
  }
}

void main() {
  group('mensagens por slug', () {
    test('slugs de custodia viram texto em pt-BR; outros mantem o detail da API', () {
      final cases = {
        'battery-not-in-van': 'Essa bateria não está na sua van.',
        'battery-in-other-van': 'Essa bateria não está na sua van.',
        'battery-serial-mismatch': 'A bateria retirada não é a desta moto.',
        'battery-at-station': 'Essa bateria está em uma estação.',
      };
      for (final MapEntry(key: slug, value: text) in cases.entries) {
        final e = mapDioError(_problem(409, slug, 'detalhe da API: BT-1'));
        expect(e.kind, FailureKind.rejected);
        expect(e.slug, slug);
        expect(e.status, 409);
        expect(e.message, text);
      }
      final other = mapDioError(_problem(409, 'task-type-mismatch', 'Esta tarefa não é de troca de bateria.'));
      expect(other.message, 'Esta tarefa não é de troca de bateria.');
    });
  });

  group('troca de bateria recusada', () {
    for (final (slug, text) in [
      ('battery-serial-mismatch', 'A bateria retirada não é a desta moto.'),
      ('battery-not-in-van', 'Essa bateria não está na sua van.'),
    ]) {
      testWidgets('$slug aparece na tela da troca', (tester) async {
        final h = Harness();
        h.repo.rejectWith = mapDioError(_problem(409, slug, 'detalhe'));
        await h.pump(tester, const BatterySwapPage(taskId: 't1'));
        await tester.enterText(find.byKey(const Key('removed-serial')), 'BT-111');
        await tester.enterText(find.byKey(const Key('installed-serial')), 'BT-222');
        await tester.pump();
        await _tap(tester, find.byKey(const Key('submit-swap')));
        await tester.pump();
        expect(find.textContaining(text), findsOneWidget);
        expect(find.byKey(const Key('swap-sent')), findsNothing);
      });
    }
  });

  group('carregar a van recusado', () {
    for (final (slug, text) in [
      ('battery-in-other-van', 'Essa bateria não está na sua van.'),
      ('battery-at-station', 'Essa bateria está em uma estação.'),
    ]) {
      testWidgets('$slug aparece no aviso', (tester) async {
        final repo = FakeFieldRepository()..van = fakeVan([]);
        final h = Harness(repo: repo);
        await h.pump(tester, const VanStockPage());
        await _settle(tester);
        repo.rejectWith = mapDioError(_problem(409, slug, 'detalhe'));
        await _tap(tester, find.byKey(const Key('van-load')));
        await tester.pumpAndSettle();
        await tester.enterText(find.byKey(const Key('van-load-serial')), 'BT-555');
        await tester.pump();
        await _tap(tester, find.byKey(const Key('van-load-add')));
        await _tap(tester, find.byKey(const Key('van-load-confirm')));
        await _settle(tester);
        expect(find.text(text), findsOneWidget);
        expect(repo.loads, isEmpty);
      });
    }
  });
}
