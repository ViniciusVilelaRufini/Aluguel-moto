//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/claim_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'claim_update.g.dart';

/// ClaimUpdate
///
/// Properties:
/// * [status]
/// * [statusNote]
@BuiltValue()
abstract class ClaimUpdate implements Built<ClaimUpdate, ClaimUpdateBuilder> {
  @BuiltValueField(wireName: r'status')
  ClaimStatus get status;
  // enum statusEnum {  submitted,  under_review,  approved,  rejected,  paid,  };

  @BuiltValueField(wireName: r'statusNote')
  String? get statusNote;

  ClaimUpdate._();

  factory ClaimUpdate([void updates(ClaimUpdateBuilder b)]) = _$ClaimUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ClaimUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ClaimUpdate> get serializer => _$ClaimUpdateSerializer();
}

class _$ClaimUpdateSerializer implements PrimitiveSerializer<ClaimUpdate> {
  @override
  final Iterable<Type> types = const [ClaimUpdate, _$ClaimUpdate];

  @override
  final String wireName = r'ClaimUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ClaimUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(ClaimStatus),
    );
    if (object.statusNote != null) {
      yield r'statusNote';
      yield serializers.serialize(
        object.statusNote,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ClaimUpdate object, {
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
    required ClaimUpdateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ClaimStatus),
          ) as ClaimStatus;
          result.status = valueDes;
          break;
        case r'statusNote':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.statusNote = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ClaimUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ClaimUpdateBuilder();
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
