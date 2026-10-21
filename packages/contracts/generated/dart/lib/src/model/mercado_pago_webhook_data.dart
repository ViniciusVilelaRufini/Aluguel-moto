//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'mercado_pago_webhook_data.g.dart';

/// MercadoPagoWebhookData
///
/// Properties:
/// * [id]
@BuiltValue()
abstract class MercadoPagoWebhookData
    implements Built<MercadoPagoWebhookData, MercadoPagoWebhookDataBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  MercadoPagoWebhookData._();

  factory MercadoPagoWebhookData(
          [void updates(MercadoPagoWebhookDataBuilder b)]) =
      _$MercadoPagoWebhookData;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MercadoPagoWebhookDataBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<MercadoPagoWebhookData> get serializer =>
      _$MercadoPagoWebhookDataSerializer();
}

class _$MercadoPagoWebhookDataSerializer
    implements PrimitiveSerializer<MercadoPagoWebhookData> {
  @override
  final Iterable<Type> types = const [
    MercadoPagoWebhookData,
    _$MercadoPagoWebhookData
  ];

  @override
  final String wireName = r'MercadoPagoWebhookData';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MercadoPagoWebhookData object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    MercadoPagoWebhookData object, {
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
    required MercadoPagoWebhookDataBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  MercadoPagoWebhookData deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MercadoPagoWebhookDataBuilder();
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
