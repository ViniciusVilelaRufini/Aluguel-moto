//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/battery_movement.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'battery_movement_page.g.dart';

/// BatteryMovementPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class BatteryMovementPage
    implements Built<BatteryMovementPage, BatteryMovementPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<BatteryMovement> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  BatteryMovementPage._();

  factory BatteryMovementPage([void updates(BatteryMovementPageBuilder b)]) =
      _$BatteryMovementPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BatteryMovementPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BatteryMovementPage> get serializer =>
      _$BatteryMovementPageSerializer();
}

class _$BatteryMovementPageSerializer
    implements PrimitiveSerializer<BatteryMovementPage> {
  @override
  final Iterable<Type> types = const [
    BatteryMovementPage,
    _$BatteryMovementPage
  ];

  @override
  final String wireName = r'BatteryMovementPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BatteryMovementPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(BatteryMovement)]),
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
    BatteryMovementPage object, {
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
    required BatteryMovementPageBuilder result,
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
                const FullType(BuiltList, [FullType(BatteryMovement)]),
          ) as BuiltList<BatteryMovement>;
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
  BatteryMovementPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BatteryMovementPageBuilder();
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
