//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/coverage_item.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'insurance_coverage_update.g.dart';

/// InsuranceCoverageUpdate
///
/// Properties:
/// * [name]
/// * [description]
/// * [premiumCents]
/// * [items]
/// * [active] - `basic` não pode ser desativada.
@BuiltValue()
abstract class InsuranceCoverageUpdate
    implements Built<InsuranceCoverageUpdate, InsuranceCoverageUpdateBuilder> {
  @BuiltValueField(wireName: r'name')
  String? get name;

  @BuiltValueField(wireName: r'description')
  String? get description;

  @BuiltValueField(wireName: r'premiumCents')
  int? get premiumCents;

  @BuiltValueField(wireName: r'items')
  BuiltList<CoverageItem>? get items;

  /// `basic` não pode ser desativada.
  @BuiltValueField(wireName: r'active')
  bool? get active;

  InsuranceCoverageUpdate._();

  factory InsuranceCoverageUpdate(
          [void updates(InsuranceCoverageUpdateBuilder b)]) =
      _$InsuranceCoverageUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(InsuranceCoverageUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<InsuranceCoverageUpdate> get serializer =>
      _$InsuranceCoverageUpdateSerializer();
}

class _$InsuranceCoverageUpdateSerializer
    implements PrimitiveSerializer<InsuranceCoverageUpdate> {
  @override
  final Iterable<Type> types = const [
    InsuranceCoverageUpdate,
    _$InsuranceCoverageUpdate
  ];

  @override
  final String wireName = r'InsuranceCoverageUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    InsuranceCoverageUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.name != null) {
      yield r'name';
      yield serializers.serialize(
        object.name,
        specifiedType: const FullType(String),
      );
    }
    if (object.description != null) {
      yield r'description';
      yield serializers.serialize(
        object.description,
        specifiedType: const FullType(String),
      );
    }
    if (object.premiumCents != null) {
      yield r'premiumCents';
      yield serializers.serialize(
        object.premiumCents,
        specifiedType: const FullType(int),
      );
    }
    if (object.items != null) {
      yield r'items';
      yield serializers.serialize(
        object.items,
        specifiedType: const FullType(BuiltList, [FullType(CoverageItem)]),
      );
    }
    if (object.active != null) {
      yield r'active';
      yield serializers.serialize(
        object.active,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    InsuranceCoverageUpdate object, {
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
    required InsuranceCoverageUpdateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.name = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.description = valueDes;
          break;
        case r'premiumCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.premiumCents = valueDes;
          break;
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(CoverageItem)]),
          ) as BuiltList<CoverageItem>?;
          if (valueDes == null) continue;
          result.items.replace(valueDes);
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.active = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  InsuranceCoverageUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = InsuranceCoverageUpdateBuilder();
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
