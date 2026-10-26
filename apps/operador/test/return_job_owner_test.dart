import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/handover_models.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/sync.dart';

import 'helpers.dart';

/// Rede cai no envio da foto, depois de o job ja ter sido regravado com o aluguel descoberto.
class _PhotoFailsRepo extends FakeFieldRepository {
  @override
  Future<String> uploadHandoverPhoto(String path) async =>
      throw const RepositoryException(FailureKind.network, 'offline');
}

void main() {
  // Auditoria (fila por operador) no fluxo do galpao: a chegada guardada sem rede e regravada no sync
  // (aluguel descoberto) continua sendo do operador que a registrou, nunca vira job sem dono.
  test('chegada regravada com o aluguel descoberto mantem o dono do job', () async {
    final repo = _PhotoFailsRepo();
    final h = Harness(repo: repo);
    final c = ProviderContainer(overrides: h.overrides);
    addTearDown(c.dispose);
    repo.vehiclesByCode['VLT-0009'] = rentedVehicle();
    repo.online = false;
    const draft = ArrivalDraft(
        items: {'freios': true, 'pneus': true, 'luzes': true, 'carenagem': true},
        batteryPct: 40,
        photoPaths: ['/tmp/a.jpg'],
        depotId: 'depot-1');
    await c.read(syncControllerProvider.notifier).submitReturnHandover(
        const ReturnArrival(vehicleCode: 'VLT-0009', depotId: 'depot-1', draft: draft));
    expect((await h.queue.all()).single.ownerSub, testOwnerSub);

    repo.online = true;
    await c.read(syncControllerProvider.notifier).sync();

    final job = (await h.queue.all()).single;
    expect(job.kind, JobKind.returnHandover);
    expect(job.payload['arrival']['rentalId'], 'rental-1');
    expect(job.ownerSub, testOwnerSub);
    expect(c.read(syncControllerProvider).orphans, isEmpty);
  });
}
