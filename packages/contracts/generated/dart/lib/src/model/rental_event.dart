//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/actor_type.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/rental_event_type.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'rental_event.g.dart';

/// RentalEvent
///
/// Properties:
/// * [id]
/// * [rentalId]
/// * [type]
/// * [at]
/// * [actorType]
/// * [actorId]
/// * [message] - Texto pt-BR para a linha do tempo.
/// * [data] - Detalhes por tipo (ex. `{ zoneId, zoneType, speedLimitKmh }`, `{ fromVehicleId, toVehicleId }`).
@BuiltValue()
abstract class RentalEvent implements Built<RentalEvent, RentalEventBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'rentalId')
  String get rentalId;

  @BuiltValueField(wireName: r'type')
  RentalEventType get type;
  // enum typeEnum {  started,  paused,  resumed,  vehicle_swapped,  zone_entered,  zone_exited,  left_operation_area,  returned_operation_area,  alert,  fall_detected,  ending,  ended,  force_ended,  command,  };

  @BuiltValueField(wireName: r'at')
  DateTime get at;

  @BuiltValueField(wireName: r'actorType')
  ActorType get actorType;
  // enum actorTypeEnum {  customer,  staff,  system,  };

  @BuiltValueField(wireName: r'actorId')
  String? get actorId;

  /// Texto pt-BR para a linha do tempo.
  @BuiltValueField(wireName: r'message')
  String? get message;

  /// Detalhes por tipo (ex. `{ zoneId, zoneType, speedLimitKmh }`, `{ fromVehicleId, toVehicleId }`).
  @BuiltValueField(wireName: r'data')
  BuiltMap<String, JsonObject?>? get data;

  RentalEvent._();

  factory RentalEvent([void updates(RentalEventBuilder b)]) = _$RentalEvent;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RentalEventBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RentalEvent> get serializer => _$RentalEventSerializer();
}

class _$RentalEventSerializer implements PrimitiveSerializer<RentalEvent> {
  @override
  final Iterable<Type> types = const [RentalEvent, _$RentalEvent];

  @override
  final String wireName = r'RentalEvent';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RentalEvent object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'rentalId';
    yield serializers.serialize(
      object.rentalId,
      specifiedType: const FullType(String),
    );
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(RentalEventType),
    );
    yield r'at';
    yield serializers.serialize(
      object.at,
      specifiedType: const FullType(DateTime),
    );
    yield r'actorType';
    yield serializers.serialize(
      object.actorType,
      specifiedType: const FullType(ActorType),
    );
    if (object.actorId != null) {
      yield r'actorId';
      yield serializers.serialize(
        object.actorId,
        specifiedType: const FullType(String),
      );
    }
    if (object.message != null) {
      yield r'message';
      yield serializers.serialize(
        object.message,
        specifiedType: const FullType(String),
      );
    }
    if (object.data != null) {
      yield r'data';
      yield serializers.serialize(
        object.data,
        specifiedType: const FullType(
            BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    RentalEvent object, {
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
    required RentalEventBuilder result,
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
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.rentalId = valueDes;
          break;
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RentalEventType),
          ) as RentalEventType;
          result.type = valueDes;
          break;
        case r'at':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.at = valueDes;
          break;
        case r'actorType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ActorType),
          ) as ActorType;
          result.actorType = valueDes;
          break;
        case r'actorId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.actorId = valueDes;
          break;
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.message = valueDes;
          break;
        case r'data':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(
                BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
          ) as BuiltMap<String, JsonObject?>?;
          if (valueDes == null) continue;
          result.data.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RentalEvent deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RentalEventBuilder();
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
