import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

Widget _wrap(Widget child, {ThemeData? theme}) => MaterialApp(
      theme: theme ?? VoltiTheme.light(),
      home: Scaffold(body: Center(child: child)),
    );

Color _ringColor(WidgetTester t) {
  final c = t.widget<Container>(find.byKey(const Key('battery-ring')));
  return ((c.decoration! as BoxDecoration).border! as Border).top.color;
}

void main() {
  group('BatteryPill', () {
    for (final (pct, color) in [
      (51, VoltiColors.batteryHigh),
      (50, VoltiColors.batteryMid),
      (21, VoltiColors.batteryMid),
      (20, VoltiColors.batteryLow),
    ]) {
      testWidgets('$pct% usa a cor correta', (t) async {
        await t.pumpWidget(_wrap(BatteryPill(pct, rangeKm: 12)));
        expect(_ringColor(t), color);
        expect(find.text('$pct%'), findsOneWidget);
        expect(find.text('~12 km'), findsOneWidget);
      });
    }
  });

  group('VehicleMarker', () {
    for (final s in [
      VehicleStatus.free,
      VehicleStatus.rented,
      VehicleStatus.reserved,
      VehicleStatus.paused,
      VehicleStatus.blocked,
      VehicleStatus.maintenance,
      VehicleStatus.offline,
    ]) {
      testWidgets('cor do corpo para ${s.name}', (t) async {
        await t.pumpWidget(_wrap(VehicleMarker(s, 80)));
        final body = t.widget<AnimatedContainer>(find.byKey(const Key('vehicle-marker-body')));
        expect((body.decoration! as BoxDecoration).color, VoltiColors.statusColor(s));
      });
    }

    test('status batem com os tokens --status-*', () {
      expect(VoltiColors.statusColor(VehicleStatus.free), const Color(0xFF34C25C));
      expect(VoltiColors.statusColor(VehicleStatus.rented), const Color(0xFF2F7FE0));
      expect(VoltiColors.statusColor(VehicleStatus.reserved), const Color(0xFFF07A2A));
      expect(VoltiColors.statusColor(VehicleStatus.paused), const Color(0xFFFBC531));
      expect(VoltiColors.statusColor(VehicleStatus.blocked), const Color(0xFFE04E42));
      expect(VoltiColors.statusColor(VehicleStatus.maintenance), const Color(0xFF8B7CF6));
      expect(VoltiColors.statusColor(VehicleStatus.offline), const Color(0xFF9AA0A6));
    });

    testWidgets('tique segue a bateria e selected aumenta', (t) async {
      await t.pumpWidget(_wrap(const VehicleMarker(VehicleStatus.free, 15, selected: true)));
      await t.pumpAndSettle();
      final tick = t.widget<Container>(find.byKey(const Key('vehicle-marker-battery')));
      expect((tick.decoration! as BoxDecoration).color, VoltiColors.batteryLow);
      expect(t.getSize(find.byKey(const Key('vehicle-marker-body'))).width, 44);
    });
  });

  group('VoltiButton', () {
    for (final v in VoltiButtonVariant.values) {
      testWidgets('renderiza ${v.name} e dispara onPressed', (t) async {
        var taps = 0;
        await t.pumpWidget(_wrap(VoltiButton(label: 'Entrar', variant: v, onPressed: () => taps++)));
        expect(find.text('Entrar'), findsOneWidget);
        await t.tap(find.text('Entrar'));
        expect(taps, 1);
      });
    }

    testWidgets('desabilitado nao dispara', (t) async {
      var taps = 0;
      await t.pumpWidget(_wrap(const VoltiButton(label: 'Encerrar')));
      await t.tap(find.text('Encerrar'));
      expect(taps, 0);
    });

    testWidgets('altura por tamanho', (t) async {
      await t.pumpWidget(_wrap(VoltiButton(label: 'x', size: VoltiButtonSize.lg, onPressed: () {})));
      expect(t.getSize(find.byType(Container).first).height, 56);
    });
  });

  group('OtpInput', () {
    testWidgets('aceita 6 digitos e ignora o resto', (t) async {
      String? last;
      await t.pumpWidget(_wrap(OtpInput(onChanged: (v) => last = v)));
      await t.enterText(find.byKey(const Key('otp-field')), '12ab3456789');
      await t.pump();
      expect(last, '123456');
      for (var i = 0; i < 6; i++) {
        expect(find.descendant(of: find.byKey(Key('otp-box-$i')), matching: find.text('${i + 1}')),
            findsOneWidget);
      }
    });
  });

  testWidgets('OptionCard alterna selecao via onTap', (t) async {
    var taps = 0;
    await t.pumpWidget(_wrap(OptionCard(title: 'Básico', badge: 'Obrigatório', selected: true, onTap: () => taps++)));
    await t.tap(find.text('Básico'));
    expect(taps, 1);
    expect(find.text('Obrigatório'), findsOneWidget);
  });

  testWidgets('ReservationBanner formata mm : ss', (t) async {
    await t.pumpWidget(_wrap(const ReservationBanner(seconds: 383)));
    expect(find.textContaining('06 : 23'), findsOneWidget);
  });

  testWidgets('SwipeAction completa depois de 85%', (t) async {
    var done = 0;
    await t.pumpWidget(_wrap(SizedBox(width: 300, child: SwipeAction(onComplete: () => done++))));
    await t.drag(find.byKey(const Key('swipe-knob')), const Offset(280, 0));
    await t.pump(const Duration(milliseconds: 500));
    expect(done, 1);
  });

  testWidgets('ProgressSteps pinta ate a etapa atual', (t) async {
    await t.pumpWidget(_wrap(const ProgressSteps(total: 3, current: 1, label: 'Passo 2 de 3')));
    Color col(int i) => ((t.widget<AnimatedContainer>(find.byKey(Key('progress-step-$i'))).decoration!) as BoxDecoration).color!;
    expect(col(0), VoltiColors.brand);
    expect(col(1), VoltiColors.brand);
    expect(col(2), isNot(VoltiColors.brand));
  });

  testWidgets('Toast, ListRow, PhotoCapture, FleetStatusBadge, RouteInfoPill renderizam', (t) async {
    await t.pumpWidget(_wrap(Column(mainAxisSize: MainAxisSize.min, children: [
      const VoltiToast(message: 'Moto travada', actionLabel: 'Desfazer'),
      const ListRow(title: 'Pagamento', subtitle: 'Cartão final 4242', value: 'Visa'),
      const PhotoCapture(hint: 'Enquadre a moto'),
      const FleetStatusBadge(VehicleStatus.blocked, count: 3),
      const RouteInfoPill(minutes: 5, distance: '310 m'),
      VoltiIconButton(icon: Icons.add, dot: true, onPressed: () {}),
    ])));
    expect(find.text('Moto travada'), findsOneWidget);
    expect(find.text('Bloqueada'), findsOneWidget);
    expect(find.text('310 m'), findsOneWidget);
    expect(find.text('Tirar foto'), findsOneWidget);
  });

  testWidgets('Dialog e BottomSheet abrem', (t) async {
    await t.pumpWidget(MaterialApp(
      theme: VoltiTheme.light(),
      home: Builder(
        builder: (ctx) => Scaffold(
          body: Column(children: [
            TextButton(
                onPressed: () => VoltiDialog.show<void>(ctx,
                    title: 'Você está bem?', actions: [VoltiButton(label: 'Estou bem', onPressed: () => Navigator.pop(ctx))]),
                child: const Text('d')),
            TextButton(
                onPressed: () => VoltiBottomSheet.show<void>(ctx, builder: (_) => const Text('sheet')),
                child: const Text('s')),
          ]),
        ),
      ),
    ));
    await t.tap(find.text('d'));
    await t.pumpAndSettle();
    expect(find.text('Você está bem?'), findsOneWidget);
    await t.tap(find.text('Estou bem'));
    await t.pumpAndSettle();
    await t.tap(find.text('s'));
    await t.pumpAndSettle();
    expect(find.text('sheet'), findsOneWidget);
  });

  group('VoltiTheme', () {
    test('light e dark constroem', () {
      final l = VoltiTheme.light();
      final d = VoltiTheme.dark();
      expect(l.brightness, Brightness.light);
      expect(d.brightness, Brightness.dark);
      expect(l.colorScheme.primary, VoltiColors.green500);
      expect(d.colorScheme.primary, VoltiColors.green500);
      expect(l.textTheme.bodyMedium!.fontFamily, 'packages/volti_flutter/Plus Jakarta Sans');
    });

    testWidgets('widgets renderizam no tema escuro', (t) async {
      await t.pumpWidget(_wrap(const OptionCard(title: 'Seguro'), theme: VoltiTheme.dark()));
      expect(find.text('Seguro'), findsOneWidget);
    });
  });
}
