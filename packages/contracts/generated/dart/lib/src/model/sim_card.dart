//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/sim_card_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'sim_card.g.dart';

/// SimCard
///
/// Properties:
/// * [id]
/// * [iccid]
/// * [msisdn] - Número da linha.
/// * [carrier]
/// * [apn]
/// * [status]
/// * [notes]
/// * [vehicleId] - Moto do rastreador vinculado.
/// * [vehicleCode]
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class SimCard implements Built<SimCard, SimCardBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'iccid')
  String get iccid;

  /// Número da linha.
  @BuiltValueField(wireName: r'msisdn')
  String? get msisdn;

  @BuiltValueField(wireName: r'carrier')
  String get carrier;

  @BuiltValueField(wireName: r'apn')
  String? get apn;

  @BuiltValueField(wireName: r'status')
  SimCardStatus get status;
  // enum statusEnum {  active,  suspended,  cancelled,  };

  @BuiltValueField(wireName: r'notes')
  String? get notes;

  /// Moto do rastreador vinculado.
  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  @BuiltValueField(wireName: r'vehicleCode')
  String? get vehicleCode;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  SimCard._();

  factory SimCard([void updates(SimCardBuilder b)]) = _$SimCard;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SimCardBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SimCard> get serializer => _$SimCardSerializer();
}

class _$SimCardSerializer implements PrimitiveSerializer<SimCard> {
  @override
  final Iterable<Type> types = const [SimCard, _$SimCard];

  @override
  final String wireName = r'SimCard';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SimCard object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'iccid';
    yield serializers.serialize(
      object.iccid,
      specifiedType: const FullType(String),
    );
    yield r'msisdn';
    yield object.msisdn == null
        ? null
        : serializers.serialize(
            object.msisdn,
            specifiedType: const FullType.nullable(String),
          );
    yield r'carrier';
    yield serializers.serialize(
      object.carrier,
      specifiedType: const FullType(String),
    );
    yield r'apn';
    yield object.apn == null
        ? null
        : serializers.serialize(
            object.apn,
            specifiedType: const FullType.nullable(String),
          );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(SimCardStatus),
    );
    yield r'notes';
    yield object.notes == null
        ? null
        : serializers.serialize(
            object.notes,
            specifiedType: const FullType.nullable(String),
          );
    yield r'vehicleId';
    yield object.vehicleId == null
        ? null
        : serializers.serialize(
            object.vehicleId,
            specifiedType: const FullType.nullable(String),
          );
    yield r'vehicleCode';
    yield object.vehicleCode == null
        ? null
        : serializers.serialize(
            object.vehicleCode,
            specifiedType: const FullType.nullable(String),
          );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'updatedAt';
    yield serializers.serialize(
      object.updatedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SimCard object, {
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
    required SimCardBuilder result,
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
        case r'iccid':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.iccid = valueDes;
          break;
        case r'msisdn':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.msisdn = valueDes;
          break;
        case r'carrier':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.carrier = valueDes;
          break;
        case r'apn':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.apn = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SimCardStatus),
          ) as SimCardStatus;
          result.status = valueDes;
          break;
        case r'notes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.notes = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleId = valueDes;
          break;
        case r'vehicleCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleCode = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.updatedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SimCard deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SimCardBuilder();
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
