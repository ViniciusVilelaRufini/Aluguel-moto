//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_create.g.dart';

/// VehicleCreate
///
/// Properties:
/// * [code]
/// * [model]
/// * [thingName]
/// * [qrCode]
/// * [batterySerial] - Série nova (cadastrada instalada) ou de uma bateria `charged` livre no galpão.
/// * [vehicleModelId] - Define também `model` (nome do modelo).
/// * [depotId] - Galpão onde a moto entra. Com ele a moto nasce `free` na posição do galpão (disponível para retirada); sem ele, `maintenance`.
@BuiltValue()
abstract class VehicleCreate
    implements Built<VehicleCreate, VehicleCreateBuilder> {
  @BuiltValueField(wireName: r'code')
  String get code;

  @BuiltValueField(wireName: r'model')
  String get model;

  @BuiltValueField(wireName: r'thingName')
  String get thingName;

  @BuiltValueField(wireName: r'qrCode')
  String? get qrCode;

  /// Série nova (cadastrada instalada) ou de uma bateria `charged` livre no galpão.
  @BuiltValueField(wireName: r'batterySerial')
  String? get batterySerial;

  /// Define também `model` (nome do modelo).
  @BuiltValueField(wireName: r'vehicleModelId')
  String? get vehicleModelId;

  /// Galpão onde a moto entra. Com ele a moto nasce `free` na posição do galpão (disponível para retirada); sem ele, `maintenance`.
  @BuiltValueField(wireName: r'depotId')
  String? get depotId;

  VehicleCreate._();

  factory VehicleCreate([void updates(VehicleCreateBuilder b)]) =
      _$VehicleCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleCreate> get serializer =>
      _$VehicleCreateSerializer();
}

class _$VehicleCreateSerializer implements PrimitiveSerializer<VehicleCreate> {
  @override
  final Iterable<Type> types = const [VehicleCreate, _$VehicleCreate];

  @override
  final String wireName = r'VehicleCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    yield r'model';
    yield serializers.serialize(
      object.model,
      specifiedType: const FullType(String),
    );
    yield r'thingName';
    yield serializers.serialize(
      object.thingName,
      specifiedType: const FullType(String),
    );
    if (object.qrCode != null) {
      yield r'qrCode';
      yield serializers.serialize(
        object.qrCode,
        specifiedType: const FullType(String),
      );
    }
    if (object.batterySerial != null) {
      yield r'batterySerial';
      yield serializers.serialize(
        object.batterySerial,
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
    if (object.depotId != null) {
      yield r'depotId';
      yield serializers.serialize(
        object.depotId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleCreate object, {
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
    required VehicleCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.code = valueDes;
          break;
        case r'model':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.model = valueDes;
          break;
        case r'thingName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
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
        case r'batterySerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.batterySerial = valueDes;
          break;
        case r'vehicleModelId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleModelId = valueDes;
          break;
        case r'depotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.depotId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleCreateBuilder();
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
