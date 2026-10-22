//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'battery_transfer_request.g.dart';

/// BatteryTransferRequest
///
/// Properties:
/// * [serials]
/// * [stationId] - Só em `unload`; ausente = `charging`.
/// * [chargePct] - Só em `load`; carga informada (padrão 100).
@BuiltValue()
abstract class BatteryTransferRequest
    implements Built<BatteryTransferRequest, BatteryTransferRequestBuilder> {
  @BuiltValueField(wireName: r'serials')
  BuiltList<String> get serials;

  /// Só em `unload`; ausente = `charging`.
  @BuiltValueField(wireName: r'stationId')
  String? get stationId;

  /// Só em `load`; carga informada (padrão 100).
  @BuiltValueField(wireName: r'chargePct')
  int? get chargePct;

  BatteryTransferRequest._();

  factory BatteryTransferRequest(
          [void updates(BatteryTransferRequestBuilder b)]) =
      _$BatteryTransferRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BatteryTransferRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BatteryTransferRequest> get serializer =>
      _$BatteryTransferRequestSerializer();
}

class _$BatteryTransferRequestSerializer
    implements PrimitiveSerializer<BatteryTransferRequest> {
  @override
  final Iterable<Type> types = const [
    BatteryTransferRequest,
    _$BatteryTransferRequest
  ];

  @override
  final String wireName = r'BatteryTransferRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BatteryTransferRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'serials';
    yield serializers.serialize(
      object.serials,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
    if (object.stationId != null) {
      yield r'stationId';
      yield serializers.serialize(
        object.stationId,
        specifiedType: const FullType(String),
      );
    }
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
    BatteryTransferRequest object, {
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
    required BatteryTransferRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'serials':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.serials.replace(valueDes);
          break;
        case r'stationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.stationId = valueDes;
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
  BatteryTransferRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BatteryTransferRequestBuilder();
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
