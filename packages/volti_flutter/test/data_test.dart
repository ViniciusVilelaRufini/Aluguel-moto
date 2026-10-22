import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

Widget _wrap(Widget child, {ThemeData? theme, double scale = 1}) => MaterialApp(
      theme: theme ?? VoltiTheme.light(),
      home: MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(scale)),
        child: Scaffold(body: Center(child: SizedBox(width: 360, child: child))),
      ),
    );

void main() {
  group('VoltiBadge', () {
    testWidgets('tom success por padrao, com icone e texto', (t) async {
      await t.pumpWidget(_wrap(const VoltiBadge('Verificada', icon: LucideIcons.shieldCheck)));
      expect(find.text('Verificada'), findsOneWidget);
      expect(find.byIcon(LucideIcons.shieldCheck), findsOneWidget);
      final box = t.widget<Container>(find.byKey(const Key('volti-badge'))).decoration! as BoxDecoration;
      expect(box.color, VoltiColors.successSoft);
    });

    testWidgets('tamanho sm tem 20 px e md 26 px', (t) async {
      await t.pumpWidget(_wrap(const Column(mainAxisSize: MainAxisSize.min, children: [
        VoltiBadge('sm', size: VoltiBadgeSize.sm, tone: VoltiBadgeTone.neutral),
        VoltiBadge('md', tone: VoltiBadgeTone.danger),
      ])));
      expect(t.getSize(find.byKey(const Key('volti-badge')).first).height, 20);
      expect(t.getSize(find.byKey(const Key('volti-badge')).last).height, 26);
    });

    testWidgets('cresce com o texto a 200% sem estourar', (t) async {
      await t.pumpWidget(_wrap(const VoltiBadge('18+'), scale: 2));
      expect(t.takeException(), isNull);
    });
  });

  group('StatTile', () {
    testWidgets('mostra rotulo, valor e delta com a tendencia', (t) async {
      await t.pumpWidget(_wrap(const StatTile(
        label: 'Créditos',
        value: 'R\$ 38,50',
        icon: LucideIcons.wallet,
        delta: '+12%',
      )));
      expect(find.text('Créditos'), findsOneWidget);
      expect(find.text('R\$ 38,50'), findsOneWidget);
      expect(find.byIcon(LucideIcons.trendingUp), findsOneWidget);
    });

    testWidgets('le como um item so no leitor de tela', (t) async {
      final h = t.ensureSemantics();
      await t.pumpWidget(_wrap(const StatTile(label: 'Pacote de minutos', value: '120 min')));
      expect(find.bySemanticsLabel(RegExp('Pacote de minutos.*120 min')), findsOneWidget);
      h.dispose();
    });

    testWidgets('lado a lado a 200% sem estouro e no tema escuro', (t) async {
      await t.pumpWidget(_wrap(
        const Row(children: [
          Expanded(child: StatTile(label: 'Créditos', value: 'R\$ 1.038,50', icon: LucideIcons.wallet)),
          SizedBox(width: 10),
          Expanded(child: StatTile(label: 'Pacote de minutos', value: '120 min', icon: LucideIcons.timer)),
        ]),
        theme: VoltiTheme.dark(),
        scale: 2,
      ));
      expect(t.takeException(), isNull);
    });
  });

  group('VoltiListGroup', () {
    testWidgets('overline em caixa alta e linhas dentro do cartao', (t) async {
      await t.pumpWidget(_wrap(const VoltiListGroup(
        title: 'Plano',
        children: [ListRow(title: 'Semanal'), ListRow(title: 'Mensal')],
      )));
      expect(find.text('PLANO'), findsOneWidget);
      expect(find.text('Semanal'), findsOneWidget);
      expect(find.text('Mensal'), findsOneWidget);
    });
  });
}
