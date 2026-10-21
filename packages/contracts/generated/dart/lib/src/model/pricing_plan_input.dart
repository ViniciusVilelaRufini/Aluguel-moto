//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:volti_api/src/model/plan_unit.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'pricing_plan_input.g.dart';

/// PricingPlanInput
///
/// Properties:
/// * [code]
/// * [name]
/// * [description]
/// * [unit]
/// * [unlockFeeCents]
/// * [unitPriceCents]
/// * [pausePerMinuteCents]
/// * [recurring]
/// * [active]
@BuiltValue()
abstract class PricingPlanInput
    implements Built<PricingPlanInput, PricingPlanInputBuilder> {
  @BuiltValueField(wireName: r'code')
  PlanCode get code;
  // enum codeEnum {  minute,  hour,  day,  weekly,  monthly,  };

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'description')
  String? get description;

  @BuiltValueField(wireName: r'unit')
  PlanUnit get unit;
  // enum unitEnum {  minute,  hour,  day,  week,  month,  };

  @BuiltValueField(wireName: r'unlockFeeCents')
  int get unlockFeeCents;

  @BuiltValueField(wireName: r'unitPriceCents')
  int get unitPriceCents;

  @BuiltValueField(wireName: r'pausePerMinuteCents')
  int get pausePerMinuteCents;

  @BuiltValueField(wireName: r'recurring')
  bool get recurring;

  @BuiltValueField(wireName: r'active')
  bool? get active;

  PricingPlanInput._();

  factory PricingPlanInput([void updates(PricingPlanInputBuilder b)]) =
      _$PricingPlanInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PricingPlanInputBuilder b) => b..active = true;

  @BuiltValueSerializer(custom: true)
  static Serializer<PricingPlanInput> get serializer =>
      _$PricingPlanInputSerializer();
}

class _$PricingPlanInputSerializer
    implements PrimitiveSerializer<PricingPlanInput> {
  @override
  final Iterable<Type> types = const [PricingPlanInput, _$PricingPlanInput];

  @override
  final String wireName = r'PricingPlanInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PricingPlanInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(PlanCode),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    if (object.description != null) {
      yield r'description';
      yield serializers.serialize(
        object.description,
        specifiedType: const FullType(String),
      );
    }
    yield r'unit';
    yield serializers.serialize(
      object.unit,
      specifiedType: const FullType(PlanUnit),
    );
    yield r'unlockFeeCents';
    yield serializers.serialize(
      object.unlockFeeCents,
      specifiedType: const FullType(int),
    );
    yield r'unitPriceCents';
    yield serializers.serialize(
      object.unitPriceCents,
      specifiedType: const FullType(int),
    );
    yield r'pausePerMinuteCents';
    yield serializers.serialize(
      object.pausePerMinuteCents,
      specifiedType: const FullType(int),
    );
    yield r'recurring';
    yield serializers.serialize(
      object.recurring,
      specifiedType: const FullType(bool),
    );
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
    PricingPlanInput object, {
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
    required PricingPlanInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PlanCode),
          ) as PlanCode;
          result.code = valueDes;
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
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.description = valueDes;
          break;
        case r'unit':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PlanUnit),
          ) as PlanUnit;
          result.unit = valueDes;
          break;
        case r'unlockFeeCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.unlockFeeCents = valueDes;
          break;
        case r'unitPriceCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.unitPriceCents = valueDes;
          break;
        case r'pausePerMinuteCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.pausePerMinuteCents = valueDes;
          break;
        case r'recurring':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.recurring = valueDes;
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
  PricingPlanInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PricingPlanInputBuilder();
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
