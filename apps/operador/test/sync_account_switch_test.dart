import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/data/tasks_provider.dart';
import 'package:volti_operador/features/auth/auth.dart';

import 'helpers.dart';

String _jwt(String sub) {
  String seg(Object o) => base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  return '${seg({'alg': 'none'})}.${seg({'sub': sub})}.sig';
}

/// Aparelho compartilhado: quem esta logado muda de mao.
class _SharedDeviceAuth extends DevAuthRepository {
  _SharedDeviceAuth() : super(baseUrl: 'http://127.0.0.1:1');

  AuthSession? current;

  void loginAs(String sub) => current = AuthSession(
        accessToken: _jwt(sub),
        expiresAt: DateTime.now().add(const Duration(hours: 1)),
        email: '$sub@volti.dev',
      );

  @override
  AuthSession? get session => current;

  @override
  Future<void> signOut() async => current = null;
}

class _TasksRepo extends FakeFieldRepository {
  /// Chamado depois de cada troca de bateria enviada (simula troca de conta no meio do sync).
  void Function()? afterSwap;

  @override
  Future<BatterySwap> submitBatterySwap(String taskId, BatterySwapDraft draft,
      {required DateTime recordedAt, required String idempotencyKey}) async {
    final r = await super.submitBatterySwap(taskId, draft,
        recordedAt: recordedAt, idempotencyKey: idempotencyKey);
    afterSwap?.call();
    return r;
  }

  @override
  Future<List<FieldTask>> listTasks() async {
    if (!online) throw const RepositoryException(FailureKind.network, 'offline');
    return [fakeTask(id: 'task-1')];
  }
}

QueuedJob _legacyJob() {
  final now = DateTime.utc(2026, 10, 21, 12);
  return QueuedJob(
    id: 'legacy',
    kind: JobKind.batterySwap,
    taskId: 't0',
    payload: {
      'swap': const BatterySwapDraft(removedSerial: 'A', installedSerial: 'B').toJson()
    },
    idempotencyKey: 'key-legacy',
    createdAt: now,
    recordedAt: now,
  );
}

void main() {
  late _TasksRepo repo;
  late Harness h;
  late _SharedDeviceAuth auth;
  late ProviderContainer c;

  setUp(() {
    repo = _TasksRepo();
    h = Harness(repo: repo, ownerSub: null);
    auth = _SharedDeviceAuth();
    c = ProviderContainer(
        overrides: [...h.overrides, authRepositoryProvider.overrideWithValue(auth)]);
    addTearDown(c.dispose);
  });

  Future<void> settle() => Future<void>.delayed(const Duration(milliseconds: 50));

  Future<void> swap(String task) => c.read(syncControllerProvider.notifier).submitBatterySwap(
      task, const BatterySwapDraft(removedSerial: 'AAA', installedSerial: 'BBB'));

  Future<void> switchTo(String? sub) async {
    if (sub == null) {
      await c.read(sessionProvider.notifier).signOut();
    } else {
      auth.loginAs(sub);
      c.invalidate(sessionProvider);
      c.read(sessionProvider);
    }
    await settle();
  }

  test('job do operador A offline nao e enviado quando B entra; A volta e envia', () async {
    await switchTo('op-a');
    c.read(syncControllerProvider);
    repo.online = false;
    await swap('task-a');
    expect((await h.queue.all()).single.ownerSub, 'op-a');

    await switchTo(null);
    repo.online = true;
    await switchTo('op-b');
    await c.read(syncControllerProvider.notifier).sync();

    expect(repo.swaps, isEmpty, reason: 'B nao pode enviar o job de A');
    expect(await h.queue.all(), hasLength(1));
    final sb = c.read(syncControllerProvider);
    expect(sb.jobs, isEmpty);
    expect(sb.pending, isEmpty);

    await switchTo(null);
    await switchTo('op-a');
    await c.read(syncControllerProvider.notifier).sync();

    expect(repo.swaps.single.$1, 'task-a');
    expect(await h.queue.all(), isEmpty);
  });

  test('job antigo sem dono nao e enviado; aparece e so pode ser descartado', () async {
    await h.queue.put(_legacyJob());
    await switchTo('op-a');
    final ctrl = c.read(syncControllerProvider.notifier);
    await ctrl.load();
    await ctrl.sync();
    expect(repo.swaps, isEmpty);
    expect(c.read(syncControllerProvider).orphans.single.id, 'legacy');
    expect(c.read(syncControllerProvider).pending, isEmpty);

    await ctrl.retry('legacy');
    expect(repo.swaps, isEmpty);

    await ctrl.discard('legacy');
    expect(await h.queue.all(), isEmpty);
  });

  test('operador nao descarta job de outro operador', () async {
    await switchTo('op-a');
    c.read(syncControllerProvider);
    repo.online = false;
    await swap('task-a');
    await switchTo(null);
    await switchTo('op-b');
    final id = (await h.queue.all()).single.id;
    await c.read(syncControllerProvider.notifier).discard(id);
    expect(await h.queue.all(), hasLength(1));
  });

  test('cache de tarefas e por operador e some no logout', () async {
    await switchTo('op-a');
    await c.read(tasksProvider.future);
    expect(await h.queue.loadTasks('op-a'), hasLength(1));
    expect(await h.queue.loadTasks('op-b'), isEmpty);

    await switchTo(null);
    expect(await h.queue.loadTasks('op-a'), isEmpty);
  });

  test('B offline nao ve o cache de A', () async {
    await switchTo('op-a');
    await c.read(tasksProvider.future);
    await switchTo('op-b');
    repo.online = false;
    c.listen(tasksProvider, (_, _) {});
    await settle();
    expect(c.read(tasksProvider).value?.fromCache, isNot(true),
        reason: 'B nao pode ler o cache de A');
  });

  test('403 e 409 de negocio sao terminais (job falha, nao fica em retry)', () async {
    for (final status in [403, 409]) {
      repo.online = true;
      repo.rejectWith = mapDioError(DioException(
        requestOptions: RequestOptions(),
        response: Response(requestOptions: RequestOptions(), statusCode: status),
      ));
      await switchTo('op-a');
      c.read(syncControllerProvider);
      await swap('task-$status');
      final s = c.read(syncControllerProvider);
      expect(s.failed.where((j) => j.taskId == 'task-$status'), hasLength(1));
      expect(s.failed.last.error, 'Pedido recusado ($status).');
    }
  });

  test('troca de conta no meio do sync: para antes do proximo job do dono anterior', () async {
    await switchTo('op-a');
    c.read(syncControllerProvider);
    repo.online = false;
    await swap('task-a1');
    await swap('task-a2');
    expect(await h.queue.all(), hasLength(2));

    repo.online = true;
    repo.afterSwap = () {
      repo.afterSwap = null;
      // B entra no aparelho enquanto o primeiro job de A esta em voo.
      auth.loginAs('op-b');
      c.invalidate(sessionProvider);
      c.read(sessionProvider);
    };
    await c.read(syncControllerProvider.notifier).sync();

    expect(repo.swaps.map((s) => s.$1), ['task-a1'],
        reason: 'depois da troca de conta o job de A nao pode sair com o token de B');
    final left = await h.queue.all();
    expect(left.single.taskId, 'task-a2');
    expect(left.single.ownerSub, 'op-a');
  });
}
