import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

void main() {
  testWidgets('botoes do operador anunciam "Carregando…" e "Concluído" (E-21)', (tester) async {
    final s = tester.ensureSemantics();
    final h = Harness();
    await h.pump(tester, const Scaffold(body: Center(child: VoltiButton(label: 'Enviar checklist', loading: true))));
    expect(
      tester.getSemantics(find.byType(VoltiButton)),
      isSemantics(label: 'Enviar checklist', value: 'Carregando…', isButton: true, isLiveRegion: true),
    );
    await h.pump(tester, const Scaffold(body: Center(child: VoltiButton(label: 'Enviar checklist', success: true))));
    expect(
      tester.getSemantics(find.byType(VoltiButton)),
      isSemantics(label: 'Enviar checklist', value: 'Concluído', isButton: true, isLiveRegion: true),
    );
    await tester.pumpAndSettle();
    s.dispose();
  });
}
