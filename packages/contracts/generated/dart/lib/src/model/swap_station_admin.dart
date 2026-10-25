//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'swap_station_admin.g.dart';

/// Estação com os campos de cadastro (só staff admin/operacao). Nunca traz o QR (`stationCode`).
///
/// Properties:
/// * [id]
/// * [name]
/// * [address]
/// * [lat]
/// * [lng]
/// * [availableBatteries] - Baterias carregadas prontas para troca.
/// * [totalSlots]
/// * [openingHours]
/// * [open24h]
/// * [active]
/// * [thingName] - *Thing* do armário no IoT Core (tópicos `estacoes/{thing}/comandos` e `/eventos`).
/// * [batteriesInStation] - Baterias `in_station` registradas nesta estação (carregadas ou não).
/// * [openSwaps] - Trocas por QR em andamento.
/// * [depotIds] - Galpões ligados a esta estação (`Depot.swapStationId`).
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class SwapStationAdmin
    implements Built<SwapStationAdmin, SwapStationAdminBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'address')
  String get address;

  @BuiltValueField(wireName: r'lat')
  double get lat;

  @BuiltValueField(wireName: r'lng')
  double get lng;

  /// Baterias carregadas prontas para troca.
  @BuiltValueField(wireName: r'availableBatteries')
  int get availableBatteries;

  @BuiltValueField(wireName: r'totalSlots')
  int get totalSlots;

  @BuiltValueField(wireName: r'openingHours')
  String get openingHours;

  @BuiltValueField(wireName: r'open24h')
  bool get open24h;

  @BuiltValueField(wireName: r'active')
  bool get active;

  /// *Thing* do armário no IoT Core (tópicos `estacoes/{thing}/comandos` e `/eventos`).
  @BuiltValueField(wireName: r'thingName')
  String get thingName;

  /// Baterias `in_station` registradas nesta estação (carregadas ou não).
  @BuiltValueField(wireName: r'batteriesInStation')
  int get batteriesInStation;

  /// Trocas por QR em andamento.
  @BuiltValueField(wireName: r'openSwaps')
  int get openSwaps;

  /// Galpões ligados a esta estação (`Depot.swapStationId`).
  @BuiltValueField(wireName: r'depotIds')
  BuiltList<String> get depotIds;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  SwapStationAdmin._();

  factory SwapStationAdmin([void updates(SwapStationAdminBuilder b)]) =
      _$SwapStationAdmin;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SwapStationAdminBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SwapStationAdmin> get serializer =>
      _$SwapStationAdminSerializer();
}

class _$SwapStationAdminSerializer
    implements PrimitiveSerializer<SwapStationAdmin> {
  @override
  final Iterable<Type> types = const [SwapStationAdmin, _$SwapStationAdmin];

  @override
  final String wireName = r'SwapStationAdmin';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SwapStationAdmin object, {
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
    yield r'availableBatteries';
    yield serializers.serialize(
      object.availableBatteries,
      specifiedType: const FullType(int),
    );
    yield r'totalSlots';
    yield serializers.serialize(
      object.totalSlots,
      specifiedType: const FullType(int),
    );
    yield r'openingHours';
    yield serializers.serialize(
      object.openingHours,
      specifiedType: const FullType(String),
    );
    yield r'open24h';
    yield serializers.serialize(
      object.open24h,
      specifiedType: const FullType(bool),
    );
    yield r'active';
    yield serializers.serialize(
      object.active,
      specifiedType: const FullType(bool),
    );
    yield r'thingName';
    yield serializers.serialize(
      object.thingName,
      specifiedType: const FullType(String),
    );
    yield r'batteriesInStation';
    yield serializers.serialize(
      object.batteriesInStation,
      specifiedType: const FullType(int),
    );
    yield r'openSwaps';
    yield serializers.serialize(
      object.openSwaps,
      specifiedType: const FullType(int),
    );
    yield r'depotIds';
    yield serializers.serialize(
      object.depotIds,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'updatedAt';
    yield serializers.serialize(
      object.updatedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SwapStationAdmin object, {
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
    required SwapStationAdminBuilder result,
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
        case r'availableBatteries':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.availableBatteries = valueDes;
          break;
        case r'totalSlots':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.totalSlots = valueDes;
          break;
        case r'openingHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.openingHours = valueDes;
          break;
        case r'open24h':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.open24h = valueDes;
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.active = valueDes;
          break;
        case r'thingName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.thingName = valueDes;
          break;
        case r'batteriesInStation':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.batteriesInStation = valueDes;
          break;
        case r'openSwaps':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.openSwaps = valueDes;
          break;
        case r'depotIds':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.depotIds.replace(valueDes);
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
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
  SwapStationAdmin deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SwapStationAdminBuilder();
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
