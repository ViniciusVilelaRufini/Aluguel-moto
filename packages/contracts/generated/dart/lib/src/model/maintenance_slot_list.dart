//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/maintenance_slot.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'maintenance_slot_list.g.dart';

/// MaintenanceSlotList
///
/// Properties:
/// * [location] - Onde a manutenção acontece (pt-BR).
/// * [items]
@BuiltValue()
abstract class MaintenanceSlotList
    implements Built<MaintenanceSlotList, MaintenanceSlotListBuilder> {
  /// Onde a manutenção acontece (pt-BR).
  @BuiltValueField(wireName: r'location')
  String get location;

  @BuiltValueField(wireName: r'items')
  BuiltList<MaintenanceSlot> get items;

  MaintenanceSlotList._();

  factory MaintenanceSlotList([void updates(MaintenanceSlotListBuilder b)]) =
      _$MaintenanceSlotList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MaintenanceSlotListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<MaintenanceSlotList> get serializer =>
      _$MaintenanceSlotListSerializer();
}

class _$MaintenanceSlotListSerializer
    implements PrimitiveSerializer<MaintenanceSlotList> {
  @override
  final Iterable<Type> types = const [
    MaintenanceSlotList,
    _$MaintenanceSlotList
  ];

  @override
  final String wireName = r'MaintenanceSlotList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MaintenanceSlotList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'location';
    yield serializers.serialize(
      object.location,
      specifiedType: const FullType(String),
    );
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(MaintenanceSlot)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    MaintenanceSlotList object, {
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
    required MaintenanceSlotListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'location':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.location = valueDes;
          break;
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(MaintenanceSlot)]),
          ) as BuiltList<MaintenanceSlot>;
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
  MaintenanceSlotList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MaintenanceSlotListBuilder();
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
