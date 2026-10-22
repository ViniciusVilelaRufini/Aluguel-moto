//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'maintenance_slot.g.dart';

/// MaintenanceSlot
///
/// Properties:
/// * [startsAt]
/// * [endsAt]
/// * [available]
@BuiltValue()
abstract class MaintenanceSlot
    implements Built<MaintenanceSlot, MaintenanceSlotBuilder> {
  @BuiltValueField(wireName: r'startsAt')
  DateTime get startsAt;

  @BuiltValueField(wireName: r'endsAt')
  DateTime get endsAt;

  @BuiltValueField(wireName: r'available')
  bool get available;

  MaintenanceSlot._();

  factory MaintenanceSlot([void updates(MaintenanceSlotBuilder b)]) =
      _$MaintenanceSlot;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MaintenanceSlotBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<MaintenanceSlot> get serializer =>
      _$MaintenanceSlotSerializer();
}

class _$MaintenanceSlotSerializer
    implements PrimitiveSerializer<MaintenanceSlot> {
  @override
  final Iterable<Type> types = const [MaintenanceSlot, _$MaintenanceSlot];

  @override
  final String wireName = r'MaintenanceSlot';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MaintenanceSlot object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'startsAt';
    yield serializers.serialize(
      object.startsAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'endsAt';
    yield serializers.serialize(
      object.endsAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'available';
    yield serializers.serialize(
      object.available,
      specifiedType: const FullType(bool),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    MaintenanceSlot object, {
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
    required MaintenanceSlotBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'startsAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.startsAt = valueDes;
          break;
        case r'endsAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.endsAt = valueDes;
          break;
        case r'available':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.available = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  MaintenanceSlot deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MaintenanceSlotBuilder();
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
