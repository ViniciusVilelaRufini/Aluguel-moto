import 'package:volti_api/volti_api.dart';

/// O que o cliente ja escolheu no fluxo do galpao. Vai de tela em tela como
/// `extra` da rota: `/plan` (galpao + moto), `/insurance` (+ plano) e
/// `/pickup` (+ seguro). Sem `extra` (link antigo, app restaurado) a rota volta a home.
class DepotSelection {
  const DepotSelection({
    required this.depot,
    required this.vehicle,
    this.plan,
    this.coverage = InsuranceCoverage.basic,
    this.coverageName,
  });

  final Depot depot;
  final Vehicle vehicle;
  final PricingPlan? plan;

  /// O basico e obrigatorio; o completo e opcional.
  final InsuranceCoverage coverage;

  /// Nome da cobertura para o resumo da retirada.
  final String? coverageName;

  DepotSelection withPlan(PricingPlan p) =>
      DepotSelection(depot: depot, vehicle: vehicle, plan: p, coverage: coverage, coverageName: coverageName);

  DepotSelection withCoverage(InsuranceCoverage c, String? name) =>
      DepotSelection(depot: depot, vehicle: vehicle, plan: plan, coverage: c, coverageName: name);
}
