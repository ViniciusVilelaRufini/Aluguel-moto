//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'handover_dispute.g.dart';

/// HandoverDispute
///
/// Properties:
/// * [reason]
@BuiltValue()
abstract class HandoverDispute
    implements Built<HandoverDispute, HandoverDisputeBuilder> {
  @BuiltValueField(wireName: r'reason')
  String get reason;

  HandoverDispute._();

  factory HandoverDispute([void updates(HandoverDisputeBuilder b)]) =
      _$HandoverDispute;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HandoverDisputeBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<HandoverDispute> get serializer =>
      _$HandoverDisputeSerializer();
}

class _$HandoverDisputeSerializer
    implements PrimitiveSerializer<HandoverDispute> {
  @override
  final Iterable<Type> types = const [HandoverDispute, _$HandoverDispute];

  @override
  final String wireName = r'HandoverDispute';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    HandoverDispute object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    HandoverDispute object, {
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
    required HandoverDisputeBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
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
  HandoverDispute deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HandoverDisputeBuilder();
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
