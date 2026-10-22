//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'swap_station.g.dart';

/// SwapStation
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
/// * [distanceM] - Só com `lat`/`lng` na busca.
@BuiltValue()
abstract class SwapStation implements Built<SwapStation, SwapStationBuilder> {
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
  bool? get open24h;

  /// Só com `lat`/`lng` na busca.
  @BuiltValueField(wireName: r'distanceM')
  int? get distanceM;

  SwapStation._();

  factory SwapStation([void updates(SwapStationBuilder b)]) = _$SwapStation;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SwapStationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SwapStation> get serializer => _$SwapStationSerializer();
}

class _$SwapStationSerializer implements PrimitiveSerializer<SwapStation> {
  @override
  final Iterable<Type> types = const [SwapStation, _$SwapStation];

  @override
  final String wireName = r'SwapStation';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SwapStation object, {
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
    if (object.open24h != null) {
      yield r'open24h';
      yield serializers.serialize(
        object.open24h,
        specifiedType: const FullType(bool),
      );
    }
    if (object.distanceM != null) {
      yield r'distanceM';
      yield serializers.serialize(
        object.distanceM,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    SwapStation object, {
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
    required SwapStationBuilder result,
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
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.open24h = valueDes;
          break;
        case r'distanceM':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.distanceM = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SwapStation deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SwapStationBuilder();
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
