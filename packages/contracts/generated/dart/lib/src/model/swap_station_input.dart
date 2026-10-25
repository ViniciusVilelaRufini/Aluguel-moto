//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'swap_station_input.g.dart';

/// SwapStationInput
///
/// Properties:
/// * [name]
/// * [address]
/// * [lat]
/// * [lng]
/// * [openingHours] - Obrigatório sem `open24h` (`400`).
/// * [open24h]
/// * [totalSlots]
/// * [thingName] - Padrão `station-{id}`.
/// * [active]
@BuiltValue()
abstract class SwapStationInput
    implements Built<SwapStationInput, SwapStationInputBuilder> {
  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'address')
  String get address;

  @BuiltValueField(wireName: r'lat')
  double get lat;

  @BuiltValueField(wireName: r'lng')
  double get lng;

  /// Obrigatório sem `open24h` (`400`).
  @BuiltValueField(wireName: r'openingHours')
  String? get openingHours;

  @BuiltValueField(wireName: r'open24h')
  bool? get open24h;

  @BuiltValueField(wireName: r'totalSlots')
  int get totalSlots;

  /// Padrão `station-{id}`.
  @BuiltValueField(wireName: r'thingName')
  String? get thingName;

  @BuiltValueField(wireName: r'active')
  bool? get active;

  SwapStationInput._();

  factory SwapStationInput([void updates(SwapStationInputBuilder b)]) =
      _$SwapStationInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SwapStationInputBuilder b) => b
    ..open24h = false
    ..active = true;

  @BuiltValueSerializer(custom: true)
  static Serializer<SwapStationInput> get serializer =>
      _$SwapStationInputSerializer();
}

class _$SwapStationInputSerializer
    implements PrimitiveSerializer<SwapStationInput> {
  @override
  final Iterable<Type> types = const [SwapStationInput, _$SwapStationInput];

  @override
  final String wireName = r'SwapStationInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SwapStationInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
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
    if (object.openingHours != null) {
      yield r'openingHours';
      yield serializers.serialize(
        object.openingHours,
        specifiedType: const FullType(String),
      );
    }
    if (object.open24h != null) {
      yield r'open24h';
      yield serializers.serialize(
        object.open24h,
        specifiedType: const FullType(bool),
      );
    }
    yield r'totalSlots';
    yield serializers.serialize(
      object.totalSlots,
      specifiedType: const FullType(int),
    );
    if (object.thingName != null) {
      yield r'thingName';
      yield serializers.serialize(
        object.thingName,
        specifiedType: const FullType(String),
      );
    }
    if (object.active != null) {
      yield r'active';
      yield serializers.serialize(
        object.active,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    SwapStationInput object, {
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
    required SwapStationInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
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
        case r'openingHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
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
        case r'totalSlots':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.totalSlots = valueDes;
          break;
        case r'thingName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.thingName = valueDes;
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.active = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SwapStationInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SwapStationInputBuilder();
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
