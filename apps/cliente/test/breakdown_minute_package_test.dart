import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/breakdown.dart';

void main() {
  test('linha minute_package (pacote de minutos) não é tratada como taxa', () {
    final bd = PriceBreakdown((p) => p
      ..lines.add(PriceLine((l) => l
        ..code = 'time'
        ..description = 'Tempo de uso (por minuto)'
        ..amountCents = 790))
      ..lines.add(PriceLine((l) => l
        ..code = 'minute_package'
        ..description = 'Minutos do pacote'
        ..amountCents = -790))
      ..subtotalCents = 0
      ..discountCents = 0
      ..insuranceCents = 0
      ..feesCents = 500
      ..totalCents = 500);
    final rows = breakdownRows(bd, insuranceLabel: 'Seguro', feesLabel: 'Taxas', discountLabel: 'Desconto');
    expect(rows.map((r) => r.label), contains('Minutos do pacote'));
    expect(rows.where((r) => r.label == 'Taxas').map((r) => r.cents), [500]);
  });
}
