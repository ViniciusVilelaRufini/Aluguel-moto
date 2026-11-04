import 'package:volti_api/volti_api.dart';

/// Uma linha do resumo de preco ja pronta para a tela.
typedef BreakdownRow = ({String label, int cents});

const _knownCodes = {
  'unlock', 'time', 'pause', 'coupon', 'wallet', 'subscription', 'subscription_covered', 'minute_package',
  // Aluguel do balcao: plano pre-pago, excedente por dia iniciado e o que ja foi pago no balcao.
  'counter_plan', 'excess_day', 'counter_prepaid',
};

/// Linhas do resumo (cotacao e recibo) sem repetir valores.
///
/// A API ja manda o seguro (`insurance_basic`/`insurance_full`), o cupom
/// (`coupon`) e as taxas como linhas, e tambem os totais `insuranceCents`,
/// `discountCents` e `feesCents`. Os totais so viram linha quando nenhuma
/// linha da categoria veio (respostas antigas ou parciais).
///
/// [counterPrepaidLabel]: rotulo da linha `counter_prepaid` ("Pago no balcao") no idioma do app.
List<BreakdownRow> breakdownRows(
  PriceBreakdown bd, {
  required String insuranceLabel,
  required String feesLabel,
  required String discountLabel,
  String? counterPrepaidLabel,
}) {
  final codes = bd.lines.map((l) => l.code).toList();
  final hasInsurance = codes.any((c) => c.startsWith('insurance'));
  final hasDiscount = codes.contains('coupon');
  final hasFees = codes.any((c) => !c.startsWith('insurance') && !_knownCodes.contains(c));
  return [
    for (final l in bd.lines) (label: l.code == 'counter_prepaid' ? (counterPrepaidLabel ?? l.description) : l.description, cents: l.amountCents),
    if (!hasInsurance && bd.insuranceCents > 0) (label: insuranceLabel, cents: bd.insuranceCents),
    if (!hasFees && bd.feesCents > 0) (label: feesLabel, cents: bd.feesCents),
    if (!hasDiscount && bd.discountCents > 0) (label: discountLabel, cents: -bd.discountCents),
  ];
}
