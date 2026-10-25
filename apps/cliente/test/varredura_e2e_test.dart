import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/features/account/account_screens.dart';

import 'helpers.dart';

/// Task 30 (varredura E2E na AWS dev): cartao padrao (item 12) e exclusao de conta bloqueada (item 36).

PaymentCard _card(String id, {String brand = 'visa', String last4 = '4242', bool isDefault = false}) => PaymentCard((b) => b
  ..id = id
  ..brand = brand
  ..last4 = last4
  ..expMonth = 3
  ..expYear = 2031
  ..isDefault = isDefault
  ..createdAt = DateTime.utc(2026, 10, 1));

class _CardsBackend extends FakeBackend {
  _CardsBackend(this.list);
  List<PaymentCard> list;
  final defaults = <String>[];
  final deleted = <String>[];
  int added = 0;
  AppFailure? deleteError;

  @override
  Future<List<PaymentCard>> cards() async => list;

  @override
  Future<PaymentCard> setDefaultCard(String id) async {
    defaults.add(id);
    list = [for (final c in list) c.rebuild((b) => b.isDefault = c.id == id)];
    return list.firstWhere((c) => c.id == id);
  }

  @override
  Future<void> deleteCard(String id) async {
    if (deleteError != null) throw deleteError!;
    deleted.add(id);
    final wasDefault = list.firstWhere((c) => c.id == id).isDefault;
    list = list.where((c) => c.id != id).toList();
    if (wasDefault && list.isNotEmpty) list = [for (final c in list) c.rebuild((b) => b.isDefault = c.id == list.last.id)];
  }

  @override
  Future<PaymentCard> addCard(String token) async {
    added++;
    final c = _card('novo', brand: 'master', last4: '5555', isDefault: true);
    list = [for (final x in list) x.rebuild((b) => b.isDefault = false), c];
    return c;
  }
}

class _Tokenizer implements CardTokenizer {
  @override
  Future<String?> tokenize(BuildContext context) async => 'tok_visa_4242';
}

Future<_CardsBackend> _pumpCards(WidgetTester t, List<PaymentCard> cards) async {
  tallScreen(t);
  final backend = _CardsBackend(cards);
  await t.pumpWidget(testApp(const CardsScreen(), overrides: [
    backendProvider.overrideWithValue(backend),
    cardTokenizerProvider.overrideWithValue(_Tokenizer()),
  ]));
  await t.pumpAndSettle();
  return backend;
}

void main() {
  group('Cartões (item 12)', () {
    testWidgets('mostra o padrão e troca o padrão pelo PUT', (t) async {
      final b = await _pumpCards(t, [_card('a', isDefault: true), _card('b', brand: 'master', last4: '5555')]);
      expect(find.text('Visa •••• 4242'), findsOneWidget);
      expect(find.text('Master •••• 5555'), findsOneWidget);
      expect(find.byKey(const Key('card-default-a')), findsOneWidget);
      expect(find.byKey(const Key('card-default-b')), findsNothing);
      expect(find.byKey(const Key('card-make-default-a')), findsNothing);

      await t.tap(find.byKey(const Key('card-make-default-b')));
      await t.pumpAndSettle();
      expect(b.defaults, ['b']);
      expect(find.byKey(const Key('card-default-b')), findsOneWidget);
      expect(find.byKey(const Key('card-default-a')), findsNothing);
      expect(find.text('Cartão padrão atualizado.'), findsOneWidget);
    });

    testWidgets('remove com confirmação; o mais recente vira o padrão', (t) async {
      final b = await _pumpCards(t, [_card('a', isDefault: true), _card('b', brand: 'master', last4: '5555')]);
      await t.tap(find.byKey(const Key('card-remove-a')));
      await t.pumpAndSettle();
      expect(find.text('Remover este cartão?'), findsOneWidget);
      await t.tap(find.byKey(const Key('cards-remove-confirm')));
      await t.pumpAndSettle();
      expect(b.deleted, ['a']);
      expect(find.text('Visa •••• 4242'), findsNothing);
      expect(find.byKey(const Key('card-default-b')), findsOneWidget);
    });

    testWidgets('remoção recusada (409) mostra a mensagem da API e mantém o cartão', (t) async {
      final b = await _pumpCards(t, [_card('a', isDefault: true)]);
      b.deleteError = AppFailure(kind: FailureKind.api, status: 409, slug: 'conflict', detail: 'Este cartão tem caução retida ou assinatura ativa.');
      await t.tap(find.byKey(const Key('card-remove-a')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('cards-remove-confirm')));
      await t.pumpAndSettle();
      expect(find.text('Este cartão tem caução retida ou assinatura ativa.'), findsOneWidget);
      expect(find.text('Visa •••• 4242'), findsOneWidget);
    });

    testWidgets('sem cartão: aviso e adicionar pelo tokenizador', (t) async {
      final b = await _pumpCards(t, []);
      expect(find.byKey(const Key('cards-empty')), findsOneWidget);
      await t.tap(find.byKey(const Key('cards-add')));
      await t.pumpAndSettle();
      expect(b.added, 1);
      expect(find.text('Master •••• 5555'), findsOneWidget);
      expect(find.byKey(const Key('card-default-novo')), findsOneWidget);
    });
  });

  group('Exclusão de conta bloqueada (item 36)', () {
    testWidgets('409 account-deletion-blocked abre um diálogo com o que fazer (texto da API)', (t) async {
      final backend = _DeleteBackend();
      await t.pumpWidget(testApp(
        Consumer(builder: (context, ref, _) => Scaffold(body: TextButton(onPressed: () => confirmDeleteAccount(context, ref), child: const Text('excluir')))),
        overrides: [backendProvider.overrideWithValue(backend)],
      ));
      await t.tap(find.text('excluir'));
      await t.pumpAndSettle();
      await t.tap(find.text('Excluir conta').last);
      await t.pumpAndSettle();
      expect(backend.calls, 1);
      expect(find.text('Não dá para excluir a conta agora'), findsOneWidget);
      expect(find.byKey(const Key('delete-account-blocked')), findsOneWidget);
      expect(find.text('Você tem uma reserva de moto em aberto. Cancele a reserva no app antes de excluir a conta.'), findsOneWidget);
    });
  });
}

class _DeleteBackend extends FakeBackend {
  int calls = 0;
  @override
  Future<AccountDeletion> deleteAccount() async {
    calls++;
    throw AppFailure(
      kind: FailureKind.api,
      status: 409,
      slug: 'account-deletion-blocked',
      detail: 'Você tem uma reserva de moto em aberto. Cancele a reserva no app antes de excluir a conta.',
    );
  }
}
