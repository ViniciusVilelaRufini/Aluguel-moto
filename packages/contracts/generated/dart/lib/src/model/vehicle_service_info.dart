//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/vehicle_service_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_service_info.g.dart';

/// VehicleServiceInfo
///
/// Properties:
/// * [odometerKm]
/// * [usageHours]
/// * [kmSinceService]
/// * [hoursSinceService]
/// * [serviceIntervalKm]
/// * [serviceIntervalHours]
/// * [nextServiceAtKm] - Odômetro da próxima revisão.
/// * [nextServiceAtHours]
/// * [kmUntilService] - Negativo quando vencida.
/// * [hoursUntilService] - Negativo quando vencida.
/// * [status]
/// * [lastServiceAt]
@BuiltValue()
abstract class VehicleServiceInfo
    implements Built<VehicleServiceInfo, VehicleServiceInfoBuilder> {
  @BuiltValueField(wireName: r'odometerKm')
  double get odometerKm;

  @BuiltValueField(wireName: r'usageHours')
  double get usageHours;

  @BuiltValueField(wireName: r'kmSinceService')
  double get kmSinceService;

  @BuiltValueField(wireName: r'hoursSinceService')
  double get hoursSinceService;

  @BuiltValueField(wireName: r'serviceIntervalKm')
  int get serviceIntervalKm;

  @BuiltValueField(wireName: r'serviceIntervalHours')
  int get serviceIntervalHours;

  /// Odômetro da próxima revisão.
  @BuiltValueField(wireName: r'nextServiceAtKm')
  double get nextServiceAtKm;

  @BuiltValueField(wireName: r'nextServiceAtHours')
  double get nextServiceAtHours;

  /// Negativo quando vencida.
  @BuiltValueField(wireName: r'kmUntilService')
  double get kmUntilService;

  /// Negativo quando vencida.
  @BuiltValueField(wireName: r'hoursUntilService')
  double get hoursUntilService;

  @BuiltValueField(wireName: r'status')
  VehicleServiceStatus get status;
  // enum statusEnum {  ok,  due_soon,  overdue,  };

  @BuiltValueField(wireName: r'lastServiceAt')
  DateTime? get lastServiceAt;

  VehicleServiceInfo._();

  factory VehicleServiceInfo([void updates(VehicleServiceInfoBuilder b)]) =
      _$VehicleServiceInfo;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleServiceInfoBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleServiceInfo> get serializer =>
      _$VehicleServiceInfoSerializer();
}

class _$VehicleServiceInfoSerializer
    implements PrimitiveSerializer<VehicleServiceInfo> {
  @override
  final Iterable<Type> types = const [VehicleServiceInfo, _$VehicleServiceInfo];

  @override
  final String wireName = r'VehicleServiceInfo';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleServiceInfo object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'odometerKm';
    yield serializers.serialize(
      object.odometerKm,
      specifiedType: const FullType(double),
    );
    yield r'usageHours';
    yield serializers.serialize(
      object.usageHours,
      specifiedType: const FullType(double),
    );
    yield r'kmSinceService';
    yield serializers.serialize(
      object.kmSinceService,
      specifiedType: const FullType(double),
    );
    yield r'hoursSinceService';
    yield serializers.serialize(
      object.hoursSinceService,
      specifiedType: const FullType(double),
    );
    yield r'serviceIntervalKm';
    yield serializers.serialize(
      object.serviceIntervalKm,
      specifiedType: const FullType(int),
    );
    yield r'serviceIntervalHours';
    yield serializers.serialize(
      object.serviceIntervalHours,
      specifiedType: const FullType(int),
    );
    yield r'nextServiceAtKm';
    yield serializers.serialize(
      object.nextServiceAtKm,
      specifiedType: const FullType(double),
    );
    yield r'nextServiceAtHours';
    yield serializers.serialize(
      object.nextServiceAtHours,
      specifiedType: const FullType(double),
    );
    yield r'kmUntilService';
    yield serializers.serialize(
      object.kmUntilService,
      specifiedType: const FullType(double),
    );
    yield r'hoursUntilService';
    yield serializers.serialize(
      object.hoursUntilService,
      specifiedType: const FullType(double),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(VehicleServiceStatus),
    );
    if (object.lastServiceAt != null) {
      yield r'lastServiceAt';
      yield serializers.serialize(
        object.lastServiceAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleServiceInfo object, {
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
    required VehicleServiceInfoBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'odometerKm':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.odometerKm = valueDes;
          break;
        case r'usageHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.usageHours = valueDes;
          break;
        case r'kmSinceService':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.kmSinceService = valueDes;
          break;
        case r'hoursSinceService':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.hoursSinceService = valueDes;
          break;
        case r'serviceIntervalKm':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.serviceIntervalKm = valueDes;
          break;
        case r'serviceIntervalHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.serviceIntervalHours = valueDes;
          break;
        case r'nextServiceAtKm':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.nextServiceAtKm = valueDes;
          break;
        case r'nextServiceAtHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.nextServiceAtHours = valueDes;
          break;
        case r'kmUntilService':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.kmUntilService = valueDes;
          break;
        case r'hoursUntilService':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.hoursUntilService = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(VehicleServiceStatus),
          ) as VehicleServiceStatus;
          result.status = valueDes;
          break;
        case r'lastServiceAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.lastServiceAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleServiceInfo deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleServiceInfoBuilder();
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
