//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'track_point.g.dart';

/// TrackPoint
///
/// Properties:
/// * [lat]
/// * [lng]
/// * [speedKmh]
/// * [recordedAt]
@BuiltValue()
abstract class TrackPoint implements Built<TrackPoint, TrackPointBuilder> {
  @BuiltValueField(wireName: r'lat')
  double get lat;

  @BuiltValueField(wireName: r'lng')
  double get lng;

  @BuiltValueField(wireName: r'speedKmh')
  double get speedKmh;

  @BuiltValueField(wireName: r'recordedAt')
  DateTime get recordedAt;

  TrackPoint._();

  factory TrackPoint([void updates(TrackPointBuilder b)]) = _$TrackPoint;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(TrackPointBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<TrackPoint> get serializer => _$TrackPointSerializer();
}

class _$TrackPointSerializer implements PrimitiveSerializer<TrackPoint> {
  @override
  final Iterable<Type> types = const [TrackPoint, _$TrackPoint];

  @override
  final String wireName = r'TrackPoint';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    TrackPoint object, {
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
    yield r'speedKmh';
    yield serializers.serialize(
      object.speedKmh,
      specifiedType: const FullType(double),
    );
    yield r'recordedAt';
    yield serializers.serialize(
      object.recordedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    TrackPoint object, {
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
    required TrackPointBuilder result,
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
        case r'speedKmh':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.speedKmh = valueDes;
          break;
        case r'recordedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.recordedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  TrackPoint deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = TrackPointBuilder();
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
