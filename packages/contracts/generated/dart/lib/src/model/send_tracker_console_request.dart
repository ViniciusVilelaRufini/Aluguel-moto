//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'send_tracker_console_request.g.dart';

/// SendTrackerConsoleRequest
///
/// Properties:
/// * [text]
/// * [confirm] - Obrigatório (`true`) para risco `change` e `connection`.
@BuiltValue()
abstract class SendTrackerConsoleRequest
    implements
        Built<SendTrackerConsoleRequest, SendTrackerConsoleRequestBuilder> {
  @BuiltValueField(wireName: r'text')
  String get text;

  /// Obrigatório (`true`) para risco `change` e `connection`.
  @BuiltValueField(wireName: r'confirm')
  bool? get confirm;

  SendTrackerConsoleRequest._();

  factory SendTrackerConsoleRequest(
          [void updates(SendTrackerConsoleRequestBuilder b)]) =
      _$SendTrackerConsoleRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SendTrackerConsoleRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SendTrackerConsoleRequest> get serializer =>
      _$SendTrackerConsoleRequestSerializer();
}

class _$SendTrackerConsoleRequestSerializer
    implements PrimitiveSerializer<SendTrackerConsoleRequest> {
  @override
  final Iterable<Type> types = const [
    SendTrackerConsoleRequest,
    _$SendTrackerConsoleRequest
  ];

  @override
  final String wireName = r'SendTrackerConsoleRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SendTrackerConsoleRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'text';
    yield serializers.serialize(
      object.text,
      specifiedType: const FullType(String),
    );
    if (object.confirm != null) {
      yield r'confirm';
      yield serializers.serialize(
        object.confirm,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    SendTrackerConsoleRequest object, {
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
    required SendTrackerConsoleRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'text':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.text = valueDes;
          break;
        case r'confirm':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.confirm = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SendTrackerConsoleRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SendTrackerConsoleRequestBuilder();
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
