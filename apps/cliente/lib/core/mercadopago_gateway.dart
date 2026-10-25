import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// Por que a tokenizacao do cartao falhou. Sem texto: a UI traduz (pt-BR).
enum CardTokenError { invalidCard, invalidCvv, invalidExpiry, invalidHolder, invalidDocument, network, timeout, unavailable, unknown }

/// Falha ao tokenizar. Nunca carrega numero, CVV, token nem a resposta do gateway.
class CardTokenException implements Exception {
  const CardTokenException(this.error);
  final CardTokenError error;

  @override
  String toString() => 'CardTokenException($error)';
}

/// Dados digitados pelo cliente. Vivem so na memoria, ate o envio ao Mercado Pago.
class CardData {
  const CardData({
    required this.number,
    required this.expMonth,
    required this.expYear,
    required this.cvv,
    required this.holderName,
    required this.cpf,
  });

  final String number;
  final int expMonth;

  /// Quatro digitos (ex.: 2030).
  final int expYear;
  final String cvv;
  final String holderName;
  final String cpf;

  /// Nunca imprime os dados do cartao.
  @override
  String toString() => 'CardData(***)';
}

/// Algoritmo de Luhn sobre os digitos de [number] (13 a 19).
bool isValidCardNumber(String number) {
  final d = number.replaceAll(RegExp(r'\D'), '');
  if (d.length < 13 || d.length > 19) return false;
  var sum = 0;
  for (var i = 0; i < d.length; i++) {
    var n = int.parse(d[d.length - 1 - i]);
    if (i.isOdd) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 == 0;
}

/// Cartao ainda dentro da validade (vale ate o fim do mes de [month]/[year]).
bool isCardExpiryValid(int month, int year, {DateTime? now}) {
  if (month < 1 || month > 12) return false;
  final n = now ?? DateTime.now();
  return year > n.year || (year == n.year && month >= n.month);
}

/// Cliente minimo do Mercado Pago so para criar o token do cartao
/// (`POST /v1/card_tokens`, autenticado pela chave PUBLICA). Os dados do cartao
/// vao direto ao gateway; a API da Volti recebe so o token.
class MercadoPagoGateway {
  MercadoPagoGateway({
    required this.publicKey,
    http.Client? client,
    this.timeout = const Duration(seconds: 15),
    this.baseUrl = 'https://api.mercadopago.com',
  }) : _client = client ?? http.Client();

  final String publicKey;
  final Duration timeout;
  final String baseUrl;
  final http.Client _client;

  /// Devolve o token do cartao (uso unico, vale poucos minutos).
  Future<String> createToken(CardData card) async {
    final http.Response res;
    try {
      res = await _client
          .post(
            Uri.parse('$baseUrl/v1/card_tokens').replace(queryParameters: {'public_key': publicKey}),
            headers: const {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: jsonEncode({
              'card_number': card.number.replaceAll(RegExp(r'\D'), ''),
              'expiration_month': card.expMonth,
              'expiration_year': card.expYear,
              'security_code': card.cvv,
              'cardholder': {
                'name': card.holderName.trim(),
                'identification': {'type': 'CPF', 'number': card.cpf.replaceAll(RegExp(r'\D'), '')},
              },
            }),
          )
          .timeout(timeout);
    } on TimeoutException {
      throw const CardTokenException(CardTokenError.timeout);
    } on Exception {
      // Sem rede / DNS / TLS. Nao propaga o erro original: pode citar a URL com a chave.
      throw const CardTokenException(CardTokenError.network);
    }
    if (res.statusCode >= 200 && res.statusCode < 300) {
      final id = _decode(res.body)['id'];
      if (id is String && id.isNotEmpty) return id;
      throw const CardTokenException(CardTokenError.unknown);
    }
    throw CardTokenException(mapError(res.statusCode, res.body));
  }

  /// `cause[].code` do Mercado Pago (card_tokens) → erro de dominio.
  static CardTokenError mapError(int status, String body) {
    if (status >= 500 || status == 429) return CardTokenError.unavailable;
    // 401/403: chave publica invalida, erro de configuracao (nada que o cliente corrija).
    if (status == 401 || status == 403) return CardTokenError.unknown;
    final causes = _decode(body)['cause'];
    if (causes is List) {
      for (final c in causes) {
        final code = c is Map ? c['code']?.toString() : null;
        final e = _byCode[code];
        if (e != null) return e;
      }
    }
    return CardTokenError.unknown;
  }

  static const _byCode = <String, CardTokenError>{
    '205': CardTokenError.invalidCard,
    'E301': CardTokenError.invalidCard,
    '224': CardTokenError.invalidCvv,
    'E302': CardTokenError.invalidCvv,
    '208': CardTokenError.invalidExpiry,
    '209': CardTokenError.invalidExpiry,
    '325': CardTokenError.invalidExpiry,
    '326': CardTokenError.invalidExpiry,
    '221': CardTokenError.invalidHolder,
    '316': CardTokenError.invalidHolder,
    '212': CardTokenError.invalidDocument,
    '213': CardTokenError.invalidDocument,
    '214': CardTokenError.invalidDocument,
    '322': CardTokenError.invalidDocument,
    '323': CardTokenError.invalidDocument,
    '324': CardTokenError.invalidDocument,
  };

  static Map<String, dynamic> _decode(String body) {
    try {
      final v = jsonDecode(body);
      return v is Map<String, dynamic> ? v : const {};
    } catch (_) {
      return const {};
    }
  }

  void close() => _client.close();
}
