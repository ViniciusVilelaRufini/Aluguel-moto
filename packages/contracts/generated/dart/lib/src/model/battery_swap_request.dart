//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'battery_swap_request.g.dart';

/// BatterySwapRequest
///
/// Properties:
/// * [removedBatterySerial]
/// * [installedBatterySerial]
/// * [installedBatteryPct] - Só para bateria nova (sem cadastro): carga inicial (padrão 100). Bateria existente mantém a carga gravada.
/// * [recordedAt]
@BuiltValue()
abstract class BatterySwapRequest
    implements Built<BatterySwapRequest, BatterySwapRequestBuilder> {
  @BuiltValueField(wireName: r'removedBatterySerial')
  String get removedBatterySerial;

  @BuiltValueField(wireName: r'installedBatterySerial')
  String get installedBatterySerial;

  /// Só para bateria nova (sem cadastro): carga inicial (padrão 100). Bateria existente mantém a carga gravada.
  @BuiltValueField(wireName: r'installedBatteryPct')
  int? get installedBatteryPct;

  @BuiltValueField(wireName: r'recordedAt')
  DateTime get recordedAt;

  BatterySwapRequest._();

  factory BatterySwapRequest([void updates(BatterySwapRequestBuilder b)]) =
      _$BatterySwapRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BatterySwapRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BatterySwapRequest> get serializer =>
      _$BatterySwapRequestSerializer();
}

class _$BatterySwapRequestSerializer
    implements PrimitiveSerializer<BatterySwapRequest> {
  @override
  final Iterable<Type> types = const [BatterySwapRequest, _$BatterySwapRequest];

  @override
  final String wireName = r'BatterySwapRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BatterySwapRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'removedBatterySerial';
    yield serializers.serialize(
      object.removedBatterySerial,
      specifiedType: const FullType(String),
    );
    yield r'installedBatterySerial';
    yield serializers.serialize(
      object.installedBatterySerial,
      specifiedType: const FullType(String),
    );
    if (object.installedBatteryPct != null) {
      yield r'installedBatteryPct';
      yield serializers.serialize(
        object.installedBatteryPct,
        specifiedType: const FullType(int),
      );
    }
    yield r'recordedAt';
    yield serializers.serialize(
      object.recordedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    BatterySwapRequest object, {
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
    required BatterySwapRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'removedBatterySerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.removedBatterySerial = valueDes;
          break;
        case r'installedBatterySerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.installedBatterySerial = valueDes;
          break;
        case r'installedBatteryPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.installedBatteryPct = valueDes;
          break;
        case r'recordedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.recordedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  BatterySwapRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BatterySwapRequestBuilder();
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
