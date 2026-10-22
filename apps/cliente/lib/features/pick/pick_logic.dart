import 'dart:math' as math;

import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';

import '../../core/geo.dart';
import '../../core/session.dart';

/// Duracao da reserva definida no contrato (`POST /reservations`: "Dura 15 minutos", decisao #9).
/// O contrato nao expoe o valor antes de reservar; ver a proposta em docs/decisoes.md.
const kReservationMinutes = 15;

/// Promocao "1a corrida gratis". O contrato nao tem como o cliente saber se ela existe
/// (cupons so para staff, nenhuma promocao de primeira corrida na API), entao fica desligada
/// ate a proposta de contrato (`Me.promotions`, docs/decisoes.md) sair.
///
/// E um define de compilacao, e nao configuracao remota, de proposito: mostrar uma promocao
/// que o backend nao aplica seria propaganda enganosa (CDC), entao ligar exige um build
/// deliberado (demonstracao/homologacao com o cupom criado a mao), nunca uma troca silenciosa
/// em producao. Quando a API expuser a elegibilidade, este define sai e o app passa a usar o
/// campo do contrato. Liga com `--dart-define=FIRST_RIDE_PROMO=true`.
const kFirstRidePromo = bool.fromEnvironment('FIRST_RIDE_PROMO');

/// Distancia em linha reta (haversine), em metros inteiros.
int haversineMeters(LatLng a, LatLng b) {
  const r = 6371000.0;
  double rad(double d) => d * math.pi / 180;
  final dLat = rad(b.latitude - a.latitude);
  final dLng = rad(b.longitude - a.longitude);
  final h = math.pow(math.sin(dLat / 2), 2) +
      math.cos(rad(a.latitude)) * math.cos(rad(b.latitude)) * math.pow(math.sin(dLng / 2), 2);
  return (2 * r * math.asin(math.min(1, math.sqrt(h)))).round();
}

/// Metros a pe ate a moto. Sem a localizacao do cliente nao ha distancia (o `distanceM`
/// da API e relativo ao ponto da busca, que pode ser o centro padrao).
int? walkMetersTo(VehicleSummary v, LatLng? user) => user == null ? null : haversineMeters(user, LatLng(v.lat, v.lng));

/// "120 m · 2 min" (~80 m/min).
String walkLabel(int meters) => '${walkingDistanceLabel(meters)} · ${walkingMinutes(meters)} min';

/// "R$ 0,79/min".
String perMinuteLabel(int cents) => '${money(cents)}/min';

enum ModelCategory { urban, doubleSeat, cargo }

/// Categoria pelo nome do modelo (o contrato nao tem esse campo; mapa local).
ModelCategory? categoryFor(String model) {
  final m = model.toLowerCase();
  if (m.contains('flash')) return ModelCategory.urban;
  if (m.contains('urban')) return ModelCategory.doubleSeat;
  if (m.contains('cargo')) return ModelCategory.cargo;
  return null;
}

/// "Volti Flash" -> "Flash" (rotulo do bloco de foto).
String shortModel(String model) {
  final parts = model.trim().split(RegExp(r'\s+'));
  return parts.length > 1 ? parts.sublist(1).join(' ') : parts.first;
}

const _designOrder = ['volti flash', 'volti urban', 'volti cargo'];

/// Modelos presentes nos dados: os do design primeiro, na ordem dele, e os demais em ordem alfabetica.
List<String> modelsIn(Iterable<VehicleSummary> list) {
  final models = {for (final v in list) v.model}.toList();
  int rank(String m) {
    final i = _designOrder.indexOf(m.toLowerCase());
    return i < 0 ? _designOrder.length : i;
  }

  models.sort((a, b) {
    final r = rank(a).compareTo(rank(b));
    return r != 0 ? r : a.toLowerCase().compareTo(b.toLowerCase());
  });
  return models;
}

/// [model] `null` = todas.
List<VehicleSummary> filterByModel(List<VehicleSummary> list, String? model) =>
    model == null ? list : [for (final v in list) if (v.model == model) v];

