//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/vehicle.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_page.g.dart';

/// VehiclePage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class VehiclePage implements Built<VehiclePage, VehiclePageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Vehicle> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  VehiclePage._();

  factory VehiclePage([void updates(VehiclePageBuilder b)]) = _$VehiclePage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehiclePageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehiclePage> get serializer => _$VehiclePageSerializer();
}

class _$VehiclePageSerializer implements PrimitiveSerializer<VehiclePage> {
  @override
  final Iterable<Type> types = const [VehiclePage, _$VehiclePage];

  @override
  final String wireName = r'VehiclePage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehiclePage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Vehicle)]),
    );
    if (object.nextCursor != null) {
      yield r'nextCursor';
      yield serializers.serialize(
        object.nextCursor,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    VehiclePage object, {
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
    required VehiclePageBuilder result,
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
        case r'nextCursor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.nextCursor = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehiclePage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehiclePageBuilder();
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
