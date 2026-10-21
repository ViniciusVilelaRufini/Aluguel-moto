import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/features/battery/battery_swap_page.dart';
import 'package:volti_operador/features/inspection/inspection_page.dart';
import 'helpers.dart';

VoltiButton _button(WidgetTester t, String key) =>
    t.widget<VoltiButton>(find.byKey(Key(key)));

Future<void> _tap(WidgetTester t, String key) async {
  final f = find.byKey(Key(key));
  await t.ensureVisible(f);
  await t.tap(f);
  await t.pump();
}

Future<void> _answerAll(WidgetTester t, {String reading = '30'}) async {
  for (final id in ['brakes', 'tires', 'lights', 'bell']) {
    await _tap(t, '$id-ok');
  }
  await t.enterText(find.byKey(const Key('speed-reading')), reading);
  await t.pump();
}

void main() {
  group('checklist de inspecao', () {
    testWidgets('nao conclui sem todos os itens e sem foto', (tester) async {
      final h = Harness();
      await h.pump(tester, const InspectionPage(taskId: 't1'));
      expect(_button(tester, 'submit-inspection').onPressed, isNull);

      // Quatro itens respondidos, sem leitura do limitador: ainda bloqueado.
      for (final id in ['brakes', 'tires', 'lights', 'bell']) {
        await _tap(tester, '$id-ok');
      }
      expect(_button(tester, 'submit-inspection').onPressed, isNull);

      // Limitador respondido (leitura + ok), mas sem foto: bloqueado.
      await tester.enterText(find.byKey(const Key('speed-reading')), '30');
      await tester.pump();
      await _tap(tester, 'speedLimiter-ok');
      expect(find.text('5/5'), findsOneWidget);
      expect(_button(tester, 'submit-inspection').onPressed, isNull);

      // Com a foto, libera.
      await _tap(tester, 'photo-capture');
      expect(_button(tester, 'submit-inspection').onPressed, isNotNull);
    });

    testWidgets('sem todos os itens, mesmo com foto, nao envia', (tester) async {
      final h = Harness();
      await h.pump(tester, const InspectionPage(taskId: 't1'));
      await _tap(tester, 'photo-capture');
      await _tap(tester, 'brakes-ok');
      expect(_button(tester, 'submit-inspection').onPressed, isNull);
    });

    testWidgets('leitura acima de 32 forca "nao ok" e mostra aviso', (tester) async {
      final h = Harness();
      await h.pump(tester, const InspectionPage(taskId: 't1'));
      await _tap(tester, 'speedLimiter-ok');
      await tester.enterText(find.byKey(const Key('speed-reading')), '45');
      await tester.pump();

      expect(find.byKey(const Key('speed-noncompliant')), findsOneWidget);
      expect(find.text('Moto fora do limite legal — vai para manutenção'), findsOneWidget);
      final ok = tester.widget<ChoiceChip>(find.byKey(const Key('speedLimiter-ok')));
      final problem = tester.widget<ChoiceChip>(find.byKey(const Key('speedLimiter-problem')));
      expect(ok.selected, isFalse);
      expect(ok.onSelected, isNull); // nao da para marcar "ok"
      expect(problem.selected, isTrue);

      // Leitura de 32 ainda e legal.
      await tester.enterText(find.byKey(const Key('speed-reading')), '32');
      await tester.pump();
      expect(find.byKey(const Key('speed-noncompliant')), findsNothing);
    });

    testWidgets('envio com leitura > 32 abre manutencao e mostra a confirmacao', (tester) async {
      final h = Harness();
      await h.pump(tester, const InspectionPage(taskId: 't1'));
      await _answerAll(tester, reading: '50');
      await _tap(tester, 'photo-capture');
      await _tap(tester, 'submit-inspection');
      await tester.pump();

      expect(h.repo.inspections.single.draft.effectiveSpeedOk, isFalse);
      expect(h.repo.inspections.single.draft.speedReading, 50);
      expect(find.byKey(const Key('maintenance-opened')), findsOneWidget);
      expect(find.textContaining('maint-77'), findsOneWidget);
      expect(find.textContaining('alert-88'), findsOneWidget);
    });

    testWidgets('leitura fora de 0..100 e invalida', (tester) async {
      final h = Harness();
      await h.pump(tester, const InspectionPage(taskId: 't1'));
      await _answerAll(tester, reading: '150');
      await _tap(tester, 'photo-capture');
      expect(find.text('Informe um valor de 0 a 100.'), findsOneWidget);
      expect(_button(tester, 'submit-inspection').onPressed, isNull);
    });

    testWidgets('offline: salva como aguardando sincronizacao e envia quando a rede volta',
        (tester) async {
      final h = Harness()..repo.online = false;
      await h.pump(tester, const InspectionPage(taskId: 't1'));
      await _answerAll(tester);
      await _tap(tester, 'speedLimiter-ok');
      await _tap(tester, 'photo-capture');
      await _tap(tester, 'submit-inspection');
      await tester.pump();

      expect(find.byKey(const Key('inspection-queued')), findsOneWidget);
      expect(find.text('Aguardando sincronização'), findsOneWidget);
      expect(h.repo.inspections, isEmpty);
      final queued = await h.queue.all();
      expect(queued, hasLength(1));
      final key = queued.single.idempotencyKey;

      // A rede volta: a fila sincroniza sozinha.
      final container = ProviderScope.containerOf(tester.element(find.byType(InspectionPage)));
      h.repo.online = true;
      h.connectivity.controller.add(true);
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
      await tester.pump();

      expect(h.repo.inspections, hasLength(1));
      expect(h.repo.inspections.single.key, key);
      expect(h.repo.inspections.single.photoKeys, hasLength(1));
      expect(await h.queue.all(), isEmpty);
      expect(container.read(syncControllerProvider).pending, isEmpty);

      // Reenvio manual com a mesma chave nao duplica.
      await container.read(syncControllerProvider.notifier).sync();
      expect(h.repo.inspections, hasLength(1));
    });
  });

  group('troca de bateria', () {
    testWidgets('exige dois numeros de serie diferentes', (tester) async {
      final h = Harness();
      await h.pump(tester, const BatterySwapPage(taskId: 't1'));
      expect(_button(tester, 'submit-swap').onPressed, isNull);

      await tester.enterText(find.byKey(const Key('removed-serial')), 'BT-190577');
      await tester.pump();
      expect(_button(tester, 'submit-swap').onPressed, isNull);

      // Iguais (ignorando caixa): erro e bloqueado.
      await tester.enterText(find.byKey(const Key('installed-serial')), 'bt-190577');
      await tester.pump();
      expect(find.text('Os números de série precisam ser diferentes.'), findsOneWidget);
      expect(_button(tester, 'submit-swap').onPressed, isNull);

      // Diferentes: libera e envia.
      await tester.enterText(find.byKey(const Key('installed-serial')), 'BT-208431');
      await tester.pump();
      expect(_button(tester, 'submit-swap').onPressed, isNotNull);
      await _tap(tester, 'submit-swap');
      await tester.pump();
      expect(h.repo.swaps.single.$2.removedSerial, 'BT-190577');
      expect(h.repo.swaps.single.$2.installedSerial, 'BT-208431');
      expect(find.byKey(const Key('swap-sent')), findsOneWidget);
    });

    testWidgets('leitura por scanner preenche o campo', (tester) async {
      final h = Harness();
      await h.pump(
          tester, BatterySwapPage(taskId: 't1', scan: (_) async => 'BT-555000'));
      await _tap(tester, 'removed-serial-scan');
      await tester.pump();
      expect(find.text('BT-555000'), findsOneWidget);
    });

    testWidgets('offline guarda a troca na fila', (tester) async {
      final h = Harness()..repo.online = false;
      await h.pump(tester, const BatterySwapPage(taskId: 't1'));
      await tester.enterText(find.byKey(const Key('removed-serial')), 'BT-111');
      await tester.enterText(find.byKey(const Key('installed-serial')), 'BT-222');
      await tester.pump();
      await _tap(tester, 'submit-swap');
      await tester.pump();
      expect(find.byKey(const Key('swap-queued')), findsOneWidget);
      expect((await h.queue.all()).single.kind, JobKind.batterySwap);
    });
  });

  group('fila', () {
    test('job recusado pela API vira failed e bloqueia o seguinte da tarefa', () async {
      final h = Harness();
      final container = ProviderContainer(overrides: h.overrides);
      addTearDown(container.dispose);
      h.repo.rejectWith = const RepositoryException(
          FailureKind.rejected, 'recusado',
          slug: 'battery-serials-must-differ', status: 422);
      final c = container.read(syncControllerProvider.notifier);
      await c.submitBatterySwap(
          't1', const BatterySwapDraft(removedSerial: 'AAA', installedSerial: 'BBB'));
      await c.completeTask('t1', const CompletionDraft());
      final jobs = await h.queue.all();
      expect(jobs.first.status, JobStatus.failed);
      expect(jobs.first.error, 'recusado');
      expect(jobs.last.status, JobStatus.pending);
      expect(h.repo.completions, isEmpty);
    });
  });
}
