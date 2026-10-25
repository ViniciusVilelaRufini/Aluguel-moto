// Tokenizacao do cartao no Mercado Pago: cliente HTTP falso, sem rede real.

import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:volti_cliente/core/mercadopago_gateway.dart';
import 'package:volti_cliente/core/services.dart';

const _card = CardData(number: '4235 6477 2802 5682', expMonth: 11, expYear: 2030, cvv: '123', holderName: ' APRO TESTE ', cpf: '529.982.247-25');

MercadoPagoGateway _gw(MockClient c, {Duration timeout = const Duration(seconds: 5)}) =>
    MercadoPagoGateway(publicKey: 'TEST-pub', client: c, timeout: timeout);

http.Response _err(int status, String code) =>
    http.Response(jsonEncode({'message': 'x', 'error': 'bad_request', 'status': status, 'cause': [{'code': code, 'description': 'x'}]}), status);

void main() {
  group('MercadoPagoGateway.createToken', () {
    test('envia o cartao ao Mercado Pago com a chave publica e devolve so o token', () async {
      late http.Request seen;
      final gw = _gw(MockClient((req) async {
        seen = req;
        return http.Response(jsonEncode({'id': 'tok_abc123456', 'last_four_digits': '5682', 'first_six_digits': '423564'}), 201);
      }));
      expect(await gw.createToken(_card), 'tok_abc123456');
      expect(seen.method, 'POST');
      expect(seen.url.origin, 'https://api.mercadopago.com');
      expect(seen.url.path, '/v1/card_tokens');
      expect(seen.url.queryParameters, {'public_key': 'TEST-pub'});
      expect(seen.headers.containsKey('Authorization'), isFalse);
      final body = jsonDecode(seen.body) as Map<String, dynamic>;
      expect(body['card_number'], '4235647728025682');
      expect(body['expiration_month'], 11);
      expect(body['expiration_year'], 2030);
      expect(body['security_code'], '123');
      expect(body['cardholder'], {
        'name': 'APRO TESTE',
        'identification': {'type': 'CPF', 'number': '52998224725'},
      });
    });

    test('resposta de sucesso sem id vira erro desconhecido', () async {
      final gw = _gw(MockClient((_) async => http.Response('{}', 201)));
      await expectLater(gw.createToken(_card), throwsA(isA<CardTokenException>().having((e) => e.error, 'error', CardTokenError.unknown)));
    });

    final cases = <String, (http.Response, CardTokenError)>{
      'numero invalido (E301)': (_err(400, 'E301'), CardTokenError.invalidCard),
      'CVV invalido (E302)': (_err(400, 'E302'), CardTokenError.invalidCvv),
      'CVV ausente (224)': (_err(400, '224'), CardTokenError.invalidCvv),
      'mes invalido (325)': (_err(400, '325'), CardTokenError.invalidExpiry),
      'ano invalido (326)': (_err(400, '326'), CardTokenError.invalidExpiry),
      'titular invalido (316)': (_err(400, '316'), CardTokenError.invalidHolder),
      'CPF invalido (324)': (_err(400, '324'), CardTokenError.invalidDocument),
      'codigo desconhecido': (_err(400, '9999'), CardTokenError.unknown),
      'chave publica recusada': (http.Response('{"message":"invalid"}', 401), CardTokenError.unknown),
      'gateway fora (503)': (http.Response('oops', 503), CardTokenError.unavailable),
      'limite de taxa (429)': (http.Response('{}', 429), CardTokenError.unavailable),
      'corpo nao JSON': (http.Response('<html>', 400), CardTokenError.unknown),
    };
    cases.forEach((name, c) {
      test('erro do MP: $name', () async {
        final gw = _gw(MockClient((_) async => c.$1));
        await expectLater(gw.createToken(_card), throwsA(isA<CardTokenException>().having((e) => e.error, 'error', c.$2)));
      });
    });

    test('falha de rede', () async {
      final gw = _gw(MockClient((_) async => throw http.ClientException('sem rede https://x?public_key=TEST-pub')));
      await expectLater(gw.createToken(_card), throwsA(isA<CardTokenException>().having((e) => e.error, 'error', CardTokenError.network)));
    });

    test('timeout', () async {
      final gw = _gw(MockClient((_) => Completer<http.Response>().future), timeout: const Duration(milliseconds: 20));
      await expectLater(gw.createToken(_card), throwsA(isA<CardTokenException>().having((e) => e.error, 'error', CardTokenError.timeout)));
    });

    test('excecao e CardData nao expõem dados do cartao', () {
      expect(_card.toString(), isNot(contains('4235')));
      expect(_card.toString(), isNot(contains('123')));
      expect(const CardTokenException(CardTokenError.invalidCard).toString(), isNot(contains('4235')));
    });
  });

  group('validacoes locais', () {
    test('Luhn', () {
      expect(isValidCardNumber('4235 6477 2802 5682'), isTrue);
      expect(isValidCardNumber('4235 6477 2802 5683'), isFalse);
      expect(isValidCardNumber('1234'), isFalse);
    });

    test('validade', () {
      final now = DateTime(2026, 10, 24);
      expect(isCardExpiryValid(10, 2026, now: now), isTrue);
      expect(isCardExpiryValid(9, 2026, now: now), isFalse);
      expect(isCardExpiryValid(1, 2027, now: now), isTrue);
      expect(isCardExpiryValid(13, 2030, now: now), isFalse);
    });
  });

  group('selecao do tokenizador por ambiente', () {
    test('com MP_PUBLIC_KEY usa o Mercado Pago (debug e release)', () {
      expect(selectCardTokenizer(publicKey: 'TEST-pub', isRelease: false), isA<MercadoPagoCardTokenizer>());
      expect(selectCardTokenizer(publicKey: ' TEST-pub ', isRelease: true), isA<MercadoPagoCardTokenizer>());
    });

    test('sem chave em debug/profile usa o tokenizador de desenvolvimento', () {
      expect(selectCardTokenizer(publicKey: '', isRelease: false), isA<DevCardTokenizer>());
    });

    test('sem chave em release falha alto, nunca usa token falso', () {
      expect(() => selectCardTokenizer(publicKey: '  ', isRelease: true), throwsStateError);
    });

    test('o provider padrao dos testes (sem define) e o de desenvolvimento', () {
      final c = ProviderContainer();
      addTearDown(c.dispose);
      expect(c.read(cardTokenizerProvider), isA<DevCardTokenizer>());
    });
  });
}
