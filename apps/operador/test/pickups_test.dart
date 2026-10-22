import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show SemanticsNode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/depot_state.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/handover_events.dart';
import 'package:volti_operador/data/handover_models.dart';
import 'package:volti_operador/features/auth/auth.dart';
import 'package:volti_operador/data/local_state.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/service_unlock.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/features/arrivals/arrival_checklist_page.dart';
import 'package:volti_operador/features/home/home_shell.dart';
import 'package:volti_operador/features/pickups/handover_status_page.dart';
import 'package:volti_operador/features/pickups/pickup_checklist_page.dart';
import 'package:volti_operador/features/pickups/pickup_scan_page.dart';
import 'package:volti_operador/features/pickups/pickups_page.dart';
import 'package:volti_operador/features/tasks/task_detail_page.dart';

import 'helpers.dart';

class _Repo extends FakeFieldRepository {
  _Repo([this.tasks = const []]);
  final List<FieldTask> tasks;

  @override
  Future<List<FieldTask>> listTasks() async => tasks;
}

VoltiButton _button(WidgetTester t, String key) => t.widget<VoltiButton>(find.byKey(Key(key)));

/// Rola a lista ate o widget (as listas sao preguicosas) e garante que esta visivel.
Future<void> _reveal(WidgetTester t, Finder f) async {
  if (f.evaluate().isEmpty) {
    // Volta ao topo e desce ate achar.
    final list = find.byType(Scrollable).first;
    await t.drag(list, const Offset(0, 5000));
    await t.pumpAndSettle();
    await t.scrollUntilVisible(f, 150, scrollable: list);
  }
  await t.ensureVisible(f);
}

Future<void> _tap(WidgetTester t, String key) async {
  final f = find.byKey(Key(key));
  await _reveal(t, f);
  await t.pump();
  await t.tap(f);
  await t.pump();
}

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 4; i++) {
    await t.pump(const Duration(milliseconds: 100));
  }
}

Future<void> _enter(WidgetTester t, String key, String text) async {
  final f = find.byKey(Key(key));
  await _reveal(t, f);
  await t.enterText(f, text);
  await t.pump();
}

/// Semantica do widget, rolando ate ele antes (lista preguicosa).
Future<SemanticsNode> _sem(WidgetTester t, Key key) async {
  final f = find.byKey(key);
  await _reveal(t, f);
  await t.pump();
  return t.getSemantics(f);
}

double _y(WidgetTester t, String key) => t.getTopLeft(find.byKey(Key(key))).dy;

/// Preenche o checklist de saida inteiro (todos ok), sem fotos nem bateria.
Future<void> _answerPickup(WidgetTester t, {String? problem}) async {
  for (final code in pickupChecklistCodes) {
    await _tap(t, 'ho-$code-${code == problem ? 'problem' : 'ok'}');
  }
}

Future<void> _photos(WidgetTester t, int n) async {
  const slots = ['photo-front', 'photo-back', 'photo-left', 'photo-right'];
  for (var i = 0; i < n; i++) {
    await _tap(t, slots[i]);
    await _settle(t);
  }
}

void _noOverflow(WidgetTester t) => expect(t.takeException(), isNull);

