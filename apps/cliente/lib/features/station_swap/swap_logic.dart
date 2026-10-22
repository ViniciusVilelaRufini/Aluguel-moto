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
///
/// Ordem: `updatedAt` da API quando os dois tem (resposta mais antiga que a
/// troca mostrada, ex.: GET que chegou depois do cancelamento, e descartada);
/// empate ou sem `updatedAt`, a ordem dos passos.
StationSwap mergeSwapFetch(StationSwap current, StationSwap fetched) {
  if (fetched.id != current.id) return current;
  if (current.status == StationSwapStatus.completed) return current;
  final fu = fetched.updatedAt, cu = current.updatedAt;
  if (fu != null && cu != null) {
    if (fu.isBefore(cu)) return current;
    if (fu.isAfter(cu)) return fetched;
  }
  final behind = !isTerminalSwap(fetched.status) &&
      !isTerminalSwap(current.status) &&
      swapStepIndex(fetched.status) < swapStepIndex(current.status);
  return behind ? current : fetched;
}

/// Texto do erro ao abrir o compartimento (slugs do contrato). [station]
/// separa "sem bateria" de "fechada" no `422 station-unavailable`; "fechada"
/// so quando o horario e legivel e [now] cai fora dele ([stationClosedAt]).
String swapErrorMessage(AppLocalizations l, Object error, {SwapStation? station, DateTime? now}) {
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
      if (station != null && now != null && stationClosedAt(station, now)) return l.swapErrorClosed(station.openingHours);
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
  StationSwapEndReason.returnAfterClose => l.swapEndReturnAfterClose,
  StationSwapEndReason.rentalForceEnded => l.swapEndRentalForceEnded,
  // Motivo novo que esta versao do app nao conhece (fallback do cliente gerado) ou ausente.
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
    s.endReason == StationSwapEndReason.serialMismatch ||
    s.endReason == StationSwapEndReason.returnAfterClose;

/// "2:41" ate [expiresAt]; zero quando o prazo passou.
Duration swapTimeLeft(DateTime expiresAt, DateTime now) {
  final d = expiresAt.toUtc().difference(now.toUtc());
  return d.isNegative ? Duration.zero : d;
}

// ───────────── horario da estacao (mesma leitura da API, `isStationOpen`) ─────────────

const _dayIndex = {'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6};

String _fold(String s) {
  const from = 'áàâãäéèêëíìîïóòôõöúùûüç';
  const to = 'aaaaaeeeeiiiiooooouuuuc';
  final b = StringBuffer();
  for (final ch in s.toLowerCase().split('')) {
    final i = from.indexOf(ch);
    b.write(i < 0 ? ch : to[i]);
  }
  return b.toString();
}

Set<int>? _parseDays(String text) {
  if (RegExp(r'todos os dias|diariamente').hasMatch(text)) return {0, 1, 2, 3, 4, 5, 6};
  final m = RegExp(r'\b(dom|seg|ter|qua|qui|sex|sab)\w*\s*(?:a|-|–|ate)\s*(dom|seg|ter|qua|qui|sex|sab)').firstMatch(text);
  if (m == null) return null;
  final days = <int>{};
  var d = _dayIndex[m.group(1)]!;
  final end = _dayIndex[m.group(2)]!;
  for (var i = 0; i < 7; i++) {
    days.add(d);
    if (d == end) break;
    d = (d + 1) % 7;
  }
  return days;
}

/// `null` = horario ilegivel; `(-1, -1)` = 24 h.
(int, int)? _parseHours(String text) {
  if (RegExp(r'\b24\s*h\b').hasMatch(text)) return (-1, -1);
  final m = RegExp(r'(\d{1,2})\s*h\s*(\d{2})?\s*(?:as|a|-|–|ate)\s*(\d{1,2})\s*h\s*(\d{2})?').firstMatch(text);
  if (m == null) return null;
  final from = int.parse(m.group(1)!) * 60 + int.parse(m.group(2) ?? '0');
  final to = int.parse(m.group(3)!) * 60 + int.parse(m.group(4) ?? '0');
  if (from > 24 * 60 || to > 24 * 60) return null;
  return (from, to);
}

/// A estacao esta fechada em [now] (horario de Sao Paulo, UTC-3 fixo)? So
/// `true` quando `openingHours` e legivel e [now] cai fora; `open24h` ou texto
/// ilegivel → `false` (como a API, que so recusa quando o horario e legivel).
bool stationClosedAt(SwapStation s, DateTime now) {
  if (s.open24h == true) return false;
  final text = _fold(s.openingHours);
  final hours = _parseHours(text);
  if (hours == null) return false;
  final days = _parseDays(text) ?? {0, 1, 2, 3, 4, 5, 6};
  final local = now.toUtc().subtract(const Duration(hours: 3));
  final weekday = local.weekday % 7; // DateTime: seg=1..dom=7 → dom=0
  final minutes = local.hour * 60 + local.minute;
  final bool open;
  if (hours.$1 < 0) {
    open = days.contains(weekday);
  } else if (hours.$1 < hours.$2) {
    open = days.contains(weekday) && minutes >= hours.$1 && minutes < hours.$2;
  } else {
    open = (days.contains(weekday) && minutes >= hours.$1) || (days.contains((weekday + 6) % 7) && minutes < hours.$2);
  }
  return !open;
}
