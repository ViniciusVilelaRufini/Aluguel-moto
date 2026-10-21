//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'alert_assign_request.g.dart';

/// AlertAssignRequest
///
/// Properties:
/// * [assigneeId]
@BuiltValue()
abstract class AlertAssignRequest
    implements Built<AlertAssignRequest, AlertAssignRequestBuilder> {
  @BuiltValueField(wireName: r'assigneeId')
  String get assigneeId;

  AlertAssignRequest._();

  factory AlertAssignRequest([void updates(AlertAssignRequestBuilder b)]) =
      _$AlertAssignRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AlertAssignRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AlertAssignRequest> get serializer =>
      _$AlertAssignRequestSerializer();
}

class _$AlertAssignRequestSerializer
    implements PrimitiveSerializer<AlertAssignRequest> {
  @override
  final Iterable<Type> types = const [AlertAssignRequest, _$AlertAssignRequest];

  @override
  final String wireName = r'AlertAssignRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AlertAssignRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'assigneeId';
    yield serializers.serialize(
      object.assigneeId,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AlertAssignRequest object, {
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
    required AlertAssignRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'assigneeId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.assigneeId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AlertAssignRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AlertAssignRequestBuilder();
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
