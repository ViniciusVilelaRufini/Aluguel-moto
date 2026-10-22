import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart' show VoltiBadgeTone;
import 'package:volti_operador/data/local_state.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/service_unlock.dart';
import 'package:volti_operador/features/tasks/completion.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations_pt.dart';

import 'helpers.dart';

const _complete = InspectionDraft(
  brakes: true,
  tires: true,
  lights: true,
  bell: true,
  speedReading: 30,
  speedOk: true,
  photoPaths: ['/tmp/a.jpg'],
);

void main() {
  final t = AppLocalizationsPt();

  group('formatDistance', () {
    test('metros arredondados a 10 m', () {
      expect(formatDistance(0), '0 m');
      expect(formatDistance(347), '350 m');
      expect(formatDistance(994), '990 m');
    });
    test('quilometros com uma casa e virgula', () {
      expect(formatDistance(995), '1,0 km');
      expect(formatDistance(1200), '1,2 km');
      expect(formatDistance(2000), '2,0 km');
      expect(formatDistance(2649), '2,6 km');
    });
    test('distancia ate a moto da tarefa', () {
      final task = fakeTask(); // -23.55, -46.65
      expect(distanceToTaskMeters(task, null, null), isNull);
      final d = distanceToTaskMeters(task, -23.55, -46.6534)!;
      expect(d, closeTo(347, 5));
      expect(formatDistance(d), '350 m');
    });
  });

  test('tom da prioridade segue o design (Média = warning)', () {
    expect(priorityTone(TaskPriority.high), VoltiBadgeTone.danger);
    expect(priorityTone(TaskPriority.medium), VoltiBadgeTone.warning);
    expect(priorityTone(TaskPriority.low), VoltiBadgeTone.neutral);
    expect(priorityTone(TaskPriority.urgent), VoltiBadgeTone.dark);
  });

  test('bateria: tom e autonomia (bat / 4.5)', () {
    expect(batteryTone(20), VoltiBadgeTone.danger);
    expect(batteryTone(21), VoltiBadgeTone.success);
    expect(batteryRangeKm(12), 3);
    expect(batteryRangeKm(91), 20);
  });

  test('prazo e hora de conclusao', () {
    final now = DateTime(2026, 10, 21, 12);
    final late = fakeTask().rebuild((b) => b.dueAt = DateTime(2026, 10, 21, 11).toUtc());
    final soon = fakeTask().rebuild((b) => b.dueAt = DateTime(2026, 10, 21, 14, 30).toUtc());
    expect(dueLabel(t, fakeTask(), now), isNull);
    expect(dueLabel(t, late, now), ('Atrasada', true));
    expect(dueLabel(t, soon, now), ('Até 14:30', false));
    final done = fakeTask(status: FieldTaskStatus.done)
        .rebuild((b) => b.completedAt = DateTime(2026, 10, 21, 9, 5).toUtc());
    expect(doneLabel(t, done), 'Concluída às 09:05');
    expect(dueLabel(t, done.rebuild((b) => b.dueAt = DateTime(2026)), now), isNull);
  });

  group('regra de conclusao', () {
    List<CompletionBlocker> blockers({
      FieldTaskType type = FieldTaskType.collect,
      bool unlocked = true,
      InspectionDraft draft = _complete,
      bool inspected = false,
      bool swapped = false,
    }) =>
        completionBlockers(
          task: fakeTask(type: type),
          unlocked: unlocked,
          draft: draft,
          inspectionRegistered: inspected,
          swapRegistered: swapped,
        );

    test('tudo feito libera', () => expect(blockers(), isEmpty));

    test('exige modo servico, checklist e foto', () {
      expect(blockers(unlocked: false, draft: const InspectionDraft()), [
        CompletionBlocker.serviceUnlock,
        CompletionBlocker.checklist,
        CompletionBlocker.photo,
      ]);
      expect(blockers(draft: _complete.copyWith(photoPaths: [])), [CompletionBlocker.photo]);
      expect(blockers(draft: _complete.copyWith(bell: null)), [CompletionBlocker.checklist]);
    });

    test('checklist ja enviado (ou na fila) conta como feito', () {
      expect(blockers(draft: const InspectionDraft(), inspected: true), isEmpty);
    });

    test('tarefa de bateria exige a troca registrada', () {
      expect(blockers(type: FieldTaskType.batterySwap), [CompletionBlocker.batterySwap]);
      expect(blockers(type: FieldTaskType.batterySwap, swapped: true), isEmpty);
    });

    test('texto do motivo', () {
      expect(completionHint(t, [CompletionBlocker.serviceUnlock]),
          'Para concluir: destrave em modo serviço.');
      expect(
          completionHint(t, [
            CompletionBlocker.serviceUnlock,
            CompletionBlocker.checklist,
            CompletionBlocker.photo,
          ]),
          'Para concluir: destrave em modo serviço, complete o checklist e tire a foto da moto.');
    });
  });

  group('modo servico persistido', () {
    test('le o estado salvo e grava/limpa no armazenamento', () async {
      final store = MemoryServiceUnlockStore(['task-9']);
      final c = ProviderContainer(
          overrides: [serviceUnlockStoreProvider.overrideWithValue(store)]);
      addTearDown(c.dispose);
      expect(c.read(serviceUnlockProvider), {'task-9'});
      await c.read(serviceUnlockProvider.notifier).markUnlocked('task-1');
      expect(store.all(), {'task-9', 'task-1'});
      await c.read(serviceUnlockProvider.notifier).clear('task-9');
      expect(c.read(serviceUnlockProvider), {'task-1'});
      expect(store.all(), {'task-1'});
    });
  });

  test('rascunho do checklist: adiciona e remove fotos', () {
    final c = ProviderContainer();
    addTearDown(c.dispose);
    final n = c.read(inspectionDraftsProvider.notifier);
    n.addPhoto('t1', '/a.jpg');
    n.addPhoto('t1', '/b.jpg');
    n.removePhoto('t1', 0);
    n.removePhoto('t1', 7); // fora do intervalo: ignora
    expect(n.of('t1').photoPaths, ['/b.jpg']);
    expect(n.of('t2').photoPaths, isEmpty);
  });
}
