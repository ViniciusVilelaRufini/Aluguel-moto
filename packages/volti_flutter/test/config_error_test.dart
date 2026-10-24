import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('tela de configuracao invalida lista os defines faltando (texto ${scale * 100}%)', (t) async {
      t.view.physicalSize = const Size(360, 640);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      t.platformDispatcher.textScaleFactorTestValue = scale;
      addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
      await t.pumpWidget(const ConfigErrorApp(problems: [
        'API_BASE_URL ausente (--dart-define=API_BASE_URL=https://...)',
        'SUPPORT_PHONE ausente (--dart-define=SUPPORT_PHONE=+55...)',
      ]));
      await t.pump(const Duration(milliseconds: 500));
      expect(t.takeException(), isNull);
      expect(find.text('Configuração inválida do app'), findsOneWidget);
      expect(find.textContaining('SUPPORT_PHONE ausente'), findsOneWidget);
      expect(find.textContaining('API_BASE_URL ausente'), findsOneWidget);
    });
  }
}
