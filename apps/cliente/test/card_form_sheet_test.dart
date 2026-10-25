// Formulario de cartao: validacao, campos sem autocorrecao e erro do gateway em pt-BR.

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/core/mercadopago_gateway.dart';
import 'package:volti_cliente/features/payments/card_form_sheet.dart';
import 'package:volti_cliente/l10n/app_localizations.dart';
import 'package:volti_flutter/volti_flutter.dart';

Future<void> _open(WidgetTester t, Future<String> Function(CardData) submit, {void Function(String?)? onResult}) async {
  await t.binding.setSurfaceSize(const Size(420, 1000));
  addTearDown(() => t.binding.setSurfaceSize(null));
  await t.pumpWidget(MaterialApp(
    theme: VoltiTheme.light(),
    localizationsDelegates: const [AppLocalizations.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    supportedLocales: const [Locale('pt')],
    locale: const Locale('pt'),
    home: Builder(
      builder: (ctx) => Scaffold(
        body: TextButton(onPressed: () async {
            final r = await CardFormSheet.show(ctx, submit: submit);
            onResult?.call(r);
          }, child: const Text('abrir')),
      ),
    ),
  ));
  await t.tap(find.text('abrir'));
  await t.pumpAndSettle();
}

Future<void> _fill(WidgetTester t, {String number = '4235647728025682', String cpf = '52998224725'}) async {
  final f = find.byType(TextField);
  await t.enterText(f.at(0), number);
  await t.enterText(f.at(1), 'APRO TESTE');
  await t.enterText(f.at(2), '1130');
  await t.enterText(f.at(3), '123');
  await t.enterText(f.at(4), cpf);
  await t.pump();
}

void main() {
  testWidgets('campos de cartao sem autocorrecao/sugestao e com autofillHints', (t) async {
    await _open(t, (_) async => 'tok');
    final fields = t.widgetList<TextField>(find.byType(TextField)).toList();
    expect(fields, hasLength(5));
    for (final f in fields) {
      expect(f.autocorrect, isFalse);
      expect(f.enableSuggestions, isFalse);
    }
    expect(fields[0].autofillHints, contains(AutofillHints.creditCardNumber));
    expect(fields[1].autofillHints, contains(AutofillHints.creditCardName));
    expect(fields[2].autofillHints, contains(AutofillHints.creditCardExpirationDate));
    expect(fields[3].autofillHints, contains(AutofillHints.creditCardSecurityCode));
    expect(fields[3].obscureText, isTrue);
  });

  testWidgets('Salvar so habilita com tudo valido; envia dados e fecha com o token', (t) async {
    CardData? sent;
    String? result;
    await _open(t, (c) async {
      sent = c;
      return 'tok_xyz12345';
    }, onResult: (r) => result = r);
    VoltiButton btn() => t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Salvar cartão'));
    expect(btn().onPressed, isNull);
    await _fill(t, number: '4235647728025683'); // Luhn invalido
    expect(btn().onPressed, isNull);
    await _fill(t);
    expect(btn().onPressed, isNotNull);
    await t.tap(find.text('Salvar cartão'));
    await t.pumpAndSettle();
    expect(sent!.number.replaceAll(' ', ''), '4235647728025682');
    expect(sent!.expMonth, 11);
    expect(sent!.expYear, 2030);
    expect(result, 'tok_xyz12345');
    expect(find.byType(CardFormSheet), findsNothing);
  });

  testWidgets('erro do gateway aparece em pt-BR e permite tentar de novo', (t) async {
    var calls = 0;
    await _open(t, (_) async {
      calls++;
      if (calls == 1) throw const CardTokenException(CardTokenError.invalidCvv);
      return 'tok_ok123456';
    });
    await _fill(t);
    await t.tap(find.text('Salvar cartão'));
    await t.pumpAndSettle();
    expect(find.text('CVV inválido. Confira o código de segurança.'), findsOneWidget);
    expect(find.byType(CardFormSheet), findsOneWidget);
    await t.tap(find.text('Salvar cartão'));
    await t.pumpAndSettle();
    expect(find.byType(CardFormSheet), findsNothing);
    expect(calls, 2);
  });

  testWidgets('texto a 200%: validade e CVV empilhados, sem estourar', (t) async {
    await t.pumpWidget(MediaQuery(
      data: const MediaQueryData(textScaler: TextScaler.linear(2.0), size: Size(420, 1400)),
      child: MaterialApp(
        theme: VoltiTheme.light(),
        localizationsDelegates: const [AppLocalizations.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
        supportedLocales: const [Locale('pt')],
        locale: const Locale('pt'),
        home: Scaffold(body: CardFormSheet(submit: (_) async => 'tok')),
      ),
    ));
    await t.pump();
    final exp = t.getTopLeft(find.byType(TextField).at(2));
    final cvv = t.getTopLeft(find.byType(TextField).at(3));
    expect(cvv.dy, greaterThan(exp.dy));
    expect(cvv.dx, exp.dx);
  });

  // Q-07: mensagens de erro dos campos nao terminam em reticencias.
  for (final scale in [1.0, 2.0]) {
    testWidgets('erros de validade e numero inteiros, sem reticencias a ${(scale * 100).round()}%', (t) async {
      await t.pumpWidget(MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(scale), size: const Size(420, 1800)),
        child: MaterialApp(
          theme: VoltiTheme.light(),
          localizationsDelegates: const [AppLocalizations.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
          supportedLocales: const [Locale('pt')],
          locale: const Locale('pt'),
          home: Scaffold(body: SingleChildScrollView(child: CardFormSheet(submit: (_) async => 'tok'))),
        ),
      ));
      await t.pump();
      await t.enterText(find.byType(TextField).at(0), '4235647728025683'); // Luhn invalido
      await t.enterText(find.byType(TextField).at(2), '0120'); // vencida
      await t.pump();
      for (final msg in ['Número de cartão inválido. Confira os dígitos.', 'Data inválida']) {
        final text = find.text(msg);
        expect(text, findsOneWidget, reason: msg);
        expect(t.renderObject<RenderParagraph>(text).didExceedMaxLines, isFalse, reason: msg);
      }
      for (final f in t.widgetList<TextField>(find.byType(TextField))) {
        if (f.decoration?.errorText != null) expect(f.decoration!.errorMaxLines, 3);
      }
      expect(t.takeException(), isNull);
    });
  }

  test('cada erro tem texto em pt-BR', () async {
    final l = await AppLocalizations.delegate.load(const Locale('pt'));
    for (final e in CardTokenError.values) {
      expect(cardTokenErrorText(l, e), isNotEmpty);
    }
  });
}
