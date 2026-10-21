//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'pix_charge.g.dart';

/// PixCharge
///
/// Properties:
/// * [chargeId]
/// * [qrCodeBase64] - PNG do QR em base64.
/// * [copyPaste] - Código \"copia e cola\".
/// * [expiresAt]
@BuiltValue()
abstract class PixCharge implements Built<PixCharge, PixChargeBuilder> {
  @BuiltValueField(wireName: r'chargeId')
  String get chargeId;

  /// PNG do QR em base64.
  @BuiltValueField(wireName: r'qrCodeBase64')
  String get qrCodeBase64;

  /// Código \"copia e cola\".
  @BuiltValueField(wireName: r'copyPaste')
  String get copyPaste;

  @BuiltValueField(wireName: r'expiresAt')
  DateTime get expiresAt;

  PixCharge._();

  factory PixCharge([void updates(PixChargeBuilder b)]) = _$PixCharge;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PixChargeBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PixCharge> get serializer => _$PixChargeSerializer();
}

class _$PixChargeSerializer implements PrimitiveSerializer<PixCharge> {
  @override
  final Iterable<Type> types = const [PixCharge, _$PixCharge];

  @override
  final String wireName = r'PixCharge';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PixCharge object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'chargeId';
    yield serializers.serialize(
      object.chargeId,
      specifiedType: const FullType(String),
    );
    yield r'qrCodeBase64';
    yield serializers.serialize(
      object.qrCodeBase64,
      specifiedType: const FullType(String),
    );
    yield r'copyPaste';
    yield serializers.serialize(
      object.copyPaste,
      specifiedType: const FullType(String),
    );
    yield r'expiresAt';
    yield serializers.serialize(
      object.expiresAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PixCharge object, {
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
    required PixChargeBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'chargeId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.chargeId = valueDes;
          break;
        case r'qrCodeBase64':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.qrCodeBase64 = valueDes;
          break;
        case r'copyPaste':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.copyPaste = valueDes;
          break;
        case r'expiresAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.expiresAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PixCharge deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PixChargeBuilder();
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
