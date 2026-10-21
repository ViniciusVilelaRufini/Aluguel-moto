//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/vehicle_command.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_command_page.g.dart';

/// VehicleCommandPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class VehicleCommandPage
    implements Built<VehicleCommandPage, VehicleCommandPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<VehicleCommand> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  VehicleCommandPage._();

  factory VehicleCommandPage([void updates(VehicleCommandPageBuilder b)]) =
      _$VehicleCommandPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleCommandPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleCommandPage> get serializer =>
      _$VehicleCommandPageSerializer();
}

class _$VehicleCommandPageSerializer
    implements PrimitiveSerializer<VehicleCommandPage> {
  @override
  final Iterable<Type> types = const [VehicleCommandPage, _$VehicleCommandPage];

  @override
  final String wireName = r'VehicleCommandPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleCommandPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(VehicleCommand)]),
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
    VehicleCommandPage object, {
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
    required VehicleCommandPageBuilder result,
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
                const FullType(BuiltList, [FullType(VehicleCommand)]),
          ) as BuiltList<VehicleCommand>;
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
  VehicleCommandPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleCommandPageBuilder();
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
