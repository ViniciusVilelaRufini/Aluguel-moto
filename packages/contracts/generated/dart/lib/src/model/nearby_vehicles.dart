//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/vehicle_summary.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'nearby_vehicles.g.dart';

/// NearbyVehicles
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class NearbyVehicles
    implements Built<NearbyVehicles, NearbyVehiclesBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<VehicleSummary> get items;

  NearbyVehicles._();

  factory NearbyVehicles([void updates(NearbyVehiclesBuilder b)]) =
      _$NearbyVehicles;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(NearbyVehiclesBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<NearbyVehicles> get serializer =>
      _$NearbyVehiclesSerializer();
}

class _$NearbyVehiclesSerializer
    implements PrimitiveSerializer<NearbyVehicles> {
  @override
  final Iterable<Type> types = const [NearbyVehicles, _$NearbyVehicles];

  @override
  final String wireName = r'NearbyVehicles';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    NearbyVehicles object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(VehicleSummary)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    NearbyVehicles object, {
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
    required NearbyVehiclesBuilder result,
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
                const FullType(BuiltList, [FullType(VehicleSummary)]),
          ) as BuiltList<VehicleSummary>;
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
  NearbyVehicles deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = NearbyVehiclesBuilder();
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
