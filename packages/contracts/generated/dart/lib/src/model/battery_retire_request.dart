//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'battery_retire_request.g.dart';

/// BatteryRetireRequest
///
/// Properties:
/// * [reason]
@BuiltValue()
abstract class BatteryRetireRequest
    implements Built<BatteryRetireRequest, BatteryRetireRequestBuilder> {
  @BuiltValueField(wireName: r'reason')
  String? get reason;

  BatteryRetireRequest._();

  factory BatteryRetireRequest([void updates(BatteryRetireRequestBuilder b)]) =
      _$BatteryRetireRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BatteryRetireRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BatteryRetireRequest> get serializer =>
      _$BatteryRetireRequestSerializer();
}

class _$BatteryRetireRequestSerializer
    implements PrimitiveSerializer<BatteryRetireRequest> {
  @override
  final Iterable<Type> types = const [
    BatteryRetireRequest,
    _$BatteryRetireRequest
  ];

  @override
  final String wireName = r'BatteryRetireRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BatteryRetireRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.reason != null) {
      yield r'reason';
      yield serializers.serialize(
        object.reason,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    BatteryRetireRequest object, {
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
    required BatteryRetireRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
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
  BatteryRetireRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BatteryRetireRequestBuilder();
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
