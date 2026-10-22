import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';

import '../../core/backend.dart';
import '../../core/services.dart';
import '../../core/session.dart';

/// Centro de Sao Paulo quando a localizacao nao esta disponivel.
const fallbackCenter = LatLng(-23.5614, -46.6559);

/// Posicao do cliente. So consulta depois do aceite do consentimento de localizacao e nunca
/// abre o dialogo do sistema sozinha (o pedido vem da tela, depois da explicacao).
final userLocationProvider = FutureProvider<LatLng?>((ref) async {
  final consent = ref.watch(sessionProvider.select((s) => s.value?.locationConsent ?? false));
  if (!consent) return null;
  return ref.watch(locationServiceProvider).currentPosition();
});

/// Preco por minuto do plano avulso (`PricingPlan` `minute`), em centavos. `null` se o
/// plano nao estiver ativo ou a consulta falhar (a tela so esconde o preco).
final minutePriceProvider = FutureProvider.autoDispose<int?>((ref) async {
  try {
    final plans = await ref.watch(backendProvider).plans();
    for (final p in plans) {
      if (p.code == PlanCode.minute && p.active) return p.unitPriceCents;
    }
  } catch (_) {}
  return null;
});

/// Taxa de desbloqueio do plano avulso (`PricingPlan` `minute`), em centavos, para
/// os detalhes da moto. `null` se indisponivel.
final minuteUnlockFeeProvider = FutureProvider.autoDispose<int?>((ref) async {
  try {
    final plans = await ref.watch(backendProvider).plans();
    for (final p in plans) {
      if (p.code == PlanCode.minute && p.active) return p.unlockFeeCents;
    }
  } catch (_) {}
  return null;
});

/// Ha mensagem do suporte nao lida (bolinha do sino). Falha = sem bolinha.
final supportUnreadProvider = FutureProvider.autoDispose<bool>((ref) async {
  try {
    final list = await ref.watch(backendProvider).conversations();
    return list.any((c) => (c.unreadCount ?? 0) > 0);
  } catch (_) {
    return false;
  }
});

final zonesProvider = FutureProvider.autoDispose<List<GeoZone>>((ref) => ref.watch(backendProvider).zones());

final currentReservationProvider = FutureProvider.autoDispose<Reservation?>((ref) => ref.watch(backendProvider).currentReservation());

/// `GET /rentals/current` (aluguel + troca na estacao em andamento). Para
/// recarregar, invalide este (o [currentRentalProvider] deriva dele).
final currentRentalStateProvider = FutureProvider.autoDispose<CurrentRentalState>((ref) => ref.watch(backendProvider).currentRentalState());

final currentRentalProvider = FutureProvider.autoDispose<Rental?>((ref) async => (await ref.watch(currentRentalStateProvider.future)).rental);

/// Cupom digitado no cartao da moto ("Cupom promocional"); o plano ja comeca
/// com ele aplicado na cotacao. Vazio = sem cupom.
final pendingCouponProvider = NotifierProvider<PendingCouponNotifier, String>(PendingCouponNotifier.new);

class PendingCouponNotifier extends Notifier<String> {
  /// Some ao sair da conta (ou trocar de conta): o cupom e de quem digitou.
  @override
  String build() {
    ref.watch(sessionProvider.select((s) => s.value?.signedIn == true ? s.value?.customer?.id ?? '' : null));
    return '';
  }

  void clear() => state = '';
  void set(String code) => state = code.trim().toUpperCase();
}

/// Reserva que o app acabou de criar (`POST /reservations`): a resposta traz o
/// `pickupCode` do QR. A tela da reserva usa enquanto o GET carrega ou quando
/// ele vier sem o codigo.
final createdReservationProvider = NotifierProvider<CreatedReservationNotifier, Reservation?>(CreatedReservationNotifier.new);

class CreatedReservationNotifier extends Notifier<Reservation?> {
  @override
  Reservation? build() {
    // Some ao trocar de conta.
    ref.watch(sessionProvider.select((s) => s.value?.customer?.id));
    return null;
  }

  void set(Reservation? r) => state = r;
}
