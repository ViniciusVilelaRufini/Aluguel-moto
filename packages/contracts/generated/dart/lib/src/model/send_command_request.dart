//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/command_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'send_command_request.g.dart';

/// SendCommandRequest
///
/// Properties:
/// * [type]
/// * [reason] - Motivo obrigatório (vai para o AuditLog).
/// * [speedLimitKmh] - Obrigatório quando `type = speed_limit`. Nunca acima de 32 km/h.
/// * [on_] - Obrigatório quando `type = stolen_mode` (liga/desliga).
@BuiltValue()
abstract class SendCommandRequest
    implements Built<SendCommandRequest, SendCommandRequestBuilder> {
  @BuiltValueField(wireName: r'type')
  CommandType get type;
  // enum typeEnum {  lock,  unlock,  horn,  speed_limit,  stolen_mode,  };

  /// Motivo obrigatório (vai para o AuditLog).
  @BuiltValueField(wireName: r'reason')
  String get reason;

  /// Obrigatório quando `type = speed_limit`. Nunca acima de 32 km/h.
  @BuiltValueField(wireName: r'speedLimitKmh')
  int? get speedLimitKmh;

  /// Obrigatório quando `type = stolen_mode` (liga/desliga).
  @BuiltValueField(wireName: r'on')
  bool? get on_;

  SendCommandRequest._();

  factory SendCommandRequest([void updates(SendCommandRequestBuilder b)]) =
      _$SendCommandRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SendCommandRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SendCommandRequest> get serializer =>
      _$SendCommandRequestSerializer();
}

class _$SendCommandRequestSerializer
    implements PrimitiveSerializer<SendCommandRequest> {
  @override
  final Iterable<Type> types = const [SendCommandRequest, _$SendCommandRequest];

  @override
  final String wireName = r'SendCommandRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SendCommandRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(CommandType),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
    if (object.speedLimitKmh != null) {
      yield r'speedLimitKmh';
      yield serializers.serialize(
        object.speedLimitKmh,
        specifiedType: const FullType(int),
      );
    }
    if (object.on_ != null) {
      yield r'on';
      yield serializers.serialize(
        object.on_,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    SendCommandRequest object, {
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
    required SendCommandRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CommandType),
          ) as CommandType;
          result.type = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        case r'speedLimitKmh':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.speedLimitKmh = valueDes;
          break;
        case r'on':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.on_ = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SendCommandRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SendCommandRequestBuilder();
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
