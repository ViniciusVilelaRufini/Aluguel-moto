import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Tabelas do diretorio sfnt: tag -> offset.
Map<String, int> _tables(ByteData d) {
  final n = d.getUint16(4);
  return {
    for (var i = 0; i < n; i++)
      String.fromCharCodes([
        for (var k = 0; k < 4; k++) d.getUint8(12 + i * 16 + k)
      ]): d.getUint32(12 + i * 16 + 8),
  };
}

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
    final seen = <String>{};
    for (final a in [...sans, ...mono]) {
      final data = await rootBundle.load(a);
      expect(data.lengthInBytes, greaterThan(10000));
      // Estaticas: sem tabela fvar e usWeightClass igual ao peso declarado.
      final tables = _tables(data);
      expect(tables.containsKey('fvar'), isFalse, reason: '$a e variavel');
      final w = int.parse(RegExp(r'-(\d+)\.ttf').firstMatch(a)!.group(1)!);
      final os2 = tables['OS/2']!;
      expect(data.getUint16(os2 + 4), w, reason: 'usWeightClass de $a');
      // Todas diferentes entre si.
      expect(seen.add(base64.encode(data.buffer.asUint8List())), isTrue,
          reason: '$a duplicada');
    }
  });
}
