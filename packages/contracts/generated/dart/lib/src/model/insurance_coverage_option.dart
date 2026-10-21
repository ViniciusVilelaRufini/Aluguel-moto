//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/coverage_item.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'insurance_coverage_option.g.dart';

/// InsuranceCoverageOption
///
/// Properties:
/// * [coverage]
/// * [name]
/// * [description]
/// * [premiumCents] - Por aluguel (seed: basic 200, full 600).
/// * [mandatory]
/// * [items]
/// * [active]
@BuiltValue()
abstract class InsuranceCoverageOption
    implements Built<InsuranceCoverageOption, InsuranceCoverageOptionBuilder> {
  @BuiltValueField(wireName: r'coverage')
  InsuranceCoverage get coverage;
  // enum coverageEnum {  basic,  full,  };

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'description')
  String get description;

  /// Por aluguel (seed: basic 200, full 600).
  @BuiltValueField(wireName: r'premiumCents')
  int get premiumCents;

  @BuiltValueField(wireName: r'mandatory')
  bool get mandatory;

  @BuiltValueField(wireName: r'items')
  BuiltList<CoverageItem> get items;

  @BuiltValueField(wireName: r'active')
  bool get active;

  InsuranceCoverageOption._();

  factory InsuranceCoverageOption(
          [void updates(InsuranceCoverageOptionBuilder b)]) =
      _$InsuranceCoverageOption;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(InsuranceCoverageOptionBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<InsuranceCoverageOption> get serializer =>
      _$InsuranceCoverageOptionSerializer();
}

class _$InsuranceCoverageOptionSerializer
    implements PrimitiveSerializer<InsuranceCoverageOption> {
  @override
  final Iterable<Type> types = const [
    InsuranceCoverageOption,
    _$InsuranceCoverageOption
  ];

  @override
  final String wireName = r'InsuranceCoverageOption';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    InsuranceCoverageOption object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'coverage';
    yield serializers.serialize(
      object.coverage,
      specifiedType: const FullType(InsuranceCoverage),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'description';
    yield serializers.serialize(
      object.description,
      specifiedType: const FullType(String),
    );
    yield r'premiumCents';
    yield serializers.serialize(
      object.premiumCents,
      specifiedType: const FullType(int),
    );
    yield r'mandatory';
    yield serializers.serialize(
      object.mandatory,
      specifiedType: const FullType(bool),
    );
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(CoverageItem)]),
    );
    yield r'active';
    yield serializers.serialize(
      object.active,
      specifiedType: const FullType(bool),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    InsuranceCoverageOption object, {
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
    required InsuranceCoverageOptionBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'coverage':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(InsuranceCoverage),
          ) as InsuranceCoverage;
          result.coverage = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.description = valueDes;
          break;
        case r'premiumCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.premiumCents = valueDes;
          break;
        case r'mandatory':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.mandatory = valueDes;
          break;
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(CoverageItem)]),
          ) as BuiltList<CoverageItem>;
          result.items.replace(valueDes);
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
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
  InsuranceCoverageOption deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = InsuranceCoverageOptionBuilder();
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
