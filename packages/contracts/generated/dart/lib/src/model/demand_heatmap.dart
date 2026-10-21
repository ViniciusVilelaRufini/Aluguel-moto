//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/heatmap_point.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'demand_heatmap.g.dart';

/// DemandHeatmap
///
/// Properties:
/// * [from]
/// * [to]
/// * [points]
@BuiltValue()
abstract class DemandHeatmap
    implements Built<DemandHeatmap, DemandHeatmapBuilder> {
  @BuiltValueField(wireName: r'from')
  DateTime get from;

  @BuiltValueField(wireName: r'to')
  DateTime get to;

  @BuiltValueField(wireName: r'points')
  BuiltList<HeatmapPoint> get points;

  DemandHeatmap._();

  factory DemandHeatmap([void updates(DemandHeatmapBuilder b)]) =
      _$DemandHeatmap;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DemandHeatmapBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DemandHeatmap> get serializer =>
      _$DemandHeatmapSerializer();
}

class _$DemandHeatmapSerializer implements PrimitiveSerializer<DemandHeatmap> {
  @override
  final Iterable<Type> types = const [DemandHeatmap, _$DemandHeatmap];

  @override
  final String wireName = r'DemandHeatmap';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DemandHeatmap object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'from';
    yield serializers.serialize(
      object.from,
      specifiedType: const FullType(DateTime),
    );
    yield r'to';
    yield serializers.serialize(
      object.to,
      specifiedType: const FullType(DateTime),
    );
    yield r'points';
    yield serializers.serialize(
      object.points,
      specifiedType: const FullType(BuiltList, [FullType(HeatmapPoint)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    DemandHeatmap object, {
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
    required DemandHeatmapBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'from':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.from = valueDes;
          break;
        case r'to':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.to = valueDes;
          break;
        case r'points':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(HeatmapPoint)]),
          ) as BuiltList<HeatmapPoint>;
          result.points.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DemandHeatmap deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DemandHeatmapBuilder();
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
