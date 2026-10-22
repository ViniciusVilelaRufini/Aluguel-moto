//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/vehicle_service_row.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_service_page.g.dart';

/// VehicleServicePage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class VehicleServicePage
    implements Built<VehicleServicePage, VehicleServicePageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<VehicleServiceRow> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  VehicleServicePage._();

  factory VehicleServicePage([void updates(VehicleServicePageBuilder b)]) =
      _$VehicleServicePage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleServicePageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleServicePage> get serializer =>
      _$VehicleServicePageSerializer();
}

class _$VehicleServicePageSerializer
    implements PrimitiveSerializer<VehicleServicePage> {
  @override
  final Iterable<Type> types = const [VehicleServicePage, _$VehicleServicePage];

  @override
  final String wireName = r'VehicleServicePage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleServicePage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(VehicleServiceRow)]),
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
    VehicleServicePage object, {
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
    required VehicleServicePageBuilder result,
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
                const FullType(BuiltList, [FullType(VehicleServiceRow)]),
          ) as BuiltList<VehicleServiceRow>;
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
  VehicleServicePage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleServicePageBuilder();
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
