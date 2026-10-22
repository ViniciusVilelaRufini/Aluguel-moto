//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'swap_station_qr.g.dart';

/// SwapStationQr
///
/// Properties:
/// * [stationId]
/// * [stationCode] - Conteúdo do QR (`vst1.<stationId>.<assinatura>`), sem dado pessoal.
@BuiltValue()
abstract class SwapStationQr
    implements Built<SwapStationQr, SwapStationQrBuilder> {
  @BuiltValueField(wireName: r'stationId')
  String get stationId;

  /// Conteúdo do QR (`vst1.<stationId>.<assinatura>`), sem dado pessoal.
  @BuiltValueField(wireName: r'stationCode')
  String get stationCode;

  SwapStationQr._();

  factory SwapStationQr([void updates(SwapStationQrBuilder b)]) =
      _$SwapStationQr;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SwapStationQrBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SwapStationQr> get serializer =>
      _$SwapStationQrSerializer();
}

class _$SwapStationQrSerializer implements PrimitiveSerializer<SwapStationQr> {
  @override
  final Iterable<Type> types = const [SwapStationQr, _$SwapStationQr];

  @override
  final String wireName = r'SwapStationQr';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SwapStationQr object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'stationId';
    yield serializers.serialize(
      object.stationId,
      specifiedType: const FullType(String),
    );
    yield r'stationCode';
    yield serializers.serialize(
      object.stationCode,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SwapStationQr object, {
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
    required SwapStationQrBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'stationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.stationId = valueDes;
          break;
        case r'stationCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.stationCode = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SwapStationQr deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SwapStationQrBuilder();
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
