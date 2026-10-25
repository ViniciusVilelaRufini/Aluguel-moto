import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/core/widgets.dart';
import 'package:volti_cliente/features/account/account_screen.dart';
import 'package:volti_cliente/features/account/wallet_screen.dart';
import 'package:volti_cliente/features/home/home_screen.dart';
import 'package:volti_cliente/features/onboarding/welcome_hero.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'account_gap_c_test.dart' show AccountBackend;
import 'galpao_fixtures.dart';
import 'helpers.dart';
import 'home_parity_test.dart' show ParityBackend;

/// Cores de superficie do tema CLARO que nunca podem aparecer como fundo com o
/// aparelho no modo escuro (o relato do TestFlight: "so algumas areas trocam").
final _lightSurfaces = <Color, String>{
  VoltiColors.white: 'white/surfaceCard',
  VoltiColors.ink50: 'ink50/surfaceApp',
  VoltiColors.ink100: 'ink100/surfaceSunken',
  VoltiColors.green50: 'brandSoft/successSoft',
  VoltiColors.green100: 'green100',
  VoltiColors.blue50: 'infoSoft',
  VoltiColors.orange50: 'warningSoft',
  VoltiColors.coral50: 'dangerSoft',
  VoltiColors.sky100: 'surfaceMedia',
  VoltiColors.glassBg: 'glassBg',
  VoltiColors.mapLand: 'mapLand',
  kHeroMapLoading: 'kHeroMapLoading',
  const Color(0xFFFFF3CC): 'sun soft',
};

/// Todo fundo pintado (Container, DecoratedBox, ColoredBox, Material) na arvore.
List<String> _lightBackgrounds(WidgetTester t) {
  final hits = <String>[];
  void check(Color? c, Widget w) {
    if (c == null) return;
    final name = _lightSurfaces[c];
    if (name != null) hits.add('${w.runtimeType}${w.key != null ? ' ${w.key}' : ''} com fundo $name');
  }

  Color? deco(Decoration? d) => d is BoxDecoration ? d.color : null;
  for (final e in find.byWidgetPredicate((_) => true).evaluate()) {
    final w = e.widget;
    if (w is Container) {
      check(w.color, w);
      check(deco(w.decoration), w);
    } else if (w is AnimatedContainer) {
      check(deco(w.decoration), w);
    } else if (w is DecoratedBox) {
      check(deco(w.decoration), w);
    } else if (w is ColoredBox) {
      check(w.color, w);
    } else if (w is Material) {
      check(w.color, w);
    }
  }
  return hits;
}

