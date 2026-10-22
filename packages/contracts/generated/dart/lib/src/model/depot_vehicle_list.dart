//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/vehicle.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'depot_vehicle_list.g.dart';

/// DepotVehicleList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class DepotVehicleList
    implements Built<DepotVehicleList, DepotVehicleListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Vehicle> get items;

  DepotVehicleList._();

  factory DepotVehicleList([void updates(DepotVehicleListBuilder b)]) =
      _$DepotVehicleList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DepotVehicleListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DepotVehicleList> get serializer =>
      _$DepotVehicleListSerializer();
}

class _$DepotVehicleListSerializer
    implements PrimitiveSerializer<DepotVehicleList> {
  @override
  final Iterable<Type> types = const [DepotVehicleList, _$DepotVehicleList];

  @override
  final String wireName = r'DepotVehicleList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DepotVehicleList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Vehicle)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    DepotVehicleList object, {
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
    required DepotVehicleListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Vehicle)]),
          ) as BuiltList<Vehicle>;
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
  DepotVehicleList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DepotVehicleListBuilder();
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
