import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _months = {
  'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, //
  'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
};
final _imfFixdate = RegExp(r'^\w{3}, (\d{2}) (\w{3}) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$');

/// Le o cabecalho HTTP `Date` (IMF-fixdate, RFC 9110: `Thu, 22 Oct 2026 12:00:00 GMT`).
/// Devolve `null` para qualquer outro formato.
DateTime? parseHttpDate(String? value) {
  final m = value == null ? null : _imfFixdate.firstMatch(value.trim());
  final month = m == null ? null : _months[m.group(2)];
  if (m == null || month == null) return null;
  int g(int i) => int.parse(m.group(i)!);
  return DateTime.utc(g(3), month, g(1), g(4), g(5), g(6));
}

/// Relogio do aparelho corrigido pela hora do servidor.
///
/// O relogio do celular pode estar adiantado ou atrasado (no emulador estava
/// 70 s atras), e as contagens regressivas (reserva, Pix) comparam com datas
/// do servidor. Cada resposta da API traz `Date`; a diferenca vira [offset].
class ServerClock {
  ServerClock({DateTime Function()? localNow}) : _localNow = localNow ?? DateTime.now;

  final DateTime Function() _localNow;

  /// Hora do servidor menos a hora do aparelho.
  Duration offset = Duration.zero;

  /// Agora em UTC, no relogio do servidor.
  DateTime now() => _localNow().toUtc().add(offset);

  /// Registra o `Date` de uma resposta. O cabecalho tem resolucao de 1 s:
  /// usa o meio do segundo e ignora diferencas menores que 1 s (sem tremer).
  void observe(String? dateHeader) {
    final server = parseHttpDate(dateHeader);
    if (server == null) return;
    final diff = server.add(const Duration(milliseconds: 500)).difference(_localNow().toUtc());
    offset = diff.abs() < const Duration(seconds: 1) ? Duration.zero : diff;
  }
}

/// Alimenta o [ServerClock] com o `Date` de todas as respostas (inclusive erros HTTP).
class ServerClockInterceptor extends Interceptor {
  ServerClockInterceptor(this.clock);
  final ServerClock clock;

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    clock.observe(response.headers.value('date'));
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final r = err.response;
    if (r != null) clock.observe(r.headers.value('date'));
    handler.next(err);
  }
}

/// Relogio do servidor compartilhado pelo app (o cliente da API o alimenta).
final serverClockProvider = Provider<ServerClock>((ref) => ServerClock());
