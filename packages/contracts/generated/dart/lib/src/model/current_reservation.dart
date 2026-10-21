//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/reservation.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'current_reservation.g.dart';

/// CurrentReservation
///
/// Properties:
/// * [reservation]
@BuiltValue()
abstract class CurrentReservation
    implements Built<CurrentReservation, CurrentReservationBuilder> {
  @BuiltValueField(wireName: r'reservation')
  Reservation? get reservation;

  CurrentReservation._();

  factory CurrentReservation([void updates(CurrentReservationBuilder b)]) =
      _$CurrentReservation;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CurrentReservationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CurrentReservation> get serializer =>
      _$CurrentReservationSerializer();
}

class _$CurrentReservationSerializer
    implements PrimitiveSerializer<CurrentReservation> {
  @override
  final Iterable<Type> types = const [CurrentReservation, _$CurrentReservation];

  @override
  final String wireName = r'CurrentReservation';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CurrentReservation object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.reservation != null) {
      yield r'reservation';
      yield serializers.serialize(
        object.reservation,
        specifiedType: const FullType(Reservation),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CurrentReservation object, {
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
    required CurrentReservationBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'reservation':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(Reservation),
          ) as Reservation?;
          if (valueDes == null) continue;
          result.reservation.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CurrentReservation deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CurrentReservationBuilder();
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
