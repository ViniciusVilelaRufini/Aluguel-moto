//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/insurance_policy.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'insurance_policy_page.g.dart';

/// InsurancePolicyPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class InsurancePolicyPage
    implements Built<InsurancePolicyPage, InsurancePolicyPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<InsurancePolicy> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  InsurancePolicyPage._();

  factory InsurancePolicyPage([void updates(InsurancePolicyPageBuilder b)]) =
      _$InsurancePolicyPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(InsurancePolicyPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<InsurancePolicyPage> get serializer =>
      _$InsurancePolicyPageSerializer();
}

class _$InsurancePolicyPageSerializer
    implements PrimitiveSerializer<InsurancePolicyPage> {
  @override
  final Iterable<Type> types = const [
    InsurancePolicyPage,
    _$InsurancePolicyPage
  ];

  @override
  final String wireName = r'InsurancePolicyPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    InsurancePolicyPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(InsurancePolicy)]),
    );
    if (object.nextCursor != null) {
      yield r'nextCursor';
      yield serializers.serialize(
        object.nextCursor,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    InsurancePolicyPage object, {
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
    required InsurancePolicyPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(InsurancePolicy)]),
          ) as BuiltList<InsurancePolicy>;
          result.items.replace(valueDes);
          break;
        case r'nextCursor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.nextCursor = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  InsurancePolicyPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = InsurancePolicyPageBuilder();
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
