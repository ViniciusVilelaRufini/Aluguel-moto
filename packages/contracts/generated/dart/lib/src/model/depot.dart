//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/depot_opening_hours.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'depot.g.dart';

/// Galpão da Volti, onde as motos ficam e são retiradas e devolvidas.
///
/// Properties:
/// * [id]
/// * [name]
/// * [address]
/// * [district] - Bairro mostrado no cartão da home.
/// * [lat]
/// * [lng]
/// * [timezone]
/// * [openingHours] - No máximo um intervalo por dia da semana.
/// * [pickupNowWindowMinutes] - Prazo de \"retirar agora\", a partir da reserva.
/// * [maxScheduleDays] - Quantos dias à frente o cliente pode agendar.
/// * [scheduledGraceMinutes] - Tolerância depois do horário agendado.
/// * [swapStationId] - Estação de troca de bateria do próprio galpão (`GET /swap-stations`).
/// * [active]
/// * [availableVehicleCount] - Motos `free` neste galpão.
/// * [distanceM] - Só com `lat`/`lng` em `GET /depots`.
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class Depot implements Built<Depot, DepotBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'address')
  String get address;

  /// Bairro mostrado no cartão da home.
  @BuiltValueField(wireName: r'district')
  String? get district;

  @BuiltValueField(wireName: r'lat')
  double get lat;

  @BuiltValueField(wireName: r'lng')
  double get lng;

  @BuiltValueField(wireName: r'timezone')
  String get timezone;

  /// No máximo um intervalo por dia da semana.
  @BuiltValueField(wireName: r'openingHours')
  BuiltList<DepotOpeningHours> get openingHours;

  /// Prazo de \"retirar agora\", a partir da reserva.
  @BuiltValueField(wireName: r'pickupNowWindowMinutes')
  int get pickupNowWindowMinutes;

  /// Quantos dias à frente o cliente pode agendar.
  @BuiltValueField(wireName: r'maxScheduleDays')
  int get maxScheduleDays;

  /// Tolerância depois do horário agendado.
  @BuiltValueField(wireName: r'scheduledGraceMinutes')
  int get scheduledGraceMinutes;

  /// Estação de troca de bateria do próprio galpão (`GET /swap-stations`).
  @BuiltValueField(wireName: r'swapStationId')
  String? get swapStationId;

  @BuiltValueField(wireName: r'active')
  bool get active;

  /// Motos `free` neste galpão.
  @BuiltValueField(wireName: r'availableVehicleCount')
  int? get availableVehicleCount;

  /// Só com `lat`/`lng` em `GET /depots`.
  @BuiltValueField(wireName: r'distanceM')
  int? get distanceM;

  @BuiltValueField(wireName: r'createdAt')
  DateTime? get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime? get updatedAt;

  Depot._();

  factory Depot([void updates(DepotBuilder b)]) = _$Depot;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DepotBuilder b) => b
    ..timezone = 'America/Sao_Paulo'
    ..pickupNowWindowMinutes = 120
    ..maxScheduleDays = 7
    ..scheduledGraceMinutes = 30;

  @BuiltValueSerializer(custom: true)
  static Serializer<Depot> get serializer => _$DepotSerializer();
}

class _$DepotSerializer implements PrimitiveSerializer<Depot> {
  @override
  final Iterable<Type> types = const [Depot, _$Depot];

  @override
  final String wireName = r'Depot';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Depot object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'address';
    yield serializers.serialize(
      object.address,
      specifiedType: const FullType(String),
    );
    if (object.district != null) {
      yield r'district';
      yield serializers.serialize(
        object.district,
        specifiedType: const FullType(String),
      );
    }
    yield r'lat';
    yield serializers.serialize(
      object.lat,
      specifiedType: const FullType(double),
    );
    yield r'lng';
    yield serializers.serialize(
      object.lng,
      specifiedType: const FullType(double),
    );
    yield r'timezone';
    yield serializers.serialize(
      object.timezone,
      specifiedType: const FullType(String),
    );
    yield r'openingHours';
    yield serializers.serialize(
      object.openingHours,
      specifiedType: const FullType(BuiltList, [FullType(DepotOpeningHours)]),
    );
    yield r'pickupNowWindowMinutes';
    yield serializers.serialize(
      object.pickupNowWindowMinutes,
      specifiedType: const FullType(int),
    );
    yield r'maxScheduleDays';
    yield serializers.serialize(
      object.maxScheduleDays,
      specifiedType: const FullType(int),
    );
    yield r'scheduledGraceMinutes';
    yield serializers.serialize(
      object.scheduledGraceMinutes,
      specifiedType: const FullType(int),
    );
    if (object.swapStationId != null) {
      yield r'swapStationId';
      yield serializers.serialize(
        object.swapStationId,
        specifiedType: const FullType(String),
      );
    }
    yield r'active';
    yield serializers.serialize(
      object.active,
      specifiedType: const FullType(bool),
    );
    if (object.availableVehicleCount != null) {
      yield r'availableVehicleCount';
      yield serializers.serialize(
        object.availableVehicleCount,
        specifiedType: const FullType(int),
      );
    }
    if (object.distanceM != null) {
      yield r'distanceM';
      yield serializers.serialize(
        object.distanceM,
        specifiedType: const FullType(int),
      );
    }
    if (object.createdAt != null) {
      yield r'createdAt';
      yield serializers.serialize(
        object.createdAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.updatedAt != null) {
      yield r'updatedAt';
      yield serializers.serialize(
        object.updatedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    Depot object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required DepotBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'address':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.address = valueDes;
          break;
        case r'district':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.district = valueDes;
          break;
        case r'lat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.lat = valueDes;
          break;
        case r'lng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.lng = valueDes;
          break;
        case r'timezone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.timezone = valueDes;
          break;
        case r'openingHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(DepotOpeningHours)]),
          ) as BuiltList<DepotOpeningHours>;
          result.openingHours.replace(valueDes);
          break;
        case r'pickupNowWindowMinutes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.pickupNowWindowMinutes = valueDes;
          break;
        case r'maxScheduleDays':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.maxScheduleDays = valueDes;
          break;
        case r'scheduledGraceMinutes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.scheduledGraceMinutes = valueDes;
          break;
        case r'swapStationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.swapStationId = valueDes;
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.active = valueDes;
          break;
        case r'availableVehicleCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.availableVehicleCount = valueDes;
          break;
        case r'distanceM':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.distanceM = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.createdAt = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.updatedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Depot deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DepotBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}
