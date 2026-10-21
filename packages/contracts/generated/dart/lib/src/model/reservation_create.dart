//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'reservation_create.g.dart';

/// ReservationCreate
///
/// Properties:
/// * [vehicleId]
@BuiltValue()
abstract class ReservationCreate
    implements Built<ReservationCreate, ReservationCreateBuilder> {
  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  ReservationCreate._();

  factory ReservationCreate([void updates(ReservationCreateBuilder b)]) =
      _$ReservationCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReservationCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReservationCreate> get serializer =>
      _$ReservationCreateSerializer();
}

class _$ReservationCreateSerializer
    implements PrimitiveSerializer<ReservationCreate> {
  @override
  final Iterable<Type> types = const [ReservationCreate, _$ReservationCreate];

  @override
  final String wireName = r'ReservationCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReservationCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ReservationCreate object, {
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
    required ReservationCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ReservationCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReservationCreateBuilder();
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
