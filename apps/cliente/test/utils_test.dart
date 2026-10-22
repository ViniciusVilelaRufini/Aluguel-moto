import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/core/geo.dart';

void main() {
  test('money formata centavos em reais', () {
    expect(money(79), 'R\$ 0,79');
    expect(money(123456), 'R\$ 1.234,56');
    expect(money(-300), '-R\$ 3,00');
  });
  test('clock formata cronometro', () {
    expect(clock(734), '12:14');
    expect(clock(3725), '1:02:05');
  });
  test('walking minutes nunca mostra km rodados e minimo 1', () {
    expect(walkingMinutes(10), 1);
    expect(walkingMinutes(400), 5);
    expect(walkingDistanceLabel(310), '310 m');
  });
}
