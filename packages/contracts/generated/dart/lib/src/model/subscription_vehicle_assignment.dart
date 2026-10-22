//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'subscription_vehicle_assignment.g.dart';

/// SubscriptionVehicleAssignment
///
/// Properties:
/// * [vehicleId]
@BuiltValue()
abstract class SubscriptionVehicleAssignment
    implements
        Built<SubscriptionVehicleAssignment,
            SubscriptionVehicleAssignmentBuilder> {
  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  SubscriptionVehicleAssignment._();

  factory SubscriptionVehicleAssignment(
          [void updates(SubscriptionVehicleAssignmentBuilder b)]) =
      _$SubscriptionVehicleAssignment;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SubscriptionVehicleAssignmentBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SubscriptionVehicleAssignment> get serializer =>
      _$SubscriptionVehicleAssignmentSerializer();
}

class _$SubscriptionVehicleAssignmentSerializer
    implements PrimitiveSerializer<SubscriptionVehicleAssignment> {
  @override
  final Iterable<Type> types = const [
    SubscriptionVehicleAssignment,
    _$SubscriptionVehicleAssignment
  ];

  @override
  final String wireName = r'SubscriptionVehicleAssignment';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SubscriptionVehicleAssignment object, {
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
    SubscriptionVehicleAssignment object, {
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
    required SubscriptionVehicleAssignmentBuilder result,
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
  SubscriptionVehicleAssignment deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SubscriptionVehicleAssignmentBuilder();
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
