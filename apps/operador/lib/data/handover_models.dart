import 'package:volti_api/volti_api.dart';

const Object _unset = Object();

/// Itens do checklist de saida (codigos enviados em `HandoverChecklistItem.code`).
const pickupChecklistCodes = ['freios', 'luzes', 'pneus', 'buzina', 'painel', 'carenagem'];

/// Checklist curto de chegada (devolucao no galpao e recolhimento da rua).
const arrivalChecklistCodes = ['freios', 'pneus', 'luzes', 'carenagem'];

/// Fotos obrigatorias da saida: frente, tras e os dois lados.
enum PhotoAngle { front, back, left, right }

/// Limite de fotos por entrega (contrato: `photoKeys` maxItems 12).
const int maxHandoverPhotos = 12;

final _uuid = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
final _sig = RegExp(r'^[A-Za-z0-9_-]+$');
final _digits = RegExp(r'^\d+$');

/// Contrato: `pickupCode` tem de 8 a 256 caracteres. Fora disso o app recusa;
/// qualquer outro conteudo segue para a API, que decide.
bool pickupCodeAcceptable(String raw) {
  final t = raw.trim();
  return t.isNotEmpty && t.length <= 256;
}

/// Codigo do QR da reserva: `v1.<reservationId>.<expEpoch>.<assinatura>`
/// (formato informativo, `docs/decisoes.md`; usado so para avisos).
/// O app so confere o formato; a assinatura e conferida pela API no envio
/// (`POST /handovers` responde `404` para codigo adulterado ou vencido).
class PickupCode {
  const PickupCode(this.raw, this.reservationId, this.expiresAt);

  final String raw;
  final String reservationId;
  final DateTime expiresAt;

  static PickupCode? parse(String input) {
    final raw = input.trim();
    if (raw.length < 8 || raw.length > 256) return null;
    final parts = raw.split('.');
    if (parts.length != 4 || parts[0] != 'v1') return null;
    if (!_uuid.hasMatch(parts[1]) || !_digits.hasMatch(parts[2]) || !_sig.hasMatch(parts[3])) {
      return null;
    }
    final exp = int.tryParse(parts[2]);
    if (exp == null) return null;
    return PickupCode(raw, parts[1].toLowerCase(),
        DateTime.fromMillisecondsSinceEpoch(exp * 1000, isUtc: true));
  }

  bool expiredAt(DateTime now) => !expiresAt.isAfter(now.toUtc());
}

/// So o primeiro nome do cliente (nunca o nome completo).
String firstNameOf(String? name, String fallback) {
  final n = name?.trim() ?? '';
  if (n.isEmpty) return fallback;
  return n.split(RegExp(r'\s+')).first;
}

int? _parsePct(Object? v) => v is int ? v : null;

/// Rascunho do checklist de saida. Fica na memoria enquanto o app esta aberto,
/// inclusive sem rede: o envio precisa do servidor (o cliente aceita na hora).
class PickupDraft {
  const PickupDraft({
    required this.pickupCode,
    this.items = const {},
    this.notes = const {},
    this.batteryPct,
    this.batterySerial = '',
    this.photos = const {},
    this.extraPhotos = const [],
    this.uploadedKeys = const {},
  });

  final String pickupCode;

  /// Codigo do item -> ok (`true`) ou com problema (`false`); ausente = nao respondido.
  final Map<String, bool> items;
  final Map<String, String> notes;
  final int? batteryPct;
  final String batterySerial;
  final Map<PhotoAngle, String> photos;
  final List<String> extraPhotos;

  /// Caminho local -> `objectKey` ja enviada (nova tentativa nao reenvia).
  final Map<String, String> uploadedKeys;

  int get answered => pickupChecklistCodes.where(items.containsKey).length;
  bool get allAnswered => answered == pickupChecklistCodes.length;
  bool get batteryValid => batteryPct != null && batteryPct! >= 0 && batteryPct! <= 100;
  bool get photosComplete => PhotoAngle.values.every(photos.containsKey);
  bool get canSubmit => allAnswered && batteryValid && photosComplete;

  /// Fotos na ordem de envio: frente, tras, lados e extras.
  List<String> get photoPaths => [
        for (final a in PhotoAngle.values)
          if (photos[a] != null) photos[a]!,
        ...extraPhotos,
      ];

  int get photoCount => photoPaths.length;

  List<HandoverChecklistItem> checklist() => [
        for (final code in pickupChecklistCodes)
          HandoverChecklistItem((b) => b
            ..code = code
            ..ok = items[code] ?? false
            ..note = _note(code)),
      ];

  String? _note(String code) {
    final n = notes[code]?.trim() ?? '';
    return n.isEmpty || items[code] != false ? null : n;
  }

  PickupDraft copyWith({
    Map<String, bool>? items,
    Map<String, String>? notes,
    Object? batteryPct = _unset,
    String? batterySerial,
    Map<PhotoAngle, String>? photos,
    List<String>? extraPhotos,
    Map<String, String>? uploadedKeys,
  }) =>
      PickupDraft(
        pickupCode: pickupCode,
        items: items ?? this.items,
        notes: notes ?? this.notes,
        batteryPct: identical(batteryPct, _unset) ? this.batteryPct : _parsePct(batteryPct),
        batterySerial: batterySerial ?? this.batterySerial,
        photos: photos ?? this.photos,
        extraPhotos: extraPhotos ?? this.extraPhotos,
        uploadedKeys: uploadedKeys ?? this.uploadedKeys,
      );
}

