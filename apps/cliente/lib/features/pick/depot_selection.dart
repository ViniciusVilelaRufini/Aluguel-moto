import 'package:volti_api/volti_api.dart';

/// O que o cliente ja escolheu no fluxo do galpao: o galpao e a moto. Vai como
/// `extra` da rota `/pickup` (pre-reserva). Plano, seguro e pagamento sao
/// escolhidos no balcao. Sem `extra` (link antigo, app restaurado) a rota volta a home.
class DepotSelection {
  const DepotSelection({required this.depot, required this.vehicle});

  final Depot depot;
  final Vehicle vehicle;
}
