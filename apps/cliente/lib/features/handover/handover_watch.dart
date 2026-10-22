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

/// Fica atras da tela enquanto ha reserva de galpao aberta (inicio e reserva):
/// - `handover.pending` da reserva atual abre `/handover/:id`;
/// - reserva ja em `handover` (app aberto depois do evento) tambem abre;
/// - `handover.updated` e a consulta periodica ([poll]) atualizam a reserva,
///   para o app seguir mesmo sem tempo real.
class HandoverWatcher extends ConsumerStatefulWidget {
  const HandoverWatcher({super.key, required this.reservation, this.poll = const Duration(seconds: 15)});
  final Reservation reservation;
  final Duration poll;

  @override
  ConsumerState<HandoverWatcher> createState() => _HandoverWatcherState();
}

class _HandoverWatcherState extends ConsumerState<HandoverWatcher> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(widget.poll, (_) {
      if (mounted) ref.invalidate(currentReservationProvider);
    });
    _checkStatus();
  }

  @override
  void didUpdateWidget(HandoverWatcher old) {
    super.didUpdateWidget(old);
    if (old.reservation != widget.reservation) _checkStatus();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
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
