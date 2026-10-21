//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'validation_issue.g.dart';

/// ValidationIssue
///
/// Properties:
/// * [field]
/// * [message]
@BuiltValue()
abstract class ValidationIssue
    implements Built<ValidationIssue, ValidationIssueBuilder> {
  @BuiltValueField(wireName: r'field')
  String get field;

  @BuiltValueField(wireName: r'message')
  String get message;

  ValidationIssue._();

  factory ValidationIssue([void updates(ValidationIssueBuilder b)]) =
      _$ValidationIssue;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ValidationIssueBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ValidationIssue> get serializer =>
      _$ValidationIssueSerializer();
}

class _$ValidationIssueSerializer
    implements PrimitiveSerializer<ValidationIssue> {
  @override
  final Iterable<Type> types = const [ValidationIssue, _$ValidationIssue];

  @override
  final String wireName = r'ValidationIssue';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ValidationIssue object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'field';
    yield serializers.serialize(
      object.field,
      specifiedType: const FullType(String),
    );
    yield r'message';
    yield serializers.serialize(
      object.message,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ValidationIssue object, {
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
    required ValidationIssueBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'field':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.field = valueDes;
          break;
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.message = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ValidationIssue deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ValidationIssueBuilder();
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
