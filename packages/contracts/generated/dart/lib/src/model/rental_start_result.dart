//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/rental_start_outcome.dart';
import 'package:volti_api/src/model/rental.dart';
import 'package:volti_api/src/model/deposit.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'rental_start_result.g.dart';

/// RentalStartResult
///
/// Properties:
/// * [outcome]
/// * [rental]
/// * [deposit]
@BuiltValue()
abstract class RentalStartResult
    implements Built<RentalStartResult, RentalStartResultBuilder> {
  @BuiltValueField(wireName: r'outcome')
  RentalStartOutcome get outcome;
  // enum outcomeEnum {  started,  awaiting_deposit,  };

  @BuiltValueField(wireName: r'rental')
  Rental? get rental;

  @BuiltValueField(wireName: r'deposit')
  Deposit get deposit;

  RentalStartResult._();

  factory RentalStartResult([void updates(RentalStartResultBuilder b)]) =
      _$RentalStartResult;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RentalStartResultBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RentalStartResult> get serializer =>
      _$RentalStartResultSerializer();
}

class _$RentalStartResultSerializer
    implements PrimitiveSerializer<RentalStartResult> {
  @override
  final Iterable<Type> types = const [RentalStartResult, _$RentalStartResult];

  @override
  final String wireName = r'RentalStartResult';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RentalStartResult object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'outcome';
    yield serializers.serialize(
      object.outcome,
      specifiedType: const FullType(RentalStartOutcome),
    );
    if (object.rental != null) {
      yield r'rental';
      yield serializers.serialize(
        object.rental,
        specifiedType: const FullType(Rental),
      );
    }
    yield r'deposit';
    yield serializers.serialize(
      object.deposit,
      specifiedType: const FullType(Deposit),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RentalStartResult object, {
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
    required RentalStartResultBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'outcome':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RentalStartOutcome),
          ) as RentalStartOutcome;
          result.outcome = valueDes;
          break;
        case r'rental':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(Rental),
          ) as Rental?;
          if (valueDes == null) continue;
          result.rental.replace(valueDes);
          break;
        case r'deposit':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(Deposit),
          ) as Deposit;
          result.deposit.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RentalStartResult deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RentalStartResultBuilder();
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
