//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'coverage_item.g.dart';

/// CoverageItem
///
/// Properties:
/// * [code]
/// * [description]
/// * [limitCents]
@BuiltValue()
abstract class CoverageItem
    implements Built<CoverageItem, CoverageItemBuilder> {
  @BuiltValueField(wireName: r'code')
  String get code;

  @BuiltValueField(wireName: r'description')
  String get description;

  @BuiltValueField(wireName: r'limitCents')
  int? get limitCents;

  CoverageItem._();

  factory CoverageItem([void updates(CoverageItemBuilder b)]) = _$CoverageItem;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CoverageItemBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CoverageItem> get serializer => _$CoverageItemSerializer();
}

class _$CoverageItemSerializer implements PrimitiveSerializer<CoverageItem> {
  @override
  final Iterable<Type> types = const [CoverageItem, _$CoverageItem];

  @override
  final String wireName = r'CoverageItem';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CoverageItem object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    yield r'description';
    yield serializers.serialize(
      object.description,
      specifiedType: const FullType(String),
    );
    if (object.limitCents != null) {
      yield r'limitCents';
      yield serializers.serialize(
        object.limitCents,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CoverageItem object, {
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
    required CoverageItemBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.code = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.description = valueDes;
          break;
        case r'limitCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.limitCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CoverageItem deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CoverageItemBuilder();
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
