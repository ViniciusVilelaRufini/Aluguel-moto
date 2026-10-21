//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/service_vehicle_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_status_change.g.dart';

/// VehicleStatusChange
///
/// Properties:
/// * [status]
/// * [reason]
@BuiltValue()
abstract class VehicleStatusChange
    implements Built<VehicleStatusChange, VehicleStatusChangeBuilder> {
  @BuiltValueField(wireName: r'status')
  ServiceVehicleStatus get status;
  // enum statusEnum {  free,  maintenance,  };

  @BuiltValueField(wireName: r'reason')
  String get reason;

  VehicleStatusChange._();

  factory VehicleStatusChange([void updates(VehicleStatusChangeBuilder b)]) =
      _$VehicleStatusChange;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleStatusChangeBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleStatusChange> get serializer =>
      _$VehicleStatusChangeSerializer();
}

class _$VehicleStatusChangeSerializer
    implements PrimitiveSerializer<VehicleStatusChange> {
  @override
  final Iterable<Type> types = const [
    VehicleStatusChange,
    _$VehicleStatusChange
  ];

  @override
  final String wireName = r'VehicleStatusChange';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleStatusChange object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(ServiceVehicleStatus),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleStatusChange object, {
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
    required VehicleStatusChangeBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ServiceVehicleStatus),
          ) as ServiceVehicleStatus;
          result.status = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleStatusChange deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleStatusChangeBuilder();
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
