import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';

import '../../core/geo.dart';
import '../../core/session.dart';

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
List<String> modelsIn(Iterable<Vehicle> list) {
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
List<Vehicle> filterByModel(List<Vehicle> list, String? model) =>
    model == null ? list : [for (final v in list) if (v.model == model) v];

/// Pontos verdes = zonas de devolucao ativas.
Iterable<GeoZone> pickupZones(List<GeoZone> zones) => zones.where((z) => z.active && z.type == ZoneType.return_);

/// Nome de lugar conhecido para "Sua localizacao · ...": o ponto de retirada em que o
/// cliente esta. Sem geocodificacao reversa no contrato (proposta em docs/decisoes.md).
String? nearestPlaceName(LatLng? user, List<GeoZone> zones) {
  if (user == null) return null;
  for (final z in pickupZones(zones)) {
    if (pointInZone(user.latitude, user.longitude, z)) return z.name;
  }
  return null;
}

/// Motivo de o botao "Continuar" da lista do galpao estar desligado.
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
