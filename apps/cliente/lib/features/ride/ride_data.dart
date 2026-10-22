import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';

/// Trajeto ja gravado do aluguel (`GET /rentals/{id}/track`), para a rota da
/// corrida continuar desenhada depois de reabrir o app. Os pontos novos vem
/// dos eventos `vehicle.position`. Fora da API real (fakes de teste) fica vazio.
final rentalTrackProvider = FutureProvider.autoDispose.family<List<LatLng>, String>((ref, rentalId) async {
  if (ref.watch(backendProvider) is! ApiBackend) return const [];
  final api = ref.watch(apiClientProvider);
  final track = (await api.getRentalsApi().getRentalTrack(id: rentalId)).data;
  return [for (final p in track?.points ?? const <TrackPoint>[]) LatLng(p.lat, p.lng)];
});

/// Contato de emergencia salvo na Conta (`Customer.emergencyContactName/Phone`).
class EmergencyContact {
  const EmergencyContact(this.name, this.phone);
  final String name;
  final String phone;
}

/// null = nenhum contato salvo. O formulario fica na Conta.
final emergencyContactProvider = FutureProvider.autoDispose<EmergencyContact?>((ref) async {
  final c = (await ref.watch(backendProvider).me()).customer;
  final name = c?.emergencyContactName?.trim() ?? '';
  final phone = c?.emergencyContactPhone?.trim() ?? '';
  if (phone.isEmpty) return null;
  return EmergencyContact(name.isEmpty ? phone : name, phone);
});

/// Plano do aluguel (tarifa por unidade e da pausa).
final rentalPlanProvider = FutureProvider.autoDispose.family<PricingPlan?, PlanCode>((ref, code) async {
  final plans = await ref.watch(backendProvider).plans();
  for (final p in plans) {
    if (p.code == code) return p;
  }
  return null;
});
