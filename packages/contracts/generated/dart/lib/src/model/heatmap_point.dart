//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'heatmap_point.g.dart';

/// HeatmapPoint
///
/// Properties:
/// * [lat]
/// * [lng]
/// * [weight] - Quantidade de inícios de aluguel na célula.
@BuiltValue()
abstract class HeatmapPoint
    implements Built<HeatmapPoint, HeatmapPointBuilder> {
  @BuiltValueField(wireName: r'lat')
  double get lat;

  @BuiltValueField(wireName: r'lng')
  double get lng;

  /// Quantidade de inícios de aluguel na célula.
  @BuiltValueField(wireName: r'weight')
  int get weight;

  HeatmapPoint._();

  factory HeatmapPoint([void updates(HeatmapPointBuilder b)]) = _$HeatmapPoint;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HeatmapPointBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<HeatmapPoint> get serializer => _$HeatmapPointSerializer();
}

class _$HeatmapPointSerializer implements PrimitiveSerializer<HeatmapPoint> {
  @override
  final Iterable<Type> types = const [HeatmapPoint, _$HeatmapPoint];

  @override
  final String wireName = r'HeatmapPoint';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    HeatmapPoint object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'lat';
    yield serializers.serialize(
      object.lat,
      specifiedType: const FullType(double),
    );
    yield r'lng';
    yield serializers.serialize(
      object.lng,
      specifiedType: const FullType(double),
    );
    yield r'weight';
    yield serializers.serialize(
      object.weight,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    HeatmapPoint object, {
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
    required HeatmapPointBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'lat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.lat = valueDes;
          break;
        case r'lng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.lng = valueDes;
          break;
        case r'weight':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.weight = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  HeatmapPoint deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HeatmapPointBuilder();
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
