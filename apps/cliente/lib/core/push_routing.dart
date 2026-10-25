/// Mensagem push ja reduzida ao que o app usa (titulo, texto e `data` da API).
class PushPayload {
  const PushPayload({this.title, this.body, this.data = const {}});
  final String? title;
  final String? body;
  final Map<String, String> data;
}

final _safeId = RegExp(r'^[A-Za-z0-9_-]{1,64}$');

String? _id(Map<String, String> data, String key) {
  final v = data[key];
  return v != null && _safeId.hasMatch(v) ? v : null;
}

/// Rota do app para o toque numa notificacao. O tipo vem em `type` (ex.:
/// `reservation.reminder`) ou `kind` (ex.: `kyc`); ids invalidos ou tipos
/// desconhecidos levam ao inicio (`/home`), nunca a um caminho montado com texto livre.
String routeForPush(Map<String, String> data) {
  final type = data['type'] ?? data['kind'] ?? '';
  switch (type) {
    case 'reservation.reminder':
    case 'reservation.updated':
    case 'reservation':
      final id = _id(data, 'reservationId');
      return id == null ? '/home' : '/reservation/$id';
    case 'handover.pending':
    case 'handover.updated':
    case 'handover':
      final handover = _id(data, 'handoverId');
      if (handover != null) return '/handover/$handover';
      final reservation = _id(data, 'reservationId');
      return reservation == null ? '/home' : '/reservation/$reservation';
    case 'rental.updated':
    case 'rental':
    case 'ride':
      return '/ride';
    case 'swap.updated':
    case 'swap':
    case 'station_swap':
      final station = _id(data, 'stationId');
      final swap = _id(data, 'swapId');
      return station == null || swap == null ? '/home' : '/station-swap/$station/$swap';
    case 'receipt':
    case 'rental.receipt':
    case 'rental.finished':
      final rental = _id(data, 'rentalId');
      return rental == null ? '/home' : '/summary/$rental';
    case 'kyc':
      return '/account/verification';
    default:
      return '/home';
  }
}
