import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('tema usa Plus Jakarta Sans e tipografia usa as duas familias', () {
    for (final t in [VoltiTheme.light(), VoltiTheme.dark()]) {
      expect(t.textTheme.bodyMedium!.fontFamily, 'Plus Jakarta Sans');
      expect(t.textTheme.titleLarge!.fontFamily, 'Plus Jakarta Sans');
    }
    expect(VoltiTypography.timer.fontFamily, 'JetBrains Mono');
    expect(VoltiTypography.display.fontFamily, 'Plus Jakarta Sans');
  });

  test('FontManifest lista as fontes TTF com os pesos', () async {
    final raw = await rootBundle.loadString('FontManifest.json');
    final list = (json.decode(raw) as List).cast<Map<String, dynamic>>();
    Map<String, dynamic> fam(String n) => list.firstWhere((f) => f['family'] == n);
    List<String> assets(String n) => [
          for (final f in fam(n)['fonts'] as List) (f as Map)['asset'] as String
        ];
    final sans = assets('Plus Jakarta Sans');
    final mono = assets('JetBrains Mono');
    expect(sans.length, 5);
    expect(mono.length, 2);
    expect([...sans, ...mono].every((a) => a.endsWith('.ttf')), isTrue);
    for (final a in [...sans, ...mono]) {
      expect((await rootBundle.load(a)).lengthInBytes, greaterThan(10000));
    }
  });
}
