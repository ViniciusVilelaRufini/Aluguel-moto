// Achados do teste no emulador (rodada 1): trilho do deslize, relogio do
// servidor e par de botoes que nao corta o rotulo.
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

Widget _wrap(Widget child) => MaterialApp(
      theme: VoltiTheme.light(),
      home: Scaffold(body: Center(child: child)),
    );

class _DateAdapter implements HttpClientAdapter {
  _DateAdapter(this.date, {this.status = 200});
  final String? date;
  final int status;
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async =>
      ResponseBody.fromString('{}', status, headers: {
        Headers.contentTypeHeader: ['application/json'],
        if (date != null) 'date': [date!],
      });
  @override
  void close({bool force = false}) {}
}

class _StubAuth implements AuthRepository {
  @override
  AuthMode get mode => AuthMode.dev;
  @override
  AuthSession? get session => null;
  @override
  Future<String?> accessToken() async => null;
  @override
  Future<void> signOut() async {}
}

/// Fontes reais do design (a fonte de teste tem glifos quadrados, bem mais
/// largos): a medida de "cabe ou nao" fica igual a do aparelho.
Future<void> loadVoltiFonts() async {
  final raw = await rootBundle.loadString('FontManifest.json');
  for (final fam in (json.decode(raw) as List).cast<Map<String, dynamic>>()) {
    final family = fam['family'] as String;
    final names = {family, if (!family.startsWith('packages/')) 'packages/volti_flutter/$family'};
    for (final name in names) {
      final loader = FontLoader(name);
      for (final f in fam['fonts'] as List) {
        loader.addFont(rootBundle.load((f as Map)['asset'] as String));
      }
      await loader.load();
    }
  }
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await loadVoltiFonts();
  });

  group('SwipeAction (trilho do design)', () {
    for (final scale in [1.0, 2.0]) {
      testWidgets('trilho na largura toda e rotulo sem o botao por cima (texto $scale x)', (t) async {
        t.view.physicalSize = const Size(360, 740);
        t.view.devicePixelRatio = 1;
        t.platformDispatcher.textScaleFactorTestValue = scale;
        addTearDown(t.view.reset);
        addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
        // Como no banner: dentro de uma Column centralizada (largura frouxa).
        await t.pumpWidget(_wrap(const SizedBox(
          width: 320,
          child: Column(mainAxisSize: MainAxisSize.min, children: [SwipeAction(label: 'Deslize para cancelar')]),
        )));
        final track = t.getRect(find.byType(SwipeAction));
        expect(track.width, 320, reason: 'trilho branco de largura total');
        final knob = t.getRect(find.byKey(const Key('swipe-knob')));
        final label = t.getRect(find.text('Deslize para cancelar'));
        expect(label.left, greaterThanOrEqualTo(knob.right), reason: 'o botao nao cobre o texto');
        expect(label.right, lessThanOrEqualTo(track.right));
        expect((label.center.dx - track.center.dx).abs(), lessThan(1), reason: 'texto centralizado');
        final p = t.renderObject<RenderParagraph>(find.text('Deslize para cancelar'));
        expect(p.didExceedMaxLines, isFalse, reason: 'texto inteiro visivel');
        expect(t.takeException(), isNull);
      });
    }

    testWidgets('leitor de tela: botao com o rotulo que dispara a acao', (t) async {
      final handle = t.ensureSemantics();
      var done = 0;
      await t.pumpWidget(_wrap(SizedBox(width: 320, child: SwipeAction(label: 'Deslize para cancelar', onComplete: () => done++))));
      final node = t.getSemantics(find.bySemanticsLabel('Deslize para cancelar'));
      expect(node.flagsCollection.isButton, isTrue);
      t.semantics.tap(find.semantics.byLabel('Deslize para cancelar'));
      await t.pump();
      expect(done, 1);
      handle.dispose();
    });
  });

  group('ServerClock (cabecalho Date)', () {
    test('le o formato IMF-fixdate', () {
      expect(parseHttpDate('Thu, 22 Oct 2026 12:00:05 GMT'), DateTime.utc(2026, 10, 22, 12, 0, 5));
      expect(parseHttpDate('lixo'), isNull);
      expect(parseHttpDate(null), isNull);
    });

    test('corrige o relogio do aparelho 70 s atrasado', () {
      final local = DateTime.utc(2026, 10, 22, 11, 58, 50);
      final c = ServerClock(localNow: () => local);
      expect(c.now(), local);
      c.observe('Thu, 22 Oct 2026 12:00:00 GMT');
      expect(c.now().difference(DateTime.utc(2026, 10, 22, 12)).inMilliseconds.abs(), lessThanOrEqualTo(500));
    });

    test('diferenca menor que 1 s e ignorada (resolucao do cabecalho)', () {
      final local = DateTime.utc(2026, 10, 22, 12, 0, 0, 300);
      final c = ServerClock(localNow: () => local)..observe('Thu, 22 Oct 2026 12:00:00 GMT');
      expect(c.offset, Duration.zero);
    });

    test('o cliente da API observa o Date das respostas, inclusive de erro', () async {
      final local = DateTime.utc(2026, 10, 22, 11, 58, 50);
      final clock = ServerClock(localNow: () => local);
      final api = buildVoltiApi(
        baseUrl: 'http://x',
        auth: _StubAuth(),
        httpClientAdapter: _DateAdapter('Thu, 22 Oct 2026 12:00:00 GMT'),
        serverClock: clock,
      );
      await api.dio.get<dynamic>('/me');
      expect(clock.offset.inSeconds, inInclusiveRange(70, 71));

      final clock2 = ServerClock(localNow: () => local);
      final api2 = buildVoltiApi(
        baseUrl: 'http://x',
        auth: _StubAuth(),
        httpClientAdapter: _DateAdapter('Thu, 22 Oct 2026 12:00:00 GMT', status: 404),
        serverClock: clock2,
        sleep: (_) async {},
      );
      await expectLater(api2.dio.get<dynamic>('/me'), throwsA(isA<DioException>()));
      expect(clock2.offset.inSeconds, inInclusiveRange(70, 71));
    });
  });

  group('VoltiButtonPair', () {
    Future<void> pumpPair(WidgetTester t, double scale) async {
      t.view.physicalSize = const Size(412, 915);
      t.view.devicePixelRatio = 1;
      t.platformDispatcher.textScaleFactorTestValue = scale;
      addTearDown(t.view.reset);
      addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
      await t.pumpWidget(_wrap(Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: VoltiButtonPair(
          first: VoltiButton(
            label: 'Destravar',
            icon: Icons.play_circle,
            variant: VoltiButtonVariant.secondary,
            size: VoltiButtonSize.lg,
            fullWidth: true,
            onPressed: () {},
          ),
          second: VoltiButton(
            label: 'Devolver moto',
            variant: VoltiButtonVariant.dark,
            size: VoltiButtonSize.lg,
            fullWidth: true,
            onPressed: () {},
          ),
        ),
      )));
    }

    for (final scale in [1.0, 2.0]) {
      testWidgets('nenhum rotulo cortado (texto $scale x)', (t) async {
        await pumpPair(t, scale);
        for (final s in ['Destravar', 'Devolver moto']) {
          expect(t.renderObject<RenderParagraph>(find.text(s)).didExceedMaxLines, isFalse, reason: '"$s" inteiro');
        }
        expect(t.takeException(), isNull);
      });
    }

    testWidgets('lado a lado quando cabe', (t) async {
      t.view.physicalSize = const Size(900, 600);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(_wrap(SizedBox(
        width: 800,
        child: VoltiButtonPair(
          first: VoltiButton(label: 'A', fullWidth: true, onPressed: () {}),
          second: VoltiButton(label: 'B', fullWidth: true, onPressed: () {}),
        ),
      )));
      expect(t.getRect(find.text('A')).top, t.getRect(find.text('B')).top);
    });
  });

  testWidgets('VoltiBottomSheet ocupa a largura da tela mesmo com conteudo estreito', (t) async {
    t.view.physicalSize = const Size(412, 915);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(MaterialApp(
      theme: VoltiTheme.light(),
      home: Builder(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () => VoltiBottomSheet.show<void>(context, builder: (_) => const Text('Pix confirmado')),
            child: const Text('abrir'),
          ),
        ),
      ),
    ));
    await t.tap(find.text('abrir'));
    await t.pumpAndSettle();
    expect(t.getSize(find.byType(VoltiBottomSheet)).width, 412);
  });
}
