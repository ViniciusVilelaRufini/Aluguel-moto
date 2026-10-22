//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'handover_cancel.g.dart';

/// HandoverCancel
///
/// Properties:
/// * [reason]
@BuiltValue()
abstract class HandoverCancel
    implements Built<HandoverCancel, HandoverCancelBuilder> {
  @BuiltValueField(wireName: r'reason')
  String get reason;

  HandoverCancel._();

  factory HandoverCancel([void updates(HandoverCancelBuilder b)]) =
      _$HandoverCancel;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HandoverCancelBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<HandoverCancel> get serializer =>
      _$HandoverCancelSerializer();
}

class _$HandoverCancelSerializer
    implements PrimitiveSerializer<HandoverCancel> {
  @override
  final Iterable<Type> types = const [HandoverCancel, _$HandoverCancel];

  @override
  final String wireName = r'HandoverCancel';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    HandoverCancel object, {
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
    HandoverCancel object, {
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
    required HandoverCancelBuilder result,
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
  HandoverCancel deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HandoverCancelBuilder();
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
