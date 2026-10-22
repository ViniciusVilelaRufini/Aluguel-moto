//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_update.g.dart';

/// VehicleUpdate
///
/// Properties:
/// * [model]
/// * [thingName]
/// * [qrCode]
/// * [vehicleModelId] - Define também `model` (nome do modelo).
/// * [odometerKm] - Correção manual do odômetro (AuditLog).
/// * [usageHours] - Correção manual das horas de uso (AuditLog).
@BuiltValue()
abstract class VehicleUpdate
    implements Built<VehicleUpdate, VehicleUpdateBuilder> {
  @BuiltValueField(wireName: r'model')
  String? get model;

  @BuiltValueField(wireName: r'thingName')
  String? get thingName;

  @BuiltValueField(wireName: r'qrCode')
  String? get qrCode;

  /// Define também `model` (nome do modelo).
  @BuiltValueField(wireName: r'vehicleModelId')
  String? get vehicleModelId;

  /// Correção manual do odômetro (AuditLog).
  @BuiltValueField(wireName: r'odometerKm')
  double? get odometerKm;

  /// Correção manual das horas de uso (AuditLog).
  @BuiltValueField(wireName: r'usageHours')
  double? get usageHours;

  VehicleUpdate._();

  factory VehicleUpdate([void updates(VehicleUpdateBuilder b)]) =
      _$VehicleUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleUpdate> get serializer =>
      _$VehicleUpdateSerializer();
}

class _$VehicleUpdateSerializer implements PrimitiveSerializer<VehicleUpdate> {
  @override
  final Iterable<Type> types = const [VehicleUpdate, _$VehicleUpdate];

  @override
  final String wireName = r'VehicleUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.model != null) {
      yield r'model';
      yield serializers.serialize(
        object.model,
        specifiedType: const FullType(String),
      );
    }
    if (object.thingName != null) {
      yield r'thingName';
      yield serializers.serialize(
        object.thingName,
        specifiedType: const FullType(String),
      );
    }
    if (object.qrCode != null) {
      yield r'qrCode';
      yield serializers.serialize(
        object.qrCode,
        specifiedType: const FullType(String),
      );
    }
    if (object.vehicleModelId != null) {
      yield r'vehicleModelId';
      yield serializers.serialize(
        object.vehicleModelId,
        specifiedType: const FullType(String),
      );
    }
    if (object.odometerKm != null) {
      yield r'odometerKm';
      yield serializers.serialize(
        object.odometerKm,
        specifiedType: const FullType(double),
      );
    }
    if (object.usageHours != null) {
      yield r'usageHours';
      yield serializers.serialize(
        object.usageHours,
        specifiedType: const FullType(double),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleUpdate object, {
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
    required VehicleUpdateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'model':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.model = valueDes;
          break;
        case r'thingName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.thingName = valueDes;
          break;
        case r'qrCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.qrCode = valueDes;
          break;
        case r'vehicleModelId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleModelId = valueDes;
          break;
        case r'odometerKm':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.odometerKm = valueDes;
          break;
        case r'usageHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.usageHours = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleUpdateBuilder();
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
