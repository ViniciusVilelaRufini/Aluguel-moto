import 'dart:math' as math;

import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';

import '../../core/errors.dart';
import '../../l10n/app_localizations.dart';

/// Distancia maxima do celular ate a estacao para oferecer a troca (a API
/// valida o mesmo limite e responde `422 too-far` acima dele).
const kSwapProximityMeters = 50.0;

const _earthRadiusM = 6371008.8;

/// Distancia em metros entre dois pontos (haversine, mesma conta da API).
double haversineMeters(LatLng a, LatLng b) {
  double rad(double d) => d * math.pi / 180;
  final dLat = rad(b.latitude - a.latitude);
  final dLng = rad(b.longitude - a.longitude);
  final h = math.pow(math.sin(dLat / 2), 2) + math.cos(rad(a.latitude)) * math.cos(rad(b.latitude)) * math.pow(math.sin(dLng / 2), 2);
  return 2 * _earthRadiusM * math.asin(math.min(1, math.sqrt(h)));
}

/// Estacao mais perto de [phone] dentro de [maxMeters]; `null` se nenhuma.
SwapStation? nearestStationWithin(LatLng phone, Iterable<SwapStation> stations, {double maxMeters = kSwapProximityMeters}) {
  SwapStation? best;
  var bestD = double.infinity;
  for (final s in stations) {
    final d = haversineMeters(phone, LatLng(s.lat, s.lng));
    if (d <= maxMeters && d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

/// Aluguel em que a troca na estacao vale (`active` ou `paused`, como na API).
bool rentalAllowsSwap(Rental? r) => r != null && (r.status == RentalStatus.active || r.status == RentalStatus.paused);

/// Regra do aviso `Voce esta na <estacao> · Trocar bateria`: so com aluguel em
/// andamento, consentimento de localizacao (LGPD) e posicao conhecida do
/// celular a ate [kSwapProximityMeters] de uma estacao.
SwapStation? swapPromptStation({
  required Rental? rental,
  required bool locationConsent,
  required LatLng? phone,
  required Iterable<SwapStation> stations,
}) {
  if (!rentalAllowsSwap(rental) || !locationConsent || phone == null) return null;
  return nearestStationWithin(phone, stations);
}

/// Taxa por troca so nos planos por minuto e por hora (diario, semanal e mensal: gratis).
bool swapFeeApplies(PlanCode plan) => plan == PlanCode.minute || plan == PlanCode.hour;

/// Conteudo do QR fixo da estacao: `vst1.<stationId>.<assinatura>`. Devolve o
/// id da estacao (para o caminho do POST) ou `null` se o formato nao bate. A
/// assinatura e conferida so pela API.
String? stationIdFromQr(String raw) {
  final m = RegExp(r'^vst1\.([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\.[A-Za-z0-9_-]{8,}$').firstMatch(raw.trim());
  return m?.group(1)?.toLowerCase();
}

const _wireStatus = {
  'opening_slot': StationSwapStatus.openingSlot,
  'awaiting_return': StationSwapStatus.awaitingReturn,
  'returned': StationSwapStatus.returned,
  'releasing': StationSwapStatus.releasing,
  'completed': StationSwapStatus.completed,
  'canceled': StationSwapStatus.canceled,
  'failed': StationSwapStatus.failed,
};

/// Status do evento `station_swap.updated` (nome do fio, ex.: `awaiting_return`).
StationSwapStatus swapStatusFromWire(String s) => _wireStatus[s] ?? StationSwapStatus.unknownDefaultOpenApi;

bool isTerminalSwap(StationSwapStatus s) =>
    s == StationSwapStatus.completed || s == StationSwapStatus.canceled || s == StationSwapStatus.failed;

/// Troca ainda em andamento (a tela de progresso pode ser reaberta).
bool isOpenSwap(StationSwap? s) => s != null && !isTerminalSwap(s.status) && s.status != StationSwapStatus.unknownDefaultOpenApi;

/// Cancelar so antes da devolucao (contrato: depois → `422 swap-not-cancelable`).
bool canCancelSwap(StationSwapStatus s) => s == StationSwapStatus.openingSlot || s == StationSwapStatus.awaitingReturn;

/// Passos da tela de progresso, na ordem.
const swapSteps = [
  StationSwapStatus.openingSlot,
  StationSwapStatus.awaitingReturn,
  StationSwapStatus.returned,
  StationSwapStatus.releasing,
  StationSwapStatus.completed,
];

/// Indice do passo (0..4); finais sem sucesso ficam no ultimo passo alcancado pelo chamador.
int swapStepIndex(StationSwapStatus s) {
  final i = swapSteps.indexOf(s);
  return i < 0 ? 0 : i;
}

/// Aplica um `station_swap.updated` a troca da tela. Evento de outra troca e
/// ignorado; `completed` e final de verdade. `canceled`/`failed` nao travam:
/// uma devolucao atrasada leva a troca de volta a `releasing` (contrato).
/// Fora isso, um evento atrasado de um passo anterior nao faz a tela voltar.
StationSwap applySwapEvent(StationSwap current, {required String swapId, required StationSwapStatus status}) {
  if (swapId != current.id || status == StationSwapStatus.unknownDefaultOpenApi) return current;
  if (current.status == StationSwapStatus.completed) return current;
  final terminalNow = current.status == StationSwapStatus.canceled || current.status == StationSwapStatus.failed;
  if (!terminalNow && !isTerminalSwap(status) && swapStepIndex(status) < swapStepIndex(current.status)) return current;
  return current.rebuild((b) => b
    ..status = status
    ..endReason = isTerminalSwap(status) ? b.endReason : null);
}

/// Prefere a resposta do GET, salvo quando ela e mais antiga que o que a tela
/// ja mostra (evento chegou antes da leitura).
StationSwap mergeSwapFetch(StationSwap current, StationSwap fetched) {
  if (fetched.id != current.id) return current;
  if (current.status == StationSwapStatus.completed) return current;
  final behind = !isTerminalSwap(fetched.status) &&
      !isTerminalSwap(current.status) &&
      swapStepIndex(fetched.status) < swapStepIndex(current.status);
  return behind ? current : fetched;
}

/// Texto do erro ao abrir o compartimento (slugs do contrato). [station]
/// separa "sem bateria" de "fechada" no `422 station-unavailable`.
String swapErrorMessage(AppLocalizations l, Object error, {SwapStation? station}) {
  final f = toFailure(error);
  switch (f.slug) {
    case 'station-not-found':
      return l.swapErrorInvalidQr;
    case 'too-far':
      return l.swapErrorTooFar;
    case 'vehicle-moving':
      return l.swapErrorMoving;
    case 'swap-open':
      return l.swapErrorOpen;
    case 'rental-not-active':
      return l.swapErrorRentalNotActive;
    case 'station-unavailable':
      if (station != null && station.availableBatteries <= 0) return l.swapErrorNoBattery;
      if (station != null && station.open24h != true) return l.swapErrorClosed(station.openingHours);
      return l.swapErrorUnavailable;
  }
  if (f.kind == FailureKind.api && f.status == 404) return l.swapErrorInvalidQr;
  return f.message(l);
}

/// Titulo da troca encerrada sem sucesso.
String swapEndTitle(AppLocalizations l, StationSwap s) =>
    s.status == StationSwapStatus.canceled ? l.swapCanceledTitle : l.swapFailedTitle;

/// Mensagem amigavel do motivo (`endReason`).
String swapEndMessage(AppLocalizations l, StationSwap s) => switch (s.endReason) {
  StationSwapEndReason.canceledByCustomer => l.swapEndCanceledByCustomer,
  StationSwapEndReason.slotClosedWithoutReturn => l.swapEndSlotClosed,
  StationSwapEndReason.stationTimeout => l.swapEndStationTimeout,
  StationSwapEndReason.returnTimeout => l.swapEndReturnTimeout,
  StationSwapEndReason.releaseTimeout => l.swapEndReleaseTimeout,
  StationSwapEndReason.noBatteryAfterReturn => l.swapEndNoBatteryAfterReturn,
  StationSwapEndReason.serialMismatch => l.swapEndSerialMismatch,
  _ => l.swapEndGeneric,
};

/// Casos em que a devolucao atrasada ainda vale (a estacao libera uma carregada).
bool swapLateReturnAccepted(StationSwap s) =>
    s.endReason == StationSwapEndReason.canceledByCustomer ||
    s.endReason == StationSwapEndReason.stationTimeout ||
    s.endReason == StationSwapEndReason.returnTimeout;

/// Casos que pedem o suporte (alerta aberto para a operacao).
bool swapNeedsSupport(StationSwap s) =>
    s.endReason == StationSwapEndReason.releaseTimeout ||
    s.endReason == StationSwapEndReason.noBatteryAfterReturn ||
    s.endReason == StationSwapEndReason.serialMismatch;

/// "2:41" ate [expiresAt]; zero quando o prazo passou.
Duration swapTimeLeft(DateTime expiresAt, DateTime now) {
  final d = expiresAt.toUtc().difference(now.toUtc());
  return d.isNegative ? Duration.zero : d;
}
