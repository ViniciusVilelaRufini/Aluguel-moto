//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/insurance_coverage_option.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'insurance_coverage_option_list.g.dart';

/// InsuranceCoverageOptionList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class InsuranceCoverageOptionList
    implements
        Built<InsuranceCoverageOptionList, InsuranceCoverageOptionListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<InsuranceCoverageOption> get items;

  InsuranceCoverageOptionList._();

  factory InsuranceCoverageOptionList(
          [void updates(InsuranceCoverageOptionListBuilder b)]) =
      _$InsuranceCoverageOptionList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(InsuranceCoverageOptionListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<InsuranceCoverageOptionList> get serializer =>
      _$InsuranceCoverageOptionListSerializer();
}

class _$InsuranceCoverageOptionListSerializer
    implements PrimitiveSerializer<InsuranceCoverageOptionList> {
  @override
  final Iterable<Type> types = const [
    InsuranceCoverageOptionList,
    _$InsuranceCoverageOptionList
  ];

  @override
  final String wireName = r'InsuranceCoverageOptionList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    InsuranceCoverageOptionList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType:
          const FullType(BuiltList, [FullType(InsuranceCoverageOption)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    InsuranceCoverageOptionList object, {
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
    required InsuranceCoverageOptionListBuilder result,
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
                const FullType(BuiltList, [FullType(InsuranceCoverageOption)]),
          ) as BuiltList<InsuranceCoverageOption>;
          result.items.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  InsuranceCoverageOptionList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = InsuranceCoverageOptionListBuilder();
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
