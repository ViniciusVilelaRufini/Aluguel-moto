// Gera os PNGs de marca (wordmark e icone) a partir da fonte Plus Jakarta Sans 800.
// Uso: flutter test tool/gen_branding.dart
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

const green = Color(0xFF34C25C);

Future<void> save(WidgetTester t, Widget w, Size size, String path) async {
  final key = GlobalKey();
  await t.pumpWidget(Directionality(
    textDirection: TextDirection.ltr,
    child: Center(child: RepaintBoundary(key: key, child: SizedBox.fromSize(size: size, child: w))),
  ));
  await t.runAsync(() async {
    final boundary = key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final image = await boundary.toImage(pixelRatio: 1);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    File(path).writeAsBytesSync(data!.buffer.asUint8List());
  });
}

Widget word(double size, Color color) => Center(
      child: Text('volti',
          style: TextStyle(
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: FontWeight.w800,
              fontSize: size,
              letterSpacing: -size * 0.04,
              color: color)),
    );

void main() {
  testWidgets('gera branding', (t) async {
    t.view.physicalSize = const Size(2048, 2048);
    t.view.devicePixelRatio = 1;
    final loader = FontLoader('Plus Jakarta Sans')
      ..addFont(Future.value(ByteData.sublistView(File('assets/fonts/PlusJakartaSans-800.ttf').readAsBytesSync())));
    await t.runAsync(loader.load);
    await save(t, word(300, green), const Size(1000, 400), 'assets/branding/wordmark.png');
    await save(t, ColoredBox(color: green, child: word(420, Colors.white)), const Size(1024, 1024),
        'assets/branding/icon.png');
    // Primeiro plano do icone adaptativo: wordmark menor, dentro da zona segura.
    await save(t, word(250, Colors.white), const Size(1024, 1024), 'assets/branding/icon_foreground.png');
  });
}
