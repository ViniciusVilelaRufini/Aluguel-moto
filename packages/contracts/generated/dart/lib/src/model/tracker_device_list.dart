//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/tracker_device.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'tracker_device_list.g.dart';

/// TrackerDeviceList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class TrackerDeviceList
    implements Built<TrackerDeviceList, TrackerDeviceListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<TrackerDevice> get items;

  TrackerDeviceList._();

  factory TrackerDeviceList([void updates(TrackerDeviceListBuilder b)]) =
      _$TrackerDeviceList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(TrackerDeviceListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<TrackerDeviceList> get serializer =>
      _$TrackerDeviceListSerializer();
}

class _$TrackerDeviceListSerializer
    implements PrimitiveSerializer<TrackerDeviceList> {
  @override
  final Iterable<Type> types = const [TrackerDeviceList, _$TrackerDeviceList];

  @override
  final String wireName = r'TrackerDeviceList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    TrackerDeviceList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(TrackerDevice)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    TrackerDeviceList object, {
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
    required TrackerDeviceListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(TrackerDevice)]),
          ) as BuiltList<TrackerDevice>;
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
  TrackerDeviceList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = TrackerDeviceListBuilder();
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
