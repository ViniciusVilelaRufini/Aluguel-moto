//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/vehicle_model.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_model_list.g.dart';

/// VehicleModelList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class VehicleModelList
    implements Built<VehicleModelList, VehicleModelListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<VehicleModel> get items;

  VehicleModelList._();

  factory VehicleModelList([void updates(VehicleModelListBuilder b)]) =
      _$VehicleModelList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleModelListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleModelList> get serializer =>
      _$VehicleModelListSerializer();
}

class _$VehicleModelListSerializer
    implements PrimitiveSerializer<VehicleModelList> {
  @override
  final Iterable<Type> types = const [VehicleModelList, _$VehicleModelList];

  @override
  final String wireName = r'VehicleModelList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleModelList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(VehicleModel)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleModelList object, {
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
    required VehicleModelListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(VehicleModel)]),
          ) as BuiltList<VehicleModel>;
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
  VehicleModelList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleModelListBuilder();
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
