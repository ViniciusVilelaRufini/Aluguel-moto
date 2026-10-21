//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'restriction_entry.g.dart';

/// RestrictionEntry
///
/// Properties:
/// * [id]
/// * [cpf] - Mascarado para quem não é `admin`.
/// * [reason]
/// * [createdById]
/// * [createdAt]
@BuiltValue()
abstract class RestrictionEntry
    implements Built<RestrictionEntry, RestrictionEntryBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  /// Mascarado para quem não é `admin`.
  @BuiltValueField(wireName: r'cpf')
  String get cpf;

  @BuiltValueField(wireName: r'reason')
  String get reason;

  @BuiltValueField(wireName: r'createdById')
  String? get createdById;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  RestrictionEntry._();

  factory RestrictionEntry([void updates(RestrictionEntryBuilder b)]) =
      _$RestrictionEntry;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RestrictionEntryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RestrictionEntry> get serializer =>
      _$RestrictionEntrySerializer();
}

class _$RestrictionEntrySerializer
    implements PrimitiveSerializer<RestrictionEntry> {
  @override
  final Iterable<Type> types = const [RestrictionEntry, _$RestrictionEntry];

  @override
  final String wireName = r'RestrictionEntry';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RestrictionEntry object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
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
    if (object.createdById != null) {
      yield r'createdById';
      yield serializers.serialize(
        object.createdById,
        specifiedType: const FullType(String),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RestrictionEntry object, {
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
    required RestrictionEntryBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
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
        case r'createdById':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.createdById = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RestrictionEntry deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RestrictionEntryBuilder();
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
