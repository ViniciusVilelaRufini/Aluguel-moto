//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/battery_initial_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'battery_create_request.g.dart';

/// BatteryCreateRequest
///
/// Properties:
/// * [serial]
/// * [status]
/// * [depotId]
/// * [chargePct] - Só com `charging` (padrão 0); `charged` grava 100.
@BuiltValue()
abstract class BatteryCreateRequest
    implements Built<BatteryCreateRequest, BatteryCreateRequestBuilder> {
  @BuiltValueField(wireName: r'serial')
  String get serial;

  @BuiltValueField(wireName: r'status')
  BatteryInitialStatus get status;
  // enum statusEnum {  charging,  charged,  };

  @BuiltValueField(wireName: r'depotId')
  String get depotId;

  /// Só com `charging` (padrão 0); `charged` grava 100.
  @BuiltValueField(wireName: r'chargePct')
  int? get chargePct;

  BatteryCreateRequest._();

  factory BatteryCreateRequest([void updates(BatteryCreateRequestBuilder b)]) =
      _$BatteryCreateRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BatteryCreateRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BatteryCreateRequest> get serializer =>
      _$BatteryCreateRequestSerializer();
}

class _$BatteryCreateRequestSerializer
    implements PrimitiveSerializer<BatteryCreateRequest> {
  @override
  final Iterable<Type> types = const [
    BatteryCreateRequest,
    _$BatteryCreateRequest
  ];

  @override
  final String wireName = r'BatteryCreateRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BatteryCreateRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'serial';
    yield serializers.serialize(
      object.serial,
      specifiedType: const FullType(String),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(BatteryInitialStatus),
    );
    yield r'depotId';
    yield serializers.serialize(
      object.depotId,
      specifiedType: const FullType(String),
    );
    if (object.chargePct != null) {
      yield r'chargePct';
      yield serializers.serialize(
        object.chargePct,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    BatteryCreateRequest object, {
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
    required BatteryCreateRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'serial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.serial = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BatteryInitialStatus),
          ) as BatteryInitialStatus;
          result.status = valueDes;
          break;
        case r'depotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.depotId = valueDes;
          break;
        case r'chargePct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.chargePct = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  BatteryCreateRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BatteryCreateRequestBuilder();
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