void main() {
  group('tema escuro: nenhuma superficie clara', () {
    testWidgets('home (galpao, cartao e chips)', (t) async {
      t.view.physicalSize = const Size(412, 915);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(testApp(
        const HomeScreen(),
        theme: VoltiTheme.dark(),
        overrides: [
          backendProvider.overrideWithValue(ParityBackend()),
          pushServiceProvider.overrideWithValue(NoopPushService()),
          locationServiceProvider.overrideWithValue(FakeLocation()),
          sessionProvider.overrideWith(() => FakeSession(session())),
          clockProvider.overrideWithValue(() => thu10),
        ],
      ));
      for (var i = 0; i < 6; i++) {
        await t.pump(const Duration(milliseconds: 300));
      }
      expect(_lightBackgrounds(t), isEmpty);
    });

    testWidgets('conta', (t) async {
      tallScreen(t);
      await t.pumpWidget(testApp(
        const AccountScreen(),
        theme: VoltiTheme.dark(),
        overrides: [
          backendProvider.overrideWithValue(AccountBackend()),
          sessionProvider.overrideWith(() => FakeSession(session())),
        ],
      ));
      await t.pumpAndSettle();
      expect(_lightBackgrounds(t), isEmpty);
    });

    testWidgets('carteira', (t) async {
      tallScreen(t);
      await t.pumpWidget(testApp(const WalletScreen(), theme: VoltiTheme.dark(), overrides: [backendProvider.overrideWithValue(AccountBackend())]));
      await t.pumpAndSettle();
      expect(_lightBackgrounds(t), isEmpty);
    });

    testWidgets('avisos, cartao do hero, folha e dialogo', (t) async {
      await t.pumpWidget(testApp(
        Scaffold(
          body: Builder(
            builder: (context) => ListView(children: [
              const NoticeBanner(message: 'Zona com limite'),
              const NoticeBanner(message: 'Privacidade', info: true),
              const NoticeBanner(message: 'Fora da area', danger: true),
              const HeroStatementCard(index: 0, data: HeroStatementData(icon: Icons.warehouse, title: 'Retire no galpão', text: 'Escolha no app')),
              const VoltiBadge('Versão de teste', tone: VoltiBadgeTone.warning),
              const VoltiEmptyState(icon: Icons.inbox, title: 'Nada aqui'),
              const VoltiStatusBanner(visible: true, message: 'Sem conexão', tone: VoltiStatusTone.offline),
              const VoltiSkeletonBox(width: 80),
              const OptionCard(title: 'Diário', selected: true),
              const ListRow(title: 'Carteira', icon: Icons.wallet, iconTone: ListRowTone.brand),
              TextButton(
                onPressed: () => VoltiBottomSheet.show(context, builder: (_) => const Text('Folha')),
                child: const Text('abrir folha'),
              ),
              TextButton(
                onPressed: () => VoltiDialog.show(context, title: 'Diálogo', actions: const []),
                child: const Text('abrir dialogo'),
              ),
            ]),
          ),
        ),
        theme: VoltiTheme.dark(),
      ));
      await t.pump(const Duration(seconds: 1));
      expect(_lightBackgrounds(t), isEmpty);
      await t.tap(find.text('abrir folha'));
      await t.pump(const Duration(seconds: 1));
      expect(_lightBackgrounds(t), isEmpty);
      Navigator.of(t.element(find.text('Folha'))).pop();
      await t.pump(const Duration(seconds: 1));
      await t.tap(find.text('abrir dialogo'));
      await t.pump(const Duration(seconds: 1));
      expect(_lightBackgrounds(t), isEmpty);
    });
  });

  test('lint: lib/ nao usa tokens de superficie clara fixos (marque `tema: fixo` quando for de proposito)', () {
    // Tokens do tema claro que tem equivalente em `VoltiPalette` (superficie,
    // tons soft, vidro, mapa). Fundo branco/claro literal tambem conta.
    final token = RegExp(
      r'VoltiColors\.(surfaceCard|surfaceApp|surfaceSunken|surfaceMedia|surfaceInverse|ink50|ink100|ink200|brandSoft|successSoft|successInk|'
      r'infoSoft|infoInk|warningSoft|warningInk|warningInkStrong|dangerSoft|dangerInk|dangerInkStrong|glassBg|mapLand|sky100|blue50|green50|green100|'
      r'coral50|orange50|textPrimary|textSecondary|textTertiary|textLink|borderSubtle|borderStrong|surfaceScrim)\b',
    );
    final lightFill = RegExp(
      r'(BoxDecoration\(\s*color:\s*|ColoredBox\(\s*color:\s*|backgroundColor:\s*)(const\s+)?(VoltiColors\.white|Colors\.white)\b',
    );
    final hits = <String>[];
    for (final f in Directory('lib').listSync(recursive: true).whereType<File>()) {
      if (!f.path.endsWith('.dart') || f.path.contains('l10n')) continue;
      final src = f.readAsStringSync();
      final lines = src.split('\n');
      void flag(int offset, String what) {
        final ln = '\n'.allMatches(src.substring(0, offset)).length;
        final line = lines[ln];
        final prev = ln > 0 ? lines[ln - 1] : '';
        if (line.contains('tema: fixo') || prev.contains('tema: fixo')) return;
        hits.add('${f.path}:${ln + 1}: $what');
      }

      for (final m in token.allMatches(src)) {
        flag(m.start, m.group(0)!);
      }
      for (final m in lightFill.allMatches(src)) {
        flag(m.start, m.group(0)!.replaceAll(RegExp(r'\s+'), ' '));
      }
    }
    expect(hits, isEmpty, reason: 'Use VoltiPalette.of(context) / context.palette:\n${hits.join('\n')}');
  });
}
