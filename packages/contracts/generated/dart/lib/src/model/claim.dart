//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/claim_status.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/claim_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'claim.g.dart';

/// Claim
///
/// Properties:
/// * [id]
/// * [customerId]
/// * [rentalId]
/// * [incidentId]
/// * [insurancePolicyId]
/// * [providerClaimId]
/// * [type]
/// * [status]
/// * [description]
/// * [occurredAt]
/// * [lat]
/// * [lng]
/// * [photoObjectKeys]
/// * [statusNote]
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class Claim implements Built<Claim, ClaimBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'customerId')
  String get customerId;

  @BuiltValueField(wireName: r'rentalId')
  String get rentalId;

  @BuiltValueField(wireName: r'incidentId')
  String? get incidentId;

  @BuiltValueField(wireName: r'insurancePolicyId')
  String? get insurancePolicyId;

  @BuiltValueField(wireName: r'providerClaimId')
  String? get providerClaimId;

  @BuiltValueField(wireName: r'type')
  ClaimType get type;
  // enum typeEnum {  accident,  theft,  damage,  personal_injury,  };

  @BuiltValueField(wireName: r'status')
  ClaimStatus get status;
  // enum statusEnum {  submitted,  under_review,  approved,  rejected,  paid,  };

  @BuiltValueField(wireName: r'description')
  String get description;

  @BuiltValueField(wireName: r'occurredAt')
  DateTime get occurredAt;

  @BuiltValueField(wireName: r'lat')
  double? get lat;

  @BuiltValueField(wireName: r'lng')
  double? get lng;

  @BuiltValueField(wireName: r'photoObjectKeys')
  BuiltList<String>? get photoObjectKeys;

  @BuiltValueField(wireName: r'statusNote')
  String? get statusNote;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  Claim._();

  factory Claim([void updates(ClaimBuilder b)]) = _$Claim;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ClaimBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Claim> get serializer => _$ClaimSerializer();
}

class _$ClaimSerializer implements PrimitiveSerializer<Claim> {
  @override
  final Iterable<Type> types = const [Claim, _$Claim];

  @override
  final String wireName = r'Claim';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Claim object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'customerId';
    yield serializers.serialize(
      object.customerId,
      specifiedType: const FullType(String),
    );
    yield r'rentalId';
    yield serializers.serialize(
      object.rentalId,
      specifiedType: const FullType(String),
    );
    if (object.incidentId != null) {
      yield r'incidentId';
      yield serializers.serialize(
        object.incidentId,
        specifiedType: const FullType(String),
      );
    }
    if (object.insurancePolicyId != null) {
      yield r'insurancePolicyId';
      yield serializers.serialize(
        object.insurancePolicyId,
        specifiedType: const FullType(String),
      );
    }
    if (object.providerClaimId != null) {
      yield r'providerClaimId';
      yield serializers.serialize(
        object.providerClaimId,
        specifiedType: const FullType(String),
      );
    }
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(ClaimType),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(ClaimStatus),
    );
    yield r'description';
    yield serializers.serialize(
      object.description,
      specifiedType: const FullType(String),
    );
    yield r'occurredAt';
    yield serializers.serialize(
      object.occurredAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.lat != null) {
      yield r'lat';
      yield serializers.serialize(
        object.lat,
        specifiedType: const FullType(double),
      );
    }
    if (object.lng != null) {
      yield r'lng';
      yield serializers.serialize(
        object.lng,
        specifiedType: const FullType(double),
      );
    }
    if (object.photoObjectKeys != null) {
      yield r'photoObjectKeys';
      yield serializers.serialize(
        object.photoObjectKeys,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    if (object.statusNote != null) {
      yield r'statusNote';
      yield serializers.serialize(
        object.statusNote,
        specifiedType: const FullType(String),
      );
    }
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
    Claim object, {
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
    required ClaimBuilder result,
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
        case r'customerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.customerId = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.rentalId = valueDes;
          break;
        case r'incidentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.incidentId = valueDes;
          break;
        case r'insurancePolicyId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.insurancePolicyId = valueDes;
          break;
        case r'providerClaimId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.providerClaimId = valueDes;
          break;
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ClaimType),
          ) as ClaimType;
          result.type = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ClaimStatus),
          ) as ClaimStatus;
          result.status = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.description = valueDes;
          break;
        case r'occurredAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.occurredAt = valueDes;
          break;
        case r'lat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.lat = valueDes;
          break;
        case r'lng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.lng = valueDes;
          break;
        case r'photoObjectKeys':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(String)]),
          ) as BuiltList<String>?;
          if (valueDes == null) continue;
          result.photoObjectKeys.replace(valueDes);
          break;
        case r'statusNote':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.statusNote = valueDes;
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
  Claim deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ClaimBuilder();
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