/// Rascunho da chegada no galpao: checklist curto, bateria, fotos e galpao.
class ArrivalDraft {
  const ArrivalDraft({
    this.items = const {},
    this.notes = const {},
    this.batteryPct,
    this.photoPaths = const [],
    this.depotId,
  });

  final Map<String, bool> items;
  final Map<String, String> notes;
  final int? batteryPct;
  final List<String> photoPaths;
  final String? depotId;

  int get answered => arrivalChecklistCodes.where(items.containsKey).length;
  bool get allAnswered => answered == arrivalChecklistCodes.length;
  bool get batteryValid => batteryPct != null && batteryPct! >= 0 && batteryPct! <= 100;

  /// Algum item com problema: a moto vai para manutencao.
  bool get hasProblem => items.values.any((ok) => !ok);

  bool canSubmit({required bool requirePhoto}) =>
      allAnswered && batteryValid && depotId != null && (!requirePhoto || photoPaths.isNotEmpty);

  List<HandoverChecklistItem> checklist() => [
        for (final code in arrivalChecklistCodes)
          HandoverChecklistItem((b) {
            final n = notes[code]?.trim() ?? '';
            b
              ..code = code
              ..ok = items[code] ?? false
              ..note = n.isEmpty || items[code] != false ? null : n;
          }),
      ];

  /// Resumo para as observacoes da conclusao da tarefa `collect`.
  String summary(String Function(String code) label, String batteryLabel) {
    final parts = [
      for (final code in arrivalChecklistCodes)
        '${label(code)}: ${items[code] == true ? 'ok' : 'problema'}'
            '${(notes[code]?.trim().isNotEmpty ?? false) && items[code] == false ? ' (${notes[code]!.trim()})' : ''}',
      '$batteryLabel: ${batteryPct ?? '-'}%',
    ];
    return parts.join('; ');
  }

  ArrivalDraft copyWith({
    Map<String, bool>? items,
    Map<String, String>? notes,
    Object? batteryPct = _unset,
    List<String>? photoPaths,
    Object? depotId = _unset,
  }) =>
      ArrivalDraft(
        items: items ?? this.items,
        notes: notes ?? this.notes,
        batteryPct: identical(batteryPct, _unset) ? this.batteryPct : _parsePct(batteryPct),
        photoPaths: photoPaths ?? this.photoPaths,
        depotId: identical(depotId, _unset) ? this.depotId : depotId as String?,
      );

  Map<String, dynamic> toJson() => {
        'items': items,
        'notes': notes,
        'batteryPct': batteryPct,
        'photoPaths': photoPaths,
        'depotId': depotId,
      };

  factory ArrivalDraft.fromJson(Map<String, dynamic> j) => ArrivalDraft(
        items: Map<String, bool>.from((j['items'] as Map?) ?? const {}),
        notes: Map<String, String>.from((j['notes'] as Map?) ?? const {}),
        batteryPct: j['batteryPct'] as int?,
        photoPaths: ((j['photoPaths'] as List?) ?? const []).cast<String>(),
        depotId: j['depotId'] as String?,
      );
}

/// Chegada de um aluguel no galpao (`return_depot`), enviada pela fila offline.
/// Sem rede, guarda so o codigo da moto; o `rentalId` e resolvido no envio.
class ReturnArrival {
  const ReturnArrival({
    required this.vehicleCode,
    required this.depotId,
    required this.draft,
    this.rentalId,
  });

  final String vehicleCode;
  final String depotId;
  final String? rentalId;
  final ArrivalDraft draft;

  Map<String, dynamic> toJson() => {
        'vehicleCode': vehicleCode,
        'depotId': depotId,
        'rentalId': rentalId,
        'draft': draft.toJson(),
      };

  factory ReturnArrival.fromJson(Map<String, dynamic> j) => ReturnArrival(
        vehicleCode: j['vehicleCode'] as String,
        depotId: j['depotId'] as String,
        rentalId: j['rentalId'] as String?,
        draft: ArrivalDraft.fromJson(Map<String, dynamic>.from(j['draft'] as Map)),
      );
}

/// Ordem da agenda: acionaveis primeiro (ativa, depois em entrega); dentro de
/// cada grupo, "agora" antes e depois por horario.
int _statusRank(ReservationStatus s) => switch (s) {
      ReservationStatus.active => 0,
      ReservationStatus.handover => 1,
      _ => 2,
    };

DateTime _when(Reservation r) => r.pickupAt ?? r.createdAt;

bool isActionablePickup(Reservation r) =>
    r.status == ReservationStatus.active || r.status == ReservationStatus.handover;

List<Reservation> sortPickups(Iterable<Reservation> items) {
  final list = items.toList();
  list.sort((a, b) {
    var c = _statusRank(a.status).compareTo(_statusRank(b.status));
    if (c != 0) return c;
    final ma = a.pickupMode == PickupMode.now ? 0 : 1;
    final mb = b.pickupMode == PickupMode.now ? 0 : 1;
    c = ma.compareTo(mb);
    if (c != 0) return c;
    return _when(a).compareTo(_when(b));
  });
  return list;
}
