//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/mercado_pago_webhook_data.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'mercado_pago_webhook_event.g.dart';

/// Formato do Mercado Pago (snake_case, fora da convenção camelCase do contrato).
///
/// Properties:
/// * [id]
/// * [type]
/// * [action]
/// * [liveMode]
/// * [dateCreated]
/// * [userId]
/// * [apiVersion]
/// * [data]
@BuiltValue()
abstract class MercadoPagoWebhookEvent
    implements Built<MercadoPagoWebhookEvent, MercadoPagoWebhookEventBuilder> {
  @BuiltValueField(wireName: r'id')
  int? get id;

  @BuiltValueField(wireName: r'type')
  String get type;

  @BuiltValueField(wireName: r'action')
  String? get action;

  @BuiltValueField(wireName: r'live_mode')
  bool? get liveMode;

  @BuiltValueField(wireName: r'date_created')
  DateTime? get dateCreated;

  @BuiltValueField(wireName: r'user_id')
  int? get userId;

  @BuiltValueField(wireName: r'api_version')
  String? get apiVersion;

  @BuiltValueField(wireName: r'data')
  MercadoPagoWebhookData get data;

  MercadoPagoWebhookEvent._();

  factory MercadoPagoWebhookEvent(
          [void updates(MercadoPagoWebhookEventBuilder b)]) =
      _$MercadoPagoWebhookEvent;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MercadoPagoWebhookEventBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<MercadoPagoWebhookEvent> get serializer =>
      _$MercadoPagoWebhookEventSerializer();
}

class _$MercadoPagoWebhookEventSerializer
    implements PrimitiveSerializer<MercadoPagoWebhookEvent> {
  @override
  final Iterable<Type> types = const [
    MercadoPagoWebhookEvent,
    _$MercadoPagoWebhookEvent
  ];

  @override
  final String wireName = r'MercadoPagoWebhookEvent';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MercadoPagoWebhookEvent object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.id != null) {
      yield r'id';
      yield serializers.serialize(
        object.id,
        specifiedType: const FullType(int),
      );
    }
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(String),
    );
    if (object.action != null) {
      yield r'action';
      yield serializers.serialize(
        object.action,
        specifiedType: const FullType(String),
      );
    }
    if (object.liveMode != null) {
      yield r'live_mode';
      yield serializers.serialize(
        object.liveMode,
        specifiedType: const FullType(bool),
      );
    }
    if (object.dateCreated != null) {
      yield r'date_created';
      yield serializers.serialize(
        object.dateCreated,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.userId != null) {
      yield r'user_id';
      yield serializers.serialize(
        object.userId,
        specifiedType: const FullType(int),
      );
    }
    if (object.apiVersion != null) {
      yield r'api_version';
      yield serializers.serialize(
        object.apiVersion,
        specifiedType: const FullType(String),
      );
    }
    yield r'data';
    yield serializers.serialize(
      object.data,
      specifiedType: const FullType(MercadoPagoWebhookData),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    MercadoPagoWebhookEvent object, {
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
    required MercadoPagoWebhookEventBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.id = valueDes;
          break;
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.type = valueDes;
          break;
        case r'action':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.action = valueDes;
          break;
        case r'live_mode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.liveMode = valueDes;
          break;
        case r'date_created':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.dateCreated = valueDes;
          break;
        case r'user_id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.userId = valueDes;
          break;
        case r'api_version':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.apiVersion = valueDes;
          break;
        case r'data':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(MercadoPagoWebhookData),
          ) as MercadoPagoWebhookData;
          result.data.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  MercadoPagoWebhookEvent deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MercadoPagoWebhookEventBuilder();
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
