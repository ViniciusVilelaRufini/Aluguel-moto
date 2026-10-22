import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';

import 'galpao_fixtures.dart';
import 'galpao_flow_test.dart' show phone, pumpApp;

/// Catalogo de exemplo (seed-catalog.ts): o cartao de "Escolher moto" mostra a
/// descricao curta do modelo sob a categoria e a foto do produto inteira
/// (`contain` sobre branco), vindas de `GET /vehicle-models`.
VehicleModel catalogModel(String id, String name, String category, int price, {String? description, String? photoUrl}) => VehicleModel((b) => b
  ..id = id
  ..name = name
  ..slug = name.toLowerCase().replaceAll(' ', '-')
  ..categoryLabel = category
  ..description = description
  ..photoUrl = photoUrl
  ..pricePerMinuteCents = price
  ..serviceIntervalKm = 1000
  ..serviceIntervalHours = 100
  ..active = true
  ..sortOrder = 1
  ..createdAt = thu10
  ..updatedAt = thu10);

class CatalogBackend extends GalpaoBackend {
  CatalogBackend()
      : super(vehicles: {
          'dep1': [
            bike('v1', 'VLT-011', 'Volti Urbana', category: 'Urbana com cesto').rebuild((b) => b.vehicleModelId = 'm1'),
            bike('v2', 'VLT-012', 'Volti Sport', price: 89, category: 'Esportiva compacta').rebuild((b) => b.vehicleModelId = 'm2'),
          ],
        });

  @override
  Future<List<VehicleModel>> vehicleModels() async => [
        catalogModel('m1', 'Volti Urbana', 'Urbana com cesto', 79,
            description: '1000 W · 48 V · 32 km/h · cesto e garupa · sem CNH', photoUrl: 'http://10.0.2.2:9000/catalogo/catalog/urbana.jpg'),
        // Sem foto e sem descricao: icone e nenhuma linha extra.
        catalogModel('m2', 'Volti Sport', 'Esportiva compacta', 89),
      ];
}

void main() {
  testWidgets('cartao mostra a descricao do modelo sob a categoria', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    expect(find.text('Urbana com cesto'), findsOneWidget);
    final desc = find.text('1000 W · 48 V · 32 km/h · cesto e garupa · sem CNH');
    expect(desc, findsOneWidget);
    // Uma linha so, com reticencias.
    final text = t.widget<Text>(desc);
    expect(text.maxLines, 1);
    expect(text.overflow, TextOverflow.ellipsis);
    // Abaixo da categoria, no mesmo cartao.
    expect(t.getTopLeft(desc).dy, greaterThan(t.getTopLeft(find.text('Urbana com cesto')).dy));
    expect(find.descendant(of: find.byKey(const Key('pick-card-v1')), matching: desc), findsOneWidget);
    // O modelo sem descricao nao ganha linha.
    expect(find.descendant(of: find.byKey(const Key('pick-card-v2')), matching: find.textContaining('km/h')), findsNothing);
  });

  testWidgets('descricao entra no rotulo de acessibilidade do cartao', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    expect(find.bySemanticsLabel(RegExp('Urbana com cesto, 1000 W · 48 V · 32 km/h')), findsOneWidget);
  });

  testWidgets('foto do produto inteira (contain) sobre branco; sem foto, icone', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    final images = find.descendant(of: find.byKey(const Key('pick-card-v1')), matching: find.byType(Image));
    expect(images, findsOneWidget);
    final img = t.widget<Image>(images);
    expect((img.image as NetworkImage).url, 'http://10.0.2.2:9000/catalogo/catalog/urbana.jpg');
    expect(img.fit, BoxFit.contain);
    expect(find.ancestor(of: images, matching: find.byKey(const Key('pick-photo-bg'))), findsOneWidget);
    expect(find.descendant(of: find.byKey(const Key('pick-card-v2')), matching: find.byType(Image)), findsNothing);
  });
}
