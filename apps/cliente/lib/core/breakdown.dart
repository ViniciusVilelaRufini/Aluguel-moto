import 'package:volti_api/volti_api.dart';

/// Uma linha do resumo de preco ja pronta para a tela.
typedef BreakdownRow = ({String label, int cents});

const _knownCodes = {'unlock', 'time', 'pause', 'coupon', 'wallet', 'subscription_covered'};

/// Linhas do resumo (cotacao e recibo) sem repetir valores.
///
/// A API ja manda o seguro (`insurance_basic`/`insurance_full`), o cupom
/// (`coupon`) e as taxas como linhas, e tambem os totais `insuranceCents`,
/// `discountCents` e `feesCents`. Os totais so viram linha quando nenhuma
/// linha da categoria veio (respostas antigas ou parciais).
List<BreakdownRow> breakdownRows(
  PriceBreakdown bd, {
  required String insuranceLabel,
  required String feesLabel,
  required String discountLabel,
}) {
  final codes = bd.lines.map((l) => l.code).toList();
  final hasInsurance = codes.any((c) => c.startsWith('insurance'));
  final hasDiscount = codes.contains('coupon');
  final hasFees = codes.any((c) => !c.startsWith('insurance') && !_knownCodes.contains(c));
  return [
    for (final l in bd.lines) (label: l.description, cents: l.amountCents),
    if (!hasInsurance && bd.insuranceCents > 0) (label: insuranceLabel, cents: bd.insuranceCents),
    if (!hasFees && bd.feesCents > 0) (label: feesLabel, cents: bd.feesCents),
    if (!hasDiscount && bd.discountCents > 0) (label: discountLabel, cents: -bd.discountCents),
  ];
}
