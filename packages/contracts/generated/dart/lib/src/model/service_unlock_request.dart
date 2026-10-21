//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'service_unlock_request.g.dart';

/// ServiceUnlockRequest
///
/// Properties:
/// * [reason]
/// * [fieldTaskId]
@BuiltValue()
abstract class ServiceUnlockRequest
    implements Built<ServiceUnlockRequest, ServiceUnlockRequestBuilder> {
  @BuiltValueField(wireName: r'reason')
  String get reason;

  @BuiltValueField(wireName: r'fieldTaskId')
  String? get fieldTaskId;

  ServiceUnlockRequest._();

  factory ServiceUnlockRequest([void updates(ServiceUnlockRequestBuilder b)]) =
      _$ServiceUnlockRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ServiceUnlockRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ServiceUnlockRequest> get serializer =>
      _$ServiceUnlockRequestSerializer();
}

class _$ServiceUnlockRequestSerializer
    implements PrimitiveSerializer<ServiceUnlockRequest> {
  @override
  final Iterable<Type> types = const [
    ServiceUnlockRequest,
    _$ServiceUnlockRequest
  ];

  @override
  final String wireName = r'ServiceUnlockRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ServiceUnlockRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
    if (object.fieldTaskId != null) {
      yield r'fieldTaskId';
      yield serializers.serialize(
        object.fieldTaskId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ServiceUnlockRequest object, {
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
    required ServiceUnlockRequestBuilder result,
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
        case r'fieldTaskId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.fieldTaskId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ServiceUnlockRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ServiceUnlockRequestBuilder();
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
