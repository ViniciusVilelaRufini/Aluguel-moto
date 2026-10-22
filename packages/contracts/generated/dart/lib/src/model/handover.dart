//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/handover_status.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/handover_checklist_item.dart';
import 'package:volti_api/src/model/handover_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'handover.g.dart';

/// Handover
///
/// Properties:
/// * [id]
/// * [type]
/// * [depotId]
/// * [reservationId]
/// * [rentalId] - Preenchido no aceite (`pickup`) ou desde a criação (`return_depot`).
/// * [vehicleId]
/// * [vehicleCode]
/// * [operatorId]
/// * [operatorFirstName]
/// * [checklist]
/// * [photoKeys]
/// * [photoUrls] - Links assinados (24 h), na mesma ordem de `photoKeys`.
/// * [batteryPct]
/// * [batterySerial]
/// * [status]
/// * [lastError] - Slug do último erro do aceite (ex.: `payment-declined`); some quando o aceite dá certo.
/// * [disputeReason]
/// * [createdAt]
/// * [respondedAt] - Aceite ou disputa do cliente.
@BuiltValue()
abstract class Handover implements Built<Handover, HandoverBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'type')
  HandoverType get type;
  // enum typeEnum {  pickup,  return_depot,  };

  @BuiltValueField(wireName: r'depotId')
  String get depotId;

  @BuiltValueField(wireName: r'reservationId')
  String? get reservationId;

  /// Preenchido no aceite (`pickup`) ou desde a criação (`return_depot`).
  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'vehicleCode')
  String? get vehicleCode;

  @BuiltValueField(wireName: r'operatorId')
  String get operatorId;

  @BuiltValueField(wireName: r'operatorFirstName')
  String? get operatorFirstName;

  @BuiltValueField(wireName: r'checklist')
  BuiltList<HandoverChecklistItem> get checklist;

  @BuiltValueField(wireName: r'photoKeys')
  BuiltList<String> get photoKeys;

  /// Links assinados (24 h), na mesma ordem de `photoKeys`.
  @BuiltValueField(wireName: r'photoUrls')
  BuiltList<String>? get photoUrls;

  @BuiltValueField(wireName: r'batteryPct')
  int get batteryPct;

  @BuiltValueField(wireName: r'batterySerial')
  String? get batterySerial;

  @BuiltValueField(wireName: r'status')
  HandoverStatus get status;
  // enum statusEnum {  pending_customer,  accepted,  disputed,  canceled,  };

  /// Slug do último erro do aceite (ex.: `payment-declined`); some quando o aceite dá certo.
  @BuiltValueField(wireName: r'lastError')
  String? get lastError;

  @BuiltValueField(wireName: r'disputeReason')
  String? get disputeReason;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  /// Aceite ou disputa do cliente.
  @BuiltValueField(wireName: r'respondedAt')
  DateTime? get respondedAt;

  Handover._();

  factory Handover([void updates(HandoverBuilder b)]) = _$Handover;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HandoverBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Handover> get serializer => _$HandoverSerializer();
}

class _$HandoverSerializer implements PrimitiveSerializer<Handover> {
  @override
  final Iterable<Type> types = const [Handover, _$Handover];

  @override
  final String wireName = r'Handover';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Handover object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(HandoverType),
    );
    yield r'depotId';
    yield serializers.serialize(
      object.depotId,
      specifiedType: const FullType(String),
    );
    if (object.reservationId != null) {
      yield r'reservationId';
      yield serializers.serialize(
        object.reservationId,
        specifiedType: const FullType(String),
      );
    }
    if (object.rentalId != null) {
      yield r'rentalId';
      yield serializers.serialize(
        object.rentalId,
        specifiedType: const FullType(String),
      );
    }
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
    if (object.vehicleCode != null) {
      yield r'vehicleCode';
      yield serializers.serialize(
        object.vehicleCode,
        specifiedType: const FullType(String),
      );
    }
    yield r'operatorId';
    yield serializers.serialize(
      object.operatorId,
      specifiedType: const FullType(String),
    );
    if (object.operatorFirstName != null) {
      yield r'operatorFirstName';
      yield serializers.serialize(
        object.operatorFirstName,
        specifiedType: const FullType(String),
      );
    }
    yield r'checklist';
    yield serializers.serialize(
      object.checklist,
      specifiedType:
          const FullType(BuiltList, [FullType(HandoverChecklistItem)]),
    );
    yield r'photoKeys';
    yield serializers.serialize(
      object.photoKeys,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
    if (object.photoUrls != null) {
      yield r'photoUrls';
      yield serializers.serialize(
        object.photoUrls,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    yield r'batteryPct';
    yield serializers.serialize(
      object.batteryPct,
      specifiedType: const FullType(int),
    );
    if (object.batterySerial != null) {
      yield r'batterySerial';
      yield serializers.serialize(
        object.batterySerial,
        specifiedType: const FullType(String),
      );
    }
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(HandoverStatus),
    );
    if (object.lastError != null) {
      yield r'lastError';
      yield serializers.serialize(
        object.lastError,
        specifiedType: const FullType(String),
      );
    }
    if (object.disputeReason != null) {
      yield r'disputeReason';
      yield serializers.serialize(
        object.disputeReason,
        specifiedType: const FullType(String),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.respondedAt != null) {
      yield r'respondedAt';
      yield serializers.serialize(
        object.respondedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    Handover object, {
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
    required HandoverBuilder result,
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
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(HandoverType),
          ) as HandoverType;
          result.type = valueDes;
          break;
        case r'depotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.depotId = valueDes;
          break;
        case r'reservationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.reservationId = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rentalId = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
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
        case r'operatorId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.operatorId = valueDes;
          break;
        case r'operatorFirstName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.operatorFirstName = valueDes;
          break;
        case r'checklist':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(HandoverChecklistItem)]),
          ) as BuiltList<HandoverChecklistItem>;
          result.checklist.replace(valueDes);
          break;
        case r'photoKeys':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.photoKeys.replace(valueDes);
          break;
        case r'photoUrls':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(String)]),
          ) as BuiltList<String>?;
          if (valueDes == null) continue;
          result.photoUrls.replace(valueDes);
          break;
        case r'batteryPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.batteryPct = valueDes;
          break;
        case r'batterySerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.batterySerial = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(HandoverStatus),
          ) as HandoverStatus;
          result.status = valueDes;
          break;
        case r'lastError':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.lastError = valueDes;
          break;
        case r'disputeReason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.disputeReason = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'respondedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.respondedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Handover deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HandoverBuilder();
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