/// Mais perto primeiro; sem localizacao mantem a ordem da API.
List<VehicleSummary> sortByWalk(List<VehicleSummary> list, LatLng? user) {
  if (user == null) return list;
  final d = {for (final v in list) v.id: haversineMeters(user, LatLng(v.lat, v.lng))};
  return [...list]..sort((a, b) => d[a.id]!.compareTo(d[b.id]!));
}

/// Filtros do mapa (chips "Todas", "Autonomia 10+ km", "Pontos de retirada").
enum HomeFilter { all, range10, pickupPoints }

/// Pontos de retirada = zonas de devolucao ativas (onde a frota fica estacionada).
Iterable<GeoZone> pickupZones(List<GeoZone> zones) => zones.where((z) => z.active && z.type == ZoneType.return_);

List<VehicleSummary> applyHomeFilter(List<VehicleSummary> list, HomeFilter f, List<GeoZone> zones) {
  switch (f) {
    case HomeFilter.all:
      return list;
    case HomeFilter.range10:
      return [for (final v in list) if (v.estimatedRangeKm >= 10) v];
    case HomeFilter.pickupPoints:
      final pz = pickupZones(zones).toList();
      return [for (final v in list) if (pz.any((z) => pointInZone(v.lat, v.lng, z))) v];
  }
}

/// Nome de lugar conhecido para "Sua localizacao · ...": o ponto de retirada em que o
/// cliente esta. Sem geocodificacao reversa no contrato (proposta em docs/decisoes.md).
String? nearestPlaceName(LatLng? user, List<GeoZone> zones) {
  if (user == null) return null;
  for (final z in pickupZones(zones)) {
    if (pointInZone(user.latitude, user.longitude, z)) return z.name;
  }
  return null;
}

/// Motivo de o botao "Reservar" estar desligado.
enum ReserveBlock { none, noSelection, sessionLoading, kycPending, kycRejected, delinquent, activeReservation, activeRental }

ReserveBlock reserveBlock({
  required SessionState? session,
  required bool selected,
  bool hasReservation = false,
  bool hasRental = false,
}) {
  // Sessao ainda carregando: nao sabemos o KYC, entao desliga sem mostrar motivo.
  if (session == null) return ReserveBlock.sessionLoading;
  if (hasRental) return ReserveBlock.activeRental;
  if (hasReservation) return ReserveBlock.activeReservation;
  final kyc = session.kyc;
  if (kyc == KycStatus.rejected) return ReserveBlock.kycRejected;
  if (kyc != KycStatus.approved) return ReserveBlock.kycPending;
  if (session.customer?.delinquent ?? false) return ReserveBlock.delinquent;
  if (!selected) return ReserveBlock.noSelection;
  return ReserveBlock.none;
}

/// "1a gratis": promocao ativa e nenhum aluguel anterior (sem estatisticas, esconde).
bool firstRideFree(Customer? c, {required bool promoActive}) =>
    promoActive && c?.stats != null && c!.stats!.rentalsCount == 0;

/// "Ana Lima" -> "AL"; "Ana Maria de Souza" -> "AS".
String? initialsOf(String? name) {
  final parts = (name ?? '').trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return null;
  final first = parts.first[0];
  final last = parts.length > 1 ? parts.last[0] : '';
  return (first + last).toUpperCase();
}

/// Desenho da rota a pe ate a moto sem servico de rotas (proposta R2 em
/// docs/decisoes.md): um "L" (quarteirao) pelo canto que comeca pela perna
/// mais longa, mais parecido com andar pelas ruas do que a reta. Perto da
/// moto (< 25 m) ou alinhado num eixo, fica a reta.
List<LatLng> walkingPath(LatLng from, LatLng to) {
  if (haversineMeters(from, to) < 25) return [from, to];
  final dLat = haversineMeters(from, LatLng(to.latitude, from.longitude));
  final dLng = haversineMeters(from, LatLng(from.latitude, to.longitude));
  if (dLat < 10 || dLng < 10) return [from, to];
  final corner = dLat >= dLng ? LatLng(to.latitude, from.longitude) : LatLng(from.latitude, to.longitude);
  return [from, corner, to];
}
