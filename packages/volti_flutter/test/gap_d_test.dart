import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

Widget _wrap(Widget child) => MaterialApp(
      theme: VoltiTheme.light(),
      home: Scaffold(body: Center(child: child)),
    );

Color _buttonBg(WidgetTester t) {
  final box = t.widgetList<Container>(find.descendant(of: find.byType(VoltiButton), matching: find.byType(Container))).firstWhere(
        (c) => c.decoration is BoxDecoration && (c.decoration! as BoxDecoration).borderRadius == VoltiRadii.rPill,
      );
  return (box.decoration! as BoxDecoration).color!;
}

void main() {
  group('Contraste do CTA (decisao E-12)', () {
    test('contraste segue a formula WCAG (branco x preto = 21:1)', () {
      expect(VoltiColors.contrast(const Color(0xFFFFFFFF), const Color(0xFF000000)), closeTo(21, .01));
      expect(VoltiColors.contrast(VoltiColors.brand, VoltiColors.brand), closeTo(1, .001));
    });

    test('verde da marca continua #34C25C e o tom de acao passa de 4,5:1 com texto branco', () {
      expect(VoltiColors.brand, const Color(0xFF34C25C));
      expect(VoltiColors.contrast(VoltiColors.brand, VoltiColors.onBrand), lessThan(4.5));
      expect(VoltiColors.contrast(VoltiColors.brandAction, VoltiColors.onBrandAction), greaterThanOrEqualTo(4.5));
    });

    testWidgets('botao primario pinta o fundo com brandAction; secundario mantem o verde da marca', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'Escanear QR', onPressed: () {})));
      expect(_buttonBg(t), VoltiColors.brandAction);
      final label = t.widget<Text>(find.text('Escanear QR'));
      expect(label.style!.color, VoltiColors.onBrandAction);

      await t.pumpWidget(_wrap(VoltiButton(label: 'Reservar', variant: VoltiButtonVariant.secondary, onPressed: () {})));
      expect(t.widget<Text>(find.text('Reservar')).style!.color, VoltiColors.brand);
    });
  });

  group('VehicleSummaryCard', () {
    testWidgets('categoria, nome, bateria, promocao e preco como no design', (t) async {
      await t.pumpWidget(_wrap(const SizedBox(
        width: 360,
        child: VehicleSummaryCard(
          category: 'Moto elétrica',
          name: 'Volti Flash',
          batteryPct: 90,
          rangeKm: 20,
          promo: 'Grátis na 1ª corrida',
          price: r'R$ 0,79/min + taxa',
        ),
      )));
      expect(find.text('Moto elétrica'), findsOneWidget);
      expect(find.text('Volti Flash'), findsOneWidget);
      expect(find.text('90%'), findsOneWidget);
      expect(find.text('Grátis na 1ª corrida'), findsOneWidget);
      expect(find.text(r'R$ 0,79/min + taxa'), findsOneWidget);
      expect(find.byKey(const Key('vehicle-summary-media')), findsOneWidget);
    });

    testWidgets('sem promocao e sem preco esconde os selos', (t) async {
      await t.pumpWidget(_wrap(const SizedBox(width: 360, child: VehicleSummaryCard(name: 'Volti S1', batteryPct: 40))));
      expect(find.byKey(const Key('vehicle-summary-promo')), findsNothing);
      expect(find.byKey(const Key('vehicle-summary-price')), findsNothing);
    });

    testWidgets('com heroTag envolve a midia num Hero', (t) async {
      await t.pumpWidget(_wrap(const SizedBox(width: 360, child: VehicleSummaryCard(name: 'Volti S1', batteryPct: 40, heroTag: 'v-1'))));
      expect(find.byType(Hero), findsOneWidget);
    });

    testWidgets('texto a 200% nao estoura', (t) async {
      await t.pumpWidget(MediaQuery(
        data: const MediaQueryData(textScaler: TextScaler.linear(2)),
        child: _wrap(const SizedBox(
          width: 360,
          child: VehicleSummaryCard(name: 'Volti Flash', batteryPct: 90, rangeKm: 20, promo: 'Grátis na 1ª corrida', price: r'R$ 0,79/min + taxa'),
        )),
      ));
      expect(t.takeException(), isNull);
    });
  });
}
