//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'station_swap_request.g.dart';

/// StationSwapRequest
///
/// Properties:
/// * [stationCode] - Conteúdo do QR fixo da estação.
/// * [rentalId]
/// * [lat] - Posição do celular (só para a validação de 50 m).
/// * [lng]
@BuiltValue()
abstract class StationSwapRequest
    implements Built<StationSwapRequest, StationSwapRequestBuilder> {
  /// Conteúdo do QR fixo da estação.
  @BuiltValueField(wireName: r'stationCode')
  String get stationCode;

  @BuiltValueField(wireName: r'rentalId')
  String get rentalId;

  /// Posição do celular (só para a validação de 50 m).
  @BuiltValueField(wireName: r'lat')
  double get lat;

  @BuiltValueField(wireName: r'lng')
  double get lng;

  StationSwapRequest._();

  factory StationSwapRequest([void updates(StationSwapRequestBuilder b)]) =
      _$StationSwapRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(StationSwapRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<StationSwapRequest> get serializer =>
      _$StationSwapRequestSerializer();
}

class _$StationSwapRequestSerializer
    implements PrimitiveSerializer<StationSwapRequest> {
  @override
  final Iterable<Type> types = const [StationSwapRequest, _$StationSwapRequest];

  @override
  final String wireName = r'StationSwapRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    StationSwapRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'stationCode';
    yield serializers.serialize(
      object.stationCode,
      specifiedType: const FullType(String),
    );
    yield r'rentalId';
    yield serializers.serialize(
      object.rentalId,
      specifiedType: const FullType(String),
    );
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
  }

  @override
  Object serialize(
    Serializers serializers,
    StationSwapRequest object, {
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
    required StationSwapRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'stationCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.stationCode = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.rentalId = valueDes;
          break;
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  StationSwapRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = StationSwapRequestBuilder();
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
