import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/features/home/depot_providers.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'galpao_flow_test.dart' show phone, pumpApp;

/// Catalogo de exemplo (seed-catalog.ts): o cartao de "Escolher moto" mostra a
/// descricao curta do modelo sob a categoria (ate 2 linhas, fatos-chave
/// primeiro) e a foto do produto inteira (`contain` sobre branco), vindas de
/// `GET /vehicle-models`; os chips seguem o `sortOrder` do catalogo.
const urbanaDesc = '32 km/h · sem CNH · 1000 W · 48 V · cesto e garupa';
const sportDesc = '32 km/h · sem CNH · 1000 W · 2 lugares · bateria removível';
const photo = 'http://10.0.2.2:9000/catalogo/catalog/urbana.jpg?X-Amz-Signature=abc';

class CatalogBackend extends GalpaoBackend {
  CatalogBackend({this.withSportExtras = false})
      : super(vehicles: {
          'dep1': [
            // Ordem da API de proposito diferente da do catalogo.
            bike('v3', 'VLT-013', 'Volti Touring', price: 99, category: 'Touring com baú').rebuild((b) => b.vehicleModelId = 'm3'),
            bike('v2', 'VLT-012', 'Volti Sport', price: 89, category: 'Esportiva compacta').rebuild((b) => b.vehicleModelId = 'm2'),
            bike('v1', 'VLT-011', 'Volti Urbana', category: 'Urbana com cesto').rebuild((b) => b.vehicleModelId = 'm1'),
          ],
        });

  int modelCalls = 0;

  /// Sport com descricao longa (a mais comprida do seed).
  final bool withSportExtras;

  @override
  Future<List<VehicleModel>> vehicleModels() async {
    modelCalls++;
    return [
        catalogModel('m3', 'Volti Touring', 'Touring com baú', 99, sortOrder: 3),
        catalogModel('m1', 'Volti Urbana', 'Urbana com cesto', 79, sortOrder: 1, description: urbanaDesc, photoUrl: photo),
        // Sem foto: icone.
        catalogModel('m2', 'Volti Sport', 'Esportiva compacta', 89, sortOrder: 2, description: withSportExtras ? sportDesc : null),
    ];
  }
}

/// Fontes reais do design: a fonte de teste tem glifos quadrados e mede "cabe
/// ou nao" bem diferente do aparelho (mesmo recurso de emulador_1_test.dart).
Future<void> loadFonts() async {
  final raw = await rootBundle.loadString('FontManifest.json');
  for (final fam in (json.decode(raw) as List).cast<Map<String, dynamic>>()) {
    final loader = FontLoader(fam['family'] as String);
    for (final f in fam['fonts'] as List) {
      loader.addFont(rootBundle.load((f as Map)['asset'] as String));
    }
    await loader.load();
  }
}

/// O trecho [part] do texto esta desenhado (nao cortado pela reticencia).
bool laidOut(WidgetTester t, Finder text, String part) {
  final p = t.renderObject<RenderParagraph>(text);
  final full = p.text.toPlainText();
  final start = full.indexOf(part);
  expect(start, greaterThanOrEqualTo(0));
  final boxes = p.getBoxesForSelection(TextSelection(baseOffset: start, extentOffset: start + part.length));
  if (boxes.isEmpty) return false;
  final lastChar = p.getBoxesForSelection(TextSelection(baseOffset: start + part.length - 1, extentOffset: start + part.length));
  return lastChar.isNotEmpty && lastChar.every((b) => b.right <= p.size.width + .5 && b.bottom <= p.size.height + .5);
}

void main() {
  setUpAll(loadFonts);

  testWidgets('descricao sob a categoria, ate 2 linhas; modelo sem descricao nao ganha linha', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    final desc = find.text(urbanaDesc);
    expect(desc, findsOneWidget);
    final text = t.widget<Text>(desc);
    expect(text.maxLines, 2);
    expect(text.overflow, TextOverflow.ellipsis);
    expect(t.getTopLeft(desc).dy, greaterThan(t.getTopLeft(find.text('Urbana com cesto')).dy));
    expect(find.descendant(of: find.byKey(const Key('pick-card-v1')), matching: desc), findsOneWidget);
    expect(find.descendant(of: find.byKey(const Key('pick-card-v2')), matching: find.textContaining('km/h')), findsNothing);
  });

  for (final scale in [1.0, 2.0]) {
    testWidgets('360 px, texto ${scale}x: "32 km/h" e "sem CNH" visiveis e sem estouro', (t) async {
      phone(t, scale: scale, size: const Size(360, 800));
      await pumpApp(t, CatalogBackend(withSportExtras: true), initial: '/pick');
      expect(t.takeException(), isNull);
      // Na ordem da lista (Sport antes da Urbana): o scrollUntilVisible so desce.
      for (final d in [sportDesc, urbanaDesc]) {
        final f = find.text(d);
        await t.scrollUntilVisible(f, 120, scrollable: find.descendant(of: find.byKey(const Key('pick-list')), matching: find.byType(Scrollable)).first);
        await t.pump();
        expect(laidOut(t, f, '32 km/h'), isTrue, reason: d);
        expect(laidOut(t, f, 'sem CNH'), isTrue, reason: d);
      }
      expect(t.takeException(), isNull);
    });
  }

  testWidgets('descricao entra no rotulo de acessibilidade do cartao', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    expect(find.bySemanticsLabel(RegExp('Urbana com cesto, 32 km/h · sem CNH')), findsOneWidget);
  });

  testWidgets('foto inteira (contain) sobre branco, decodificada no tamanho da miniatura; sem foto, icone', (t) async {
    phone(t);
    t.view.physicalSize = const Size(824, 1830);
    t.view.devicePixelRatio = 2;
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    final images = find.descendant(of: find.byKey(const Key('pick-card-v1')), matching: find.byType(Image));
    expect(images, findsOneWidget);
    final img = t.widget<Image>(images);
    expect(img.fit, BoxFit.contain);
    final resized = img.image as ResizeImage;
    expect(resized.width, 176); // 88 px x 2
    expect((resized.imageProvider as NetworkImage).url, photo);
    expect(find.ancestor(of: images, matching: find.byKey(const Key('pick-photo-bg'))), findsOneWidget);
    expect(find.descendant(of: find.byKey(const Key('pick-card-v2')), matching: find.byType(Image)), findsNothing);
  });

  testWidgets('chips de modelo na ordem do catalogo (sortOrder), nao na da API', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    final x = [for (final m in ['Volti Urbana', 'Volti Sport', 'Volti Touring']) t.getTopLeft(find.widgetWithText(VoltiChip, m)).dx];
    expect(x[0], lessThan(x[1]));
    expect(x[1], lessThan(x[2]));
  });

  test('catalogo fica na sessao: voltar a "Escolher moto" nao busca de novo (mesmo link assinado, foto em cache)', () async {
    final b = CatalogBackend();
    final c = ProviderContainer(overrides: [backendProvider.overrideWithValue(b)]);
    addTearDown(c.dispose);
    var sub = c.listen(vehicleModelsProvider, (_, _) {});
    final first = await c.read(vehicleModelsProvider.future);
    sub.close();
    await Future<void>.delayed(Duration.zero);
    sub = c.listen(vehicleModelsProvider, (_, _) {});
    final second = await c.read(vehicleModelsProvider.future);
    sub.close();
    expect(b.modelCalls, 1);
    expect(identical(first, second), isTrue);
  });
}
