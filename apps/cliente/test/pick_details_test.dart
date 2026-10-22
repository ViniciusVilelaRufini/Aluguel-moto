import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_flow_test.dart' show phone, pumpApp, settle;
import 'pick_catalog_test.dart' show CatalogBackend, loadFonts, urbanaDesc;

/// "Escolha sua moto": pilula de bateria clara, cartao que abre os detalhes ao
/// pressionar e segurar (um por vez) e o botao "Continuar" flutuando sobre a lista.
void main() {
  setUpAll(loadFonts);

  Finder card(String id) => find.byKey(Key('pick-card-$id'));
  Finder details(String id) => find.descendant(of: card(id), matching: find.byKey(const Key('pick-details')));

  testWidgets('pilula de bateria clara no cartao (raio pela carga, texto escuro)', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    final pill = find.descendant(of: card('v1'), matching: find.byKey(const Key('battery-pill-light')));
    expect(pill, findsOneWidget);
    final box = t.widget<Container>(pill);
    expect((box.decoration! as BoxDecoration).color, VoltiColors.surfaceSunken);
    // 90% = verde.
    expect(t.widget<Icon>(find.descendant(of: card('v1'), matching: find.byKey(const Key('battery-bolt')))).color, VoltiColors.successInk);
  });

  testWidgets('pressionar e segurar abre os detalhes; toque normal so seleciona', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    // Fechado: descricao em ate 2 linhas.
    expect(t.widget<Text>(find.descendant(of: card('v1'), matching: find.byKey(const Key('pick-description')))).maxLines, 2);
    await t.longPress(card('v1'));
    await settle(t);
    expect(details('v1'), findsOneWidget);
    expect(t.widget<Text>(find.descendant(of: card('v1'), matching: find.byKey(const Key('pick-description')))).maxLines, isNull);
    expect(find.text(urbanaDesc), findsOneWidget);
    for (final k in ['Categoria', 'Potência', 'Velocidade máxima', 'Bateria e autonomia', 'Preço por minuto', 'Taxa de desbloqueio', 'Código']) {
      expect(find.descendant(of: details('v1'), matching: find.text(k)), findsOneWidget, reason: k);
    }
    expect(find.descendant(of: details('v1'), matching: find.text('1000 W')), findsOneWidget);
    expect(find.descendant(of: details('v1'), matching: find.text('32 km/h')), findsOneWidget);
    expect(find.descendant(of: details('v1'), matching: find.text('VLT-011')), findsOneWidget);
    expect(find.descendant(of: details('v1'), matching: find.text('90% · ~40 km')), findsOneWidget);

    // Toque em outro cartao: seleciona sem abrir.
    await t.tap(card('v2'));
    await settle(t);
    expect(details('v2'), findsNothing);
    expect(t.widget<VoltiButton>(find.byKey(const Key('pick-continue'))).subtitle, 'Volti Sport · VLT-012');

    // Segundo "segurar" fecha.
    await t.longPress(card('v1'));
    await settle(t);
    expect(details('v1'), findsNothing);
  });

  testWidgets('um aberto por vez; a seta recolhe', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    await t.longPress(card('v1'));
    await settle(t);
    await t.longPress(card('v2'));
    await settle(t);
    expect(details('v1'), findsNothing);
    expect(details('v2'), findsOneWidget);
    expect(find.byKey(const Key('pick-details')), findsOneWidget);
    final collapse = find.descendant(of: card('v2'), matching: find.byKey(const Key('pick-collapse')));
    await t.ensureVisible(collapse);
    await t.pump();
    await t.tap(collapse);
    await settle(t);
    expect(find.byKey(const Key('pick-details')), findsNothing);
  });

  testWidgets('leitor de tela: acao "Ver detalhes / Recolher" e estado aberto anunciado', (t) async {
    phone(t);
    final h = t.ensureSemantics();
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    SemanticsNode node() => t.getSemantics(card('v1'));
    expect(node(), isSemantics(hasExpandedState: true, isExpanded: false));
    final ids = node().getSemanticsData().customSemanticsActionIds!;
    node().owner!.performAction(node().id, SemanticsAction.customAction, ids.firstWhere((i) => CustomSemanticsAction.getAction(i)!.label == 'Ver detalhes'));
    await settle(t);
    expect(details('v1'), findsOneWidget);
    expect(node(), isSemantics(hasExpandedState: true, isExpanded: true));
    expect(node().label, contains('Taxa de desbloqueio'));
    node().owner!.performAction(
        node().id, SemanticsAction.customAction, node().getSemanticsData().customSemanticsActionIds!.firstWhere((i) => CustomSemanticsAction.getAction(i)!.label == 'Recolher'));
    await settle(t);
    expect(details('v1'), findsNothing);
    h.dispose();
  });

  testWidgets('aberto a 200% em 360 px: sem estouro', (t) async {
    phone(t, scale: 2, size: const Size(360, 740));
    await pumpApp(t, CatalogBackend(withSportExtras: true), initial: '/pick');
    // A 200% so o primeiro cartao (Touring) cabe na tela.
    await t.longPress(card('v3'));
    await settle(t);
    expect(t.takeException(), isNull);
    expect(details('v3'), findsOneWidget);
    await t.ensureVisible(find.byKey(const Key('pick-collapse')));
    await settle(t);
    expect(t.takeException(), isNull);
  });

  testWidgets('reduzir movimento: abre sem animacao pendente', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick', reduceMotion: true);
    await t.longPress(card('v1'));
    await t.pump();
    await t.pump();
    expect(details('v1'), findsOneWidget);
    expect(t.binding.hasScheduledFrame, isFalse);
  });

  testWidgets('botao flutuante: sem rodape opaco, so o veu; o ultimo cartao sobe acima do botao', (t) async {
    phone(t, size: const Size(360, 640));
    await pumpApp(t, CatalogBackend(withSportExtras: true), initial: '/pick');
    final footer = t.widget<DecoratedBox>(find.byKey(const Key('pick-footer-veil')));
    final deco = footer.decoration as BoxDecoration;
    expect(deco.color, isNull, reason: 'sem fundo opaco');
    expect(deco.boxShadow, isNull);
    expect(deco.gradient!.colors.every((c) => c.a <= .6 + 1e-6), isTrue);
    // Nenhum container opaco atras do botao.
    final opaque = find.descendant(
      of: find.byKey(const Key('pick-footer')),
      matching: find.byWidgetPredicate((w) =>
          w is Container && w.decoration is BoxDecoration && (w.decoration! as BoxDecoration).color == VoltiColors.white && w.key != const Key('volti-button-surface')),
    );
    expect(opaque, findsNothing);
    // Botao com 16 px nas laterais.
    final btn = t.getRect(find.byKey(const Key('pick-continue')));
    expect(btn.left, 16);
    expect(btn.right, 360 - 16);
    // A lista rola ate o ultimo cartao ficar inteiro acima do botao.
    await t.drag(find.byKey(const Key('pick-list')), const Offset(0, -2000));
    await settle(t);
    // Ultimo cartao da lista (ordem da API: v3, v2, v1).
    final last = t.getRect(card('v1'));
    expect(last.bottom, lessThanOrEqualTo(btn.top), reason: 'ultimo cartao acima do botao');
    // A lista passa por baixo do botao (vai ate o fundo da tela).
    expect(t.getRect(find.byKey(const Key('pick-list'))).bottom, greaterThan(btn.top));
  });

  testWidgets('aviso de KYC flutua como cartao acima do botao', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick', kyc: KycStatus.pending);
    final notice = t.getRect(find.text('Verificação em análise'));
    final btn = t.getRect(find.byKey(const Key('pick-continue')));
    expect(notice.bottom, lessThan(btn.top));
    expect(find.descendant(of: find.byKey(const Key('pick-footer')), matching: find.text('Verificação em análise')), findsOneWidget);
  });

  testWidgets('o veu do botao nao rouba toques: tocar nele seleciona o cartao de baixo', (t) async {
    phone(t, size: const Size(360, 640));
    await pumpApp(t, CatalogBackend(withSportExtras: true), initial: '/pick');
    final veil = t.getRect(find.byKey(const Key('pick-footer-veil')));
    final btn = t.getRect(find.byKey(const Key('pick-continue')));
    // Faixa do veu acima do botao, sobre um cartao.
    final point = Offset(60, (veil.top + btn.top) / 2);
    final under = [for (final id in ['v1', 'v2', 'v3']) if (t.getRect(card(id)).contains(point)) id];
    expect(under, hasLength(1), reason: 'ha um cartao sob o veu');
    await t.tapAt(point);
    await settle(t);
    final v = {'v1': 'Volti Urbana · VLT-011', 'v2': 'Volti Sport · VLT-012', 'v3': 'Volti Touring · VLT-013'}[under.single];
    expect(t.widget<VoltiButton>(find.byKey(const Key('pick-continue'))).subtitle, v);
  });

  testWidgets('cartao fechado mostra "Detalhes" (dica); tocar nele abre', (t) async {
    phone(t);
    await pumpApp(t, CatalogBackend(), initial: '/pick');
    final hint = find.descendant(of: card('v1'), matching: find.byKey(const Key('pick-expand')));
    expect(hint, findsOneWidget);
    expect(find.descendant(of: hint, matching: find.text('Detalhes')), findsOneWidget);
    await t.ensureVisible(hint);
    await t.pump();
    await t.tap(hint);
    await settle(t);
    expect(details('v1'), findsOneWidget);
    expect(find.descendant(of: card('v1'), matching: find.byKey(const Key('pick-expand'))), findsNothing);
  });

  testWidgets('com area segura de 24 px e aviso de KYC, o ultimo cartao sobe acima do aviso e do botao', (t) async {
    phone(t, size: const Size(360, 640));
    t.view.padding = const FakeViewPadding(bottom: 24);
    await pumpApp(t, CatalogBackend(withSportExtras: true), initial: '/pick', kyc: KycStatus.pending);
    await t.drag(find.byKey(const Key('pick-list')), const Offset(0, -3000));
    await settle(t);
    // Ultimo cartao da lista (ordem da API: v3, v2, v1).
    final last = t.getRect(card('v1'));
    final notice = t.getRect(find.text('Verificação em análise'));
    final btn = t.getRect(find.byKey(const Key('pick-continue')));
    expect(btn.bottom, lessThanOrEqualTo(640 - 24), reason: 'botao acima da area segura');
    expect(last.bottom, lessThanOrEqualTo(notice.top), reason: 'ultimo cartao acima do aviso');
  });
}
