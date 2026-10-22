import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';

import '../../core/backend.dart';
import '../../core/services.dart';
import '../../core/session.dart';
import '../home/providers.dart';

/// Entregas que o app ja abriu sozinho nesta sessao: voltar de "Confira sua
/// moto" para o inicio nao empurra o cliente de novo para a mesma entrega.
final autoOpenedHandoversProvider = NotifierProvider<AutoOpenedHandovers, Set<String>>(AutoOpenedHandovers.new);

class AutoOpenedHandovers extends Notifier<Set<String>> {
  @override
  Set<String> build() {
    // Some ao trocar de conta.
    ref.watch(sessionProvider.select((s) => s.value?.customer?.id));
    return <String>{};
  }

  /// `false` se ja tinha aberto (quem chamou nao navega).
  bool claim(String id) {
    if (state.contains(id)) return false;
    state = {...state, id};
    return true;
  }
}

/// Intervalo da consulta da reserva ativa (sobrescrito nos testes).
final reservationPollIntervalProvider = Provider<Duration>((ref) => const Duration(seconds: 15));

/// Consulta unica da reserva atual (`GET /reservations/current`), compartilhada
/// por todos os [HandoverWatcher] montados (inicio e reserva): um timer so.
/// Roda apenas com a reserva `active` e o app em primeiro plano; para em
/// `handover` (a tela da entrega segue pelos eventos) ou sem reserva, e volta
/// quando a reserva fica ativa de novo. Ao voltar do segundo plano consulta na
/// hora e retoma. Tela coberta por outra (ex.: inicio sob a entrega): o
/// Riverpod pausa os ouvintes dela e a reserva so recarrega ao voltar.
final reservationPollerProvider = Provider.autoDispose<void>((ref) {
  final every = ref.watch(reservationPollIntervalProvider);
  Timer? timer;
  var active = false;
  var foreground = (WidgetsBinding.instance.lifecycleState ?? AppLifecycleState.resumed) == AppLifecycleState.resumed;

  void sync() {
    final run = active && foreground;
    if (run && timer == null) {
      timer = Timer.periodic(every, (_) => ref.invalidate(currentReservationProvider));
    } else if (!run) {
      timer?.cancel();
      timer = null;
    }
  }

  ref.listen<AsyncValue<Reservation?>>(currentReservationProvider, (_, next) {
    // Recarregando: mantem o estado anterior ate a resposta chegar.
    if (next.isLoading && !next.hasValue) return;
    active = next.value?.status == ReservationStatus.active;
    sync();
  }, fireImmediately: true);

  final lifecycle = AppLifecycleListener(onStateChange: (state) {
    final wasForeground = foreground;
    foreground = state == AppLifecycleState.resumed;
    if (foreground && !wasForeground && active) ref.invalidate(currentReservationProvider);
    sync();
  });

  ref.onDispose(() {
    timer?.cancel();
    lifecycle.dispose();
  });
});

/// Fica atras da tela enquanto ha reserva de galpao aberta (inicio e reserva):
/// - `handover.pending` da reserva atual abre `/handover/:id`;
/// - reserva ja em `handover` (app aberto depois do evento) tambem abre;
/// - `handover.updated` e a consulta compartilhada ([reservationPollerProvider])
///   atualizam a reserva, para o app seguir mesmo sem tempo real.
class HandoverWatcher extends ConsumerStatefulWidget {
  const HandoverWatcher({super.key, required this.reservation});
  final Reservation reservation;

  @override
  ConsumerState<HandoverWatcher> createState() => _HandoverWatcherState();
}

class _HandoverWatcherState extends ConsumerState<HandoverWatcher> {
  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  @override
  void didUpdateWidget(HandoverWatcher old) {
    super.didUpdateWidget(old);
    if (old.reservation != widget.reservation) _checkStatus();
  }

  void _checkStatus() {
    final r = widget.reservation;
    final id = r.handoverId;
    if (r.status != ReservationStatus.handover || id == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) => _open(id));
  }

  void _open(String handoverId) {
    if (!mounted || !ref.read(autoOpenedHandoversProvider.notifier).claim(handoverId)) return;
    context.push('/handover/$handoverId');
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(reservationPollerProvider);
    ref.listen(customerEventsProvider, (_, next) {
      final e = next.value;
      if (e is HandoverPending && e.reservationId == widget.reservation.id) {
        ref.invalidate(currentReservationProvider);
        _open(e.handoverId);
      } else if (e is HandoverUpdated) {
        ref.invalidate(currentReservationProvider);
      }
    });
    return const SizedBox.shrink();
  }
}

/// A entrega [handoverId] e a chegada no galpao (`return_depot`) do aluguel
/// [rentalId]? Usada pela corrida e pela devolucao para abrir o recibo.
Future<bool> isDepotReturnOf(Backend backend, String handoverId, String rentalId) async {
  try {
    final h = await backend.handover(handoverId);
    return h.type == HandoverType.returnDepot && h.rentalId == rentalId;
  } catch (_) {
    return false;
  }
}
