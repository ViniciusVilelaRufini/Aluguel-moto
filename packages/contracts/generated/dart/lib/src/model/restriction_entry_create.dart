//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restriction_entry_create.g.dart';

/// RestrictionEntryCreate
///
/// Properties:
/// * [cpf]
/// * [reason]
@BuiltValue()
abstract class RestrictionEntryCreate
    implements Built<RestrictionEntryCreate, RestrictionEntryCreateBuilder> {
  @BuiltValueField(wireName: r'cpf')
  String get cpf;

  @BuiltValueField(wireName: r'reason')
  String get reason;

  RestrictionEntryCreate._();

  factory RestrictionEntryCreate(
          [void updates(RestrictionEntryCreateBuilder b)]) =
      _$RestrictionEntryCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestrictionEntryCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestrictionEntryCreate> get serializer =>
      _$RestrictionEntryCreateSerializer();
}

class _$RestrictionEntryCreateSerializer
    implements PrimitiveSerializer<RestrictionEntryCreate> {
  @override
  final Iterable<Type> types = const [
    RestrictionEntryCreate,
    _$RestrictionEntryCreate
  ];

  @override
  final String wireName = r'RestrictionEntryCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestrictionEntryCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'cpf';
    yield serializers.serialize(
      object.cpf,
      specifiedType: const FullType(String),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RestrictionEntryCreate object, {
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
    required RestrictionEntryCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'cpf':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.cpf = valueDes;
          break;
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
  RestrictionEntryCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestrictionEntryCreateBuilder();
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
