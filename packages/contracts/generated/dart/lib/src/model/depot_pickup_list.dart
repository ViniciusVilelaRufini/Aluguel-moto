//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/reservation.dart';
import 'package:volti_api/src/model/date.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'depot_pickup_list.g.dart';

/// DepotPickupList
///
/// Properties:
/// * [date]
/// * [items] - Reservas do dia em ordem de horário, com `customerFirstName` e sem `pickupCode`.
@BuiltValue()
abstract class DepotPickupList
    implements Built<DepotPickupList, DepotPickupListBuilder> {
  @BuiltValueField(wireName: r'date')
  Date get date;

  /// Reservas do dia em ordem de horário, com `customerFirstName` e sem `pickupCode`.
  @BuiltValueField(wireName: r'items')
  BuiltList<Reservation> get items;

  DepotPickupList._();

  factory DepotPickupList([void updates(DepotPickupListBuilder b)]) =
      _$DepotPickupList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DepotPickupListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DepotPickupList> get serializer =>
      _$DepotPickupListSerializer();
}

class _$DepotPickupListSerializer
    implements PrimitiveSerializer<DepotPickupList> {
  @override
  final Iterable<Type> types = const [DepotPickupList, _$DepotPickupList];

  @override
  final String wireName = r'DepotPickupList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DepotPickupList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'date';
    yield serializers.serialize(
      object.date,
      specifiedType: const FullType(Date),
    );
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Reservation)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    DepotPickupList object, {
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
    required DepotPickupListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'date':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(Date),
          ) as Date;
          result.date = valueDes;
          break;
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Reservation)]),
          ) as BuiltList<Reservation>;
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
  DepotPickupList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DepotPickupListBuilder();
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
