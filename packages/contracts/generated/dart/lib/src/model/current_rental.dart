//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/rental.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'current_rental.g.dart';

/// CurrentRental
///
/// Properties:
/// * [rental]
@BuiltValue()
abstract class CurrentRental
    implements Built<CurrentRental, CurrentRentalBuilder> {
  @BuiltValueField(wireName: r'rental')
  Rental? get rental;

  CurrentRental._();

  factory CurrentRental([void updates(CurrentRentalBuilder b)]) =
      _$CurrentRental;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CurrentRentalBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CurrentRental> get serializer =>
      _$CurrentRentalSerializer();
}

class _$CurrentRentalSerializer implements PrimitiveSerializer<CurrentRental> {
  @override
  final Iterable<Type> types = const [CurrentRental, _$CurrentRental];

  @override
  final String wireName = r'CurrentRental';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CurrentRental object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.rental != null) {
      yield r'rental';
      yield serializers.serialize(
        object.rental,
        specifiedType: const FullType(Rental),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CurrentRental object, {
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
    required CurrentRentalBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'rental':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(Rental),
          ) as Rental?;
          if (valueDes == null) continue;
          result.rental.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CurrentRental deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CurrentRentalBuilder();
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