void main() {
  group('agenda de retiradas', () {
    testWidgets('acionaveis primeiro (agora, depois por horario) e concluidas recolhidas',
        (tester) async {
      final h = Harness();
      final today = DateTime.now().toUtc();
      DateTime at(int hh, [int mm = 0]) =>
          DateTime.utc(today.year, today.month, today.day, hh, mm);
      h.repo.pickups = [
        fakeReservation(
            id: 'r-s15', mode: PickupMode.scheduled, pickupAt: at(18), firstName: 'Bruno'),
        fakeReservation(
            id: 'r-ho', status: ReservationStatus.handover, handoverId: 'ho-9', firstName: 'Caio'),
        fakeReservation(id: 'r-n2', createdAt: at(12, 30), firstName: 'Davi'),
        fakeReservation(id: 'r-conv', status: ReservationStatus.converted, firstName: 'Eva'),
        fakeReservation(
            id: 'r-s14', mode: PickupMode.scheduled, pickupAt: at(17), firstName: 'Fabi'),
        fakeReservation(id: 'r-exp', status: ReservationStatus.expired, firstName: 'Gil'),
        fakeReservation(id: 'r-n1', createdAt: at(12), firstName: 'Ana Maria Souza'),
      ];
      await h.pump(tester, const PickupsPage());
      await _settle(tester);

      // Agenda do dia do galpao (unico galpao, pre-selecionado).
      expect(h.repo.pickupQueries.single.$1, 'depot-1');
      final order = ['pickup-r-n1', 'pickup-r-n2', 'pickup-r-s14', 'pickup-r-s15', 'pickup-r-ho'];
      for (var i = 0; i < order.length - 1; i++) {
        expect(_y(tester, order[i]), lessThan(_y(tester, order[i + 1])),
            reason: '${order[i]} antes de ${order[i + 1]}');
      }
      // Concluidas hoje ficam recolhidas.
      expect(find.text('Concluídas hoje (2)'), findsOneWidget);
      expect(find.byKey(const Key('pickup-r-conv')), findsNothing);
      await _tap(tester, 'pickups-done-toggle');
      expect(find.byKey(const Key('pickup-r-conv')), findsOneWidget);
      expect(find.byKey(const Key('pickup-r-exp')), findsOneWidget);
      expect(_y(tester, 'pickup-r-ho'), lessThan(_y(tester, 'pickup-r-conv')));

      // So o primeiro nome do cliente.
      expect(find.textContaining('Ana'), findsWidgets);
      expect(find.textContaining('Maria'), findsNothing);
      expect(find.textContaining('Souza'), findsNothing);
      expect(find.textContaining('Retirar agora'), findsWidgets);
      expect(find.textContaining('Agendada'), findsWidgets);
    });

    testWidgets('aba Retiradas so carrega quando aberta', (tester) async {
      final h = Harness(repo: _Repo());
      h.repo.pickups = [fakeReservation()];
      await h.pump(tester, const HomeShell());
      await _settle(tester);
      expect(h.repo.pickupQueries, isEmpty);
      expect(find.byType(PickupsPage), findsNothing);
      await _tap(tester, 'nav-pickups');
      await _settle(tester);
      expect(find.byType(PickupsPage), findsOneWidget);
      expect(h.repo.pickupQueries, hasLength(1));
      expect(find.text('Retiradas de hoje'), findsWidgets);
    });

    testWidgets('com dois galpoes, pede para escolher', (tester) async {
      final h = Harness();
      h.repo.depots = [fakeDepot(), fakeDepot(id: 'depot-2', name: 'Galpão Mooca')];
      await h.pump(tester, const PickupsPage());
      await _settle(tester);
      expect(h.repo.pickupQueries, isEmpty);
      expect(find.text('Em qual galpão você está?'), findsOneWidget);
      await _tap(tester, 'depot-depot-2');
      await _settle(tester);
      expect(h.repo.pickupQueries.single.$1, 'depot-2');
      expect(find.text('Galpão Mooca'), findsWidgets);
    });
  });

  group('leitura do QR', () {
    testWidgets('pre-checagem nao bloqueia: so vazio ou longo demais e invalido',
        (tester) async {
      final h = Harness();
      h.repo.pickups = [fakeReservation()];
      await h.pump(tester, PickupScanPage(scan: (_) async => 'x' * 300));
      await _settle(tester);

      // Longo demais (contrato: ate 256), lido pela camera.
      await _tap(tester, 'pickup-open-camera');
      await _settle(tester);
      expect(find.text('Código inválido'), findsOneWidget);
      expect(find.byType(PickupChecklistPage), findsNothing);

      // Vencido pelo relogio local: so aviso; o operador pode seguir.
      await _enter(tester, 'pickup-code',
          fakePickupCode(expiresAt: DateTime.now().subtract(const Duration(minutes: 1))));
      await _tap(tester, 'pickup-code-continue');
      await _settle(tester);
      expect(find.text('Código vencido'), findsOneWidget);
      await _tap(tester, 'pickup-code-proceed');
      await _settle(tester);
      expect(find.byType(PickupChecklistPage), findsOneWidget);
    });

    testWidgets('formato desconhecido segue para o checklist (a API decide)', (tester) async {
      final h = Harness();
      h.repo.pickups = [fakeReservation()];
      await h.pump(tester, PickupScanPage(scan: (_) async => 'v2-formato-novo-ABC123'));
      await _settle(tester);
      await _tap(tester, 'pickup-open-camera');
      await _settle(tester);
      expect(find.byType(PickupChecklistPage), findsOneWidget);
    });

    testWidgets('valido e na agenda abre o checklist direto', (tester) async {
      final h = Harness();
      h.repo.pickups = [fakeReservation()];
      await h.pump(tester, const PickupScanPage());
      await _settle(tester);
      await _enter(tester, 'pickup-code', fakePickupCode());
      await _tap(tester, 'pickup-code-continue');
      await _settle(tester);
      expect(find.byType(PickupChecklistPage), findsOneWidget);
      expect(find.textContaining('Ana'), findsWidgets);
    });

    testWidgets('resposta perdida: 409 reservation-in-handover abre o estado da entrega',
        (tester) async {
      final h = Harness();
      h.repo.pickups = [
        fakeReservation(status: ReservationStatus.handover, handoverId: 'ho-9'),
      ];
      h.repo.handovers['ho-9'] = Handover((b) => b
        ..id = 'ho-9'
        ..type = HandoverType.pickup
        ..depotId = 'depot-1'
        ..vehicleId = 'veh-7'
        ..operatorId = 'op-1'
        ..batteryPct = 98
        ..status = HandoverStatus.pendingCustomer
        ..createdAt = DateTime.utc(2026, 10, 22, 13));
      h.repo.rejectHandoverWith = const RepositoryException(FailureKind.rejected, 'Em entrega',
          status: 409, slug: 'reservation-in-handover');
      await h.pump(tester, PickupChecklistPage(pickupCode: fakePickupCode()));
      await _settle(tester);
      await _answerPickup(tester);
      await _enter(tester, 'battery-pct', '95');
      await _photos(tester, 4);
      await _tap(tester, 'submit-pickup');
      await _settle(tester);
      expect(find.byType(HandoverStatusPage), findsOneWidget);
      expect(find.text('Aguardando o cliente'), findsOneWidget);
    });

    testWidgets('assinatura recusada pela API (404) mostra "Código inválido"', (tester) async {
      final h = Harness();
      h.repo.rejectHandoverWith = const RepositoryException(FailureKind.rejected, 'Not found',
          status: 404, slug: 'not-found');
      await h.pump(tester, PickupChecklistPage(pickupCode: fakePickupCode()));
      await _settle(tester);
      await _answerPickup(tester);
      await _enter(tester, 'battery-pct', '95');
      await _photos(tester, 4);
      await _tap(tester, 'submit-pickup');
      await _settle(tester);
      expect(find.text('Código inválido'), findsOneWidget);
      expect(find.byType(HandoverStatusPage), findsNothing);
    });
  });

  group('checklist de saida', () {
    testWidgets('exige os itens, a bateria e 4 fotos; envia e mostra "Aguardando o cliente"',
        (tester) async {
      final h = Harness();
      final code = fakePickupCode();
      await h.pump(tester, PickupChecklistPage(pickupCode: code));
      await _settle(tester);
      expect(_button(tester, 'submit-pickup').onPressed, isNull);

      await _answerPickup(tester, problem: 'carenagem');
      await _enter(tester, 'note-carenagem', 'Risco no lado direito');
      expect(_button(tester, 'submit-pickup').onPressed, isNull);

      await _photos(tester, 3);
      await _enter(tester, 'battery-pct', '98');
      expect(_button(tester, 'submit-pickup').onPressed, isNull, reason: 'so 3 fotos');
      expect(find.byKey(const Key('submit-hint')), findsOneWidget);

      await _photos(tester, 4);
      await _enter(tester, 'battery-pct', '101');
      expect(_button(tester, 'submit-pickup').onPressed, isNull, reason: 'bateria invalida');
      await _enter(tester, 'battery-pct', '98');
      await _enter(tester, 'battery-serial', 'BT-190577');
      expect(_button(tester, 'submit-pickup').onPressed, isNotNull);

      await _tap(tester, 'submit-pickup');
      await _settle(tester);
      final req = h.repo.createdHandovers.single;
      expect(req.type, HandoverType.pickup);
      expect(req.pickupCode, code);
      expect(req.photoKeys, hasLength(4));
      expect(req.photoKeys.every((k) => k.startsWith('handovers/')), isTrue);
      expect(req.batteryPct, 98);
      expect(req.batterySerial, 'BT-190577');
      expect(req.checklist.map((i) => i.code), pickupChecklistCodes);
      final fairing = req.checklist.firstWhere((i) => i.code == 'carenagem');
      expect(fairing.ok, isFalse);
      expect(fairing.note, 'Risco no lado direito');

      expect(find.byType(HandoverStatusPage), findsOneWidget);
      expect(find.text('Aguardando o cliente'), findsWidgets);
    });

    testWidgets('sem rede guarda o rascunho e envia quando a rede volta', (tester) async {
      final h = Harness();
      final code = fakePickupCode();
      await h.pump(tester, PickupChecklistPage(pickupCode: code));
      await _settle(tester);
      await _answerPickup(tester);
      await _enter(tester, 'battery-pct', '90');
      await _photos(tester, 4);

      h.goOffline();
      await _settle(tester);
      await _tap(tester, 'submit-pickup');
      await _settle(tester);
      expect(find.text('Sem conexão: envie quando voltar a rede'), findsOneWidget);
      expect(find.text('O rascunho fica guardado enquanto o app estiver aberto.'), findsOneWidget);
      expect(h.repo.createdHandovers, isEmpty);
      final container = ProviderScope.containerOf(tester.element(find.byType(PickupChecklistPage)));
      expect(container.read(pickupDraftsProvider)[code]?.canSubmit, isTrue);

      h.goOnline();
      await _settle(tester);
      await _tap(tester, 'submit-pickup');
      await _settle(tester);
      expect(h.repo.createdHandovers, hasLength(1));
      expect(container.read(pickupDraftsProvider)[code], isNull);
    });
  });

  group('estado ao vivo da entrega', () {
    testWidgets('muda com handover.updated (e recarrega pelo GET)', (tester) async {
      final h = Harness();
      final base = Handover((b) => b
        ..id = 'ho-1'
        ..type = HandoverType.pickup
        ..depotId = 'depot-1'
        ..vehicleId = 'veh-7'
        ..vehicleCode = 'VLT-0007'
        ..operatorId = 'op-1'
        ..batteryPct = 98
        ..status = HandoverStatus.pendingCustomer
        ..createdAt = DateTime.utc(2026, 10, 22, 13));
      h.repo.handovers['ho-1'] = base;
      await h.pump(tester, const HandoverStatusPage(handoverId: 'ho-1'));
      await _settle(tester);
      expect(find.text('Aguardando o cliente'), findsOneWidget);

      // Outra entrega: ignora.
      final gets = h.repo.handoverGets;
      h.events.emit('ho-2', HandoverStatus.accepted);
      await _settle(tester);
      expect(h.repo.handoverGets, gets);

      h.repo.handovers['ho-1'] = base.rebuild((b) => b.lastError = 'payment-declined');
      h.events.emit('ho-1', HandoverStatus.pendingCustomer, lastError: 'payment-declined');
      await _settle(tester);
      expect(h.repo.handoverGets, gets + 1);
      expect(find.text('Pagamento não aprovado'), findsOneWidget);

      h.repo.handovers['ho-1'] = base.rebuild((b) => b
        ..status = HandoverStatus.disputed
        ..disputeReason = 'Retrovisor quebrado');
      h.events.emit('ho-1', HandoverStatus.disputed);
      await _settle(tester);
      expect(find.text('Problema apontado'), findsOneWidget);
      expect(find.textContaining('Retrovisor quebrado'), findsOneWidget);

      h.repo.handovers['ho-1'] = base.rebuild((b) => b.status = HandoverStatus.accepted);
      h.events.emit('ho-1', HandoverStatus.accepted);
      await _settle(tester);
      expect(find.text('Aceito — moto liberada'), findsOneWidget);
    });

    testWidgets('sem o GET, usa o status do evento', (tester) async {
      final h = Harness();
      h.repo.handovers['ho-1'] = Handover((b) => b
        ..id = 'ho-1'
        ..type = HandoverType.pickup
        ..depotId = 'depot-1'
        ..vehicleId = 'veh-7'
        ..operatorId = 'op-1'
        ..batteryPct = 98
        ..status = HandoverStatus.pendingCustomer
        ..createdAt = DateTime.utc(2026, 10, 22, 13));
      await h.pump(tester, const HandoverStatusPage(handoverId: 'ho-1'));
      await _settle(tester);
      h.repo.online = false;
      h.events.emit('ho-1', HandoverStatus.accepted);
      await _settle(tester);
      expect(find.text('Aceito — moto liberada'), findsOneWidget);
    });
  });

  group('chegada', () {
    Future<void> fillArrival(WidgetTester t, {String? problem, bool photo = true}) async {
      for (final code in arrivalChecklistCodes) {
        await _tap(t, 'arr-$code-${code == problem ? 'problem' : 'ok'}');
      }
      await _enter(t, 'arrival-battery', '35');
      if (photo) {
        await _tap(t, 'arrival-photo');
        await _settle(t);
      }
    }

    testWidgets('devolucao no galpao com item problematico vai para manutencao',
        (tester) async {
      final h = Harness();
      h.repo.vehiclesByCode['VLT-0009'] = rentedVehicle();
      await h.pump(tester, const ArrivalChecklistPage());
      await _settle(tester);
      expect(_button(tester, 'submit-arrival').onPressed, isNull);

      await _enter(tester, 'arrival-vehicle', 'vlt-0009');
      await _tap(tester, 'arrival-find');
      await _settle(tester);
      expect(find.text('VLT-0009 · aluguel aberto'), findsOneWidget);

      await fillArrival(tester, problem: 'freios');
      expect(find.text('A moto vai para manutenção'), findsOneWidget);
      expect(_button(tester, 'submit-arrival').onPressed, isNotNull);

      await _tap(tester, 'submit-arrival');
      await _settle(tester);
      final req = h.repo.createdHandovers.single;
      expect(req.type, HandoverType.returnDepot);
      expect(req.rentalId, 'rental-1');
      expect(req.depotId, 'depot-1');
      expect(req.batteryPct, 35);
      expect(req.photoKeys.single, startsWith('handovers/'));
      expect(req.checklist.firstWhere((i) => i.code == 'freios').ok, isFalse);
      expect(find.text('Chegada registrada. Moto em manutenção.'), findsOneWidget);
    });

    testWidgets('moto sem aluguel aberto nao segue', (tester) async {
      final h = Harness();
      h.repo.vehiclesByCode['VLT-0009'] = rentedVehicle(rentalId: null);
      await h.pump(tester, const ArrivalChecklistPage());
      await _settle(tester);
      await _enter(tester, 'arrival-vehicle', 'VLT-0009');
      await _tap(tester, 'arrival-find');
      await _settle(tester);
      expect(find.text('Esta moto não tem aluguel aberto.'), findsOneWidget);
      await fillArrival(tester);
      expect(_button(tester, 'submit-arrival').onPressed, isNull);
    });

    testWidgets('sem rede a chegada vai para a fila e envia ao reconectar', (tester) async {
      final h = Harness();
      h.repo.vehiclesByCode['VLT-0009'] = rentedVehicle();
      // Galpoes ja vistos antes (cache).
      await h.queue.saveDepots([
        standardSerializers.serializeWith(Depot.serializer, fakeDepot())!
            as Map<String, dynamic>,
      ]);
      h.goOffline();
      await h.pump(tester, const ArrivalChecklistPage());
      await _settle(tester);
      await _enter(tester, 'arrival-vehicle', 'VLT-0009');
      await _tap(tester, 'arrival-find');
      await _settle(tester);
      expect(find.byKey(const Key('arrival-vehicle-offline')), findsOneWidget);
      await fillArrival(tester);
      await _tap(tester, 'submit-arrival');
      await _settle(tester);
      expect(find.text('A chegada será enviada quando a rede voltar.'), findsOneWidget);
      expect((await h.queue.all()).single.kind, JobKind.returnHandover);

      h.goOnline();
      await _settle(tester);
      final container =
          ProviderScope.containerOf(tester.element(find.byType(ArrivalChecklistPage)));
      await container.read(syncControllerProvider.notifier).sync();
      await _settle(tester);
      expect(h.repo.createdHandovers.single.rentalId, 'rental-1');
      expect(await h.queue.all(), isEmpty);
    });

    testWidgets('recolhimento conclui a tarefa collect com o galpao e manutencao',
        (tester) async {
      final h = Harness(repo: _Repo([fakeTask(type: FieldTaskType.collect)]));
      h.repo.depots = [fakeDepot(), fakeDepot(id: 'depot-2', name: 'Galpão Mooca')];
      await h.pump(tester, const TaskDetailPage(taskId: 'task-1'), extraOverrides: [
        serviceUnlockStoreProvider.overrideWithValue(MemoryServiceUnlockStore(['task-1'])),
      ]);
      await _settle(tester);
      final container = ProviderScope.containerOf(tester.element(find.byType(TaskDetailPage)));
      container.read(inspectionDraftsProvider.notifier).put(
          'task-1',
          const InspectionDraft(
              brakes: true,
              tires: true,
              lights: true,
              bell: true,
              speedReading: 30,
              speedOk: true,
              photoPaths: ['/tmp/p.jpg']));
      await _settle(tester);

      await _tap(tester, 'complete');
      await _settle(tester);
      expect(find.byType(ArrivalChecklistPage), findsOneWidget);
      expect(find.text('Chegada do recolhimento'), findsOneWidget);
      await fillArrival(tester, problem: 'pneus', photo: false);
      // Dois galpoes: precisa escolher.
      expect(_button(tester, 'submit-arrival').onPressed, isNull);
      await _tap(tester, 'depot-depot-2');
      await _tap(tester, 'submit-arrival');
      await _settle(tester);

      final done = h.repo.completions.single;
      expect(done.$1, 'task-1');
      expect(done.$2.depotId, 'depot-2');
      expect(done.$2.vehicleStatus, 'maintenance');
      expect(done.$2.notes, contains('Pneus: problema'));
    });

    testWidgets('recolhimento com um galpao so: pre-selecionado e moto livre', (tester) async {
      final h = Harness(repo: _Repo([fakeTask(type: FieldTaskType.collect)]));
      await h.pump(
          tester,
          ArrivalChecklistPage(
              collectTask: fakeTask(type: FieldTaskType.collect),
              onCollectDone: (d) => h.repo.completions.add(('task-1', d, 'k'))));
      await _settle(tester);
      await fillArrival(tester, photo: false);
      await _tap(tester, 'submit-arrival');
      await _settle(tester);
      expect(h.repo.completions.single.$2.depotId, 'depot-1');
      expect(h.repo.completions.single.$2.vehicleStatus, 'free');
    });
  });

  group('acessibilidade (200% em 360x740)', () {
    const small = Size(360, 740);

    testWidgets('agenda', (tester) async {
      final handle = tester.ensureSemantics();
      final h = Harness();
      h.repo.pickups = [
        fakeReservation(firstName: 'Maximiliana'),
        fakeReservation(id: 'r-2', mode: PickupMode.scheduled, pickupAt: DateTime.now()),
        fakeReservation(id: 'r-3', status: ReservationStatus.converted),
      ];
      await h.pump(tester, const HomeShell(initialIndex: 1), surface: small, textScale: 2);
      await _settle(tester);
      _noOverflow(tester);
      expect(await _sem(tester, const Key('scan-qr')),
          isSemantics(hasTapAction: true, isButton: true));
      expect(await _sem(tester, Key('pickup-$reservationUuid')),
          isSemantics(hasTapAction: true));
      expect(await _sem(tester, const Key('pickups-done-toggle')),
          isSemantics(hasTapAction: true, isButton: true));
      await _tap(tester, 'pickups-done-toggle');
      _noOverflow(tester);
      handle.dispose();
    });

    testWidgets('leitura do QR', (tester) async {
      final h = Harness();
      await h.pump(tester, PickupScanPage(scan: (_) async => 'x'), surface: small, textScale: 2);
      await _settle(tester);
      await _tap(tester, 'pickup-open-camera');
      await _settle(tester);
      _noOverflow(tester);
    });

    testWidgets('checklist de saida', (tester) async {
      final handle = tester.ensureSemantics();
      final h = Harness();
      await h.pump(tester, PickupChecklistPage(pickupCode: fakePickupCode()),
          surface: small, textScale: 2);
      await _settle(tester);
      _noOverflow(tester);
      await _answerPickup(tester, problem: 'freios');
      await _photos(tester, 4);
      _noOverflow(tester);
      expect(await _sem(tester, const Key('photo-front')),
          isSemantics(hasTapAction: true));
      expect(await _sem(tester, const Key('ho-luzes-ok')),
          isSemantics(hasTapAction: true, isSelected: true));
      handle.dispose();
    });

    testWidgets('estado da entrega', (tester) async {
      final h = Harness();
      h.repo.handovers['ho-1'] = Handover((b) => b
        ..id = 'ho-1'
        ..type = HandoverType.pickup
        ..depotId = 'depot-1'
        ..vehicleId = 'veh-7'
        ..vehicleCode = 'VLT-0007'
        ..operatorId = 'op-1'
        ..batteryPct = 98
        ..status = HandoverStatus.disputed
        ..disputeReason = 'Retrovisor esquerdo quebrado e farol trincado'
        ..createdAt = DateTime.utc(2026, 10, 22, 13));
      await h.pump(tester, const HandoverStatusPage(handoverId: 'ho-1'),
          surface: small, textScale: 2);
      await _settle(tester);
      _noOverflow(tester);
    });

    testWidgets('chegada', (tester) async {
      final handle = tester.ensureSemantics();
      final h = Harness();
      h.repo.depots = [fakeDepot(), fakeDepot(id: 'depot-2', name: 'Galpão Mooca')];
      await h.pump(tester, const ArrivalChecklistPage(), surface: small, textScale: 2);
      await _settle(tester);
      _noOverflow(tester);
      await _tap(tester, 'arr-freios-problem');
      _noOverflow(tester);
      expect(await _sem(tester, const Key('depot-depot-2')),
          isSemantics(hasTapAction: true));
      handle.dispose();
    });
  });

  group('fix round 1', () {
    String d(Date x) => '${x.year}-${x.month}-${x.day}';

    testWidgets('agenda e horarios no fuso do galpao (23:30 em Sao Paulo = 02:30 UTC)',
        (tester) async {
      final h = Harness();
      final now = DateTime.utc(2026, 10, 23, 2, 30);
      h.repo.pickups = [
        fakeReservation(mode: PickupMode.scheduled, pickupAt: DateTime.utc(2026, 10, 23, 1)),
      ];
      await h.pump(tester, const PickupsPage(),
          extraOverrides: [clockProvider.overrideWithValue(() => now)]);
      await _settle(tester);
      expect(d(h.repo.pickupQueries.single.$2), '2026-10-22');
      expect(find.text('Agendada 22:00 · até 22:30'), findsOneWidget);
    });

    testWidgets('outro fuso de galpao (America/Manaus, UTC-4)', (tester) async {
      final h = Harness();
      h.repo.depots = [fakeDepot(timezone: 'America/Manaus')];
      final now = DateTime.utc(2026, 10, 23, 3, 30); // 23:30 em Manaus
      h.repo.pickups = [
        fakeReservation(mode: PickupMode.scheduled, pickupAt: DateTime.utc(2026, 10, 23, 1)),
      ];
      await h.pump(tester, const PickupsPage(),
          extraOverrides: [clockProvider.overrideWithValue(() => now)]);
      await _settle(tester);
      expect(d(h.repo.pickupQueries.single.$2), '2026-10-22');
      expect(find.text('Agendada 21:00 · até 21:30'), findsOneWidget);
    });

    testWidgets('rascunhos vencidos ou de reservas encerradas somem ao carregar a agenda',
        (tester) async {
      const other = '11111111-2222-4333-8444-555555555555';
      final h = Harness();
      h.repo.pickups = [
        fakeReservation(),
        fakeReservation(id: other, status: ReservationStatus.canceled),
      ];
      await h.pump(tester, const PickupsPage());
      await _settle(tester);
      final c = ProviderScope.containerOf(tester.element(find.byType(PickupsPage)));
      final valid = fakePickupCode();
      final expired = fakePickupCode(
          reservationId: '99999999-2222-4333-8444-555555555555',
          expiresAt: DateTime.now().subtract(const Duration(minutes: 5)));
      final canceled = fakePickupCode(reservationId: other);
      final drafts = c.read(pickupDraftsProvider.notifier);
      for (final code in [valid, expired, canceled]) {
        drafts.put(PickupDraft(pickupCode: code));
      }
      c.invalidate(pickupsProvider('depot-1'));
      await _settle(tester);
      expect(c.read(pickupDraftsProvider).keys, [valid]);
    });

    testWidgets('return_depot reenviado: 409 e o aluguel ja encerrado conta como sucesso',
        (tester) async {
      final h = Harness();
      await h.pump(tester, const SizedBox());
      final c = ProviderScope.containerOf(tester.element(find.byType(SizedBox)));
      h.repo.rejectHandoverWith = const RepositoryException(FailureKind.rejected, 'Conflito',
          status: 409, slug: 'conflict');
      h.repo.vehiclesByCode['VLT-0009'] = rentedVehicle(rentalId: null);
      const draft = ArrivalDraft(
          items: {'freios': true, 'pneus': true, 'luzes': true, 'carenagem': true},
          batteryPct: 40,
          depotId: 'depot-1');
      final ok = await c.read(syncControllerProvider.notifier).submitReturnHandover(
          const ReturnArrival(
              vehicleCode: 'VLT-0009', depotId: 'depot-1', rentalId: 'rental-1', draft: draft));
      expect(ok.synced, isTrue);
      expect(await h.queue.all(), isEmpty);

      // Aluguel ainda aberto: o 409 e uma recusa de verdade.
      h.repo.vehiclesByCode['VLT-0008'] = rentedVehicle(code: 'VLT-0008', rentalId: 'rental-2');
      final no = await c.read(syncControllerProvider.notifier).submitReturnHandover(
          const ReturnArrival(
              vehicleCode: 'VLT-0008', depotId: 'depot-1', rentalId: 'rental-2', draft: draft));
      expect(no.synced, isFalse);
      expect(no.job.status, JobStatus.failed);
    });

    testWidgets('falha de sessao ao conferir a moto pede novo login', (tester) async {
      final h = Harness();
      h.repo.vehiclesByCode['VLT-0009'] = rentedVehicle();
      await h.pump(tester, const ArrivalChecklistPage());
      await _settle(tester);
      h.repo.rejectWith =
          const RepositoryException(FailureKind.auth, 'Sessão expirada.', status: 401);
      await _enter(tester, 'arrival-vehicle', 'VLT-0009');
      await _tap(tester, 'arrival-find');
      await _settle(tester);
      expect(find.text('Sua sessão expirou. Entre de novo para conferir a moto.'), findsOneWidget);
      expect(find.text('Moto não encontrada.'), findsNothing);
    });

    test('socket segue a sessao e e descartado ao sair', () {
      final created = <_CountingEvents>[];
      final c = ProviderContainer(overrides: [
        sessionProvider.overrideWith(_Session.new),
        handoverEventsFactoryProvider.overrideWithValue(() {
          final e = _CountingEvents();
          created.add(e);
          return e;
        }),
      ]);
      addTearDown(c.dispose);
      final sub = c.listen(handoverEventsProvider, (_, _) {});
      expect(created, hasLength(1));
      (c.read(sessionProvider.notifier) as _Session).set(null);
      c.read(handoverEventsProvider);
      expect(created.single.disposed, isTrue);
      expect(created, hasLength(1), reason: 'sem sessao nao conecta');
      (c.read(sessionProvider.notifier) as _Session).set('outro@volti.dev');
      c.read(handoverEventsProvider);
      expect(created, hasLength(2));
      sub.close();
    });
  });
}

class _Session extends SessionController {
  @override
  String? build() => 'op@volti.dev';

  void set(String? v) => state = v;
}

class _CountingEvents implements HandoverEvents {
  bool disposed = false;

  @override
  Stream<HandoverUpdate> get updates => const Stream.empty();

  @override
  Stream<bool> get connected => const Stream.empty();

  @override
  void dispose() => disposed = true;
}
