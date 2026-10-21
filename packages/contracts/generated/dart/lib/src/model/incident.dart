//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/actor_type.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/incident_category.dart';
import 'package:volti_api/src/model/incident_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'incident.g.dart';

/// Incident
///
/// Properties:
/// * [id]
/// * [customerId]
/// * [rentalId]
/// * [vehicleId]
/// * [category]
/// * [status]
/// * [description]
/// * [photoObjectKeys]
/// * [lat]
/// * [lng]
/// * [resolutionNote]
/// * [createdById]
/// * [createdByType]
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class Incident implements Built<Incident, IncidentBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'customerId')
  String? get customerId;

  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  @BuiltValueField(wireName: r'category')
  IncidentCategory get category;
  // enum categoryEnum {  vehicle_problem,  accident,  theft,  app_problem,  parking,  other,  };

  @BuiltValueField(wireName: r'status')
  IncidentStatus get status;
  // enum statusEnum {  open,  in_progress,  resolved,  closed,  };

  @BuiltValueField(wireName: r'description')
  String get description;

  @BuiltValueField(wireName: r'photoObjectKeys')
  BuiltList<String>? get photoObjectKeys;

  @BuiltValueField(wireName: r'lat')
  double? get lat;

  @BuiltValueField(wireName: r'lng')
  double? get lng;

  @BuiltValueField(wireName: r'resolutionNote')
  String? get resolutionNote;

  @BuiltValueField(wireName: r'createdById')
  String? get createdById;

  @BuiltValueField(wireName: r'createdByType')
  ActorType? get createdByType;
  // enum createdByTypeEnum {  customer,  staff,  system,  };

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  Incident._();

  factory Incident([void updates(IncidentBuilder b)]) = _$Incident;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(IncidentBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Incident> get serializer => _$IncidentSerializer();
}

class _$IncidentSerializer implements PrimitiveSerializer<Incident> {
  @override
  final Iterable<Type> types = const [Incident, _$Incident];

  @override
  final String wireName = r'Incident';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Incident object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    if (object.customerId != null) {
      yield r'customerId';
      yield serializers.serialize(
        object.customerId,
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
    if (object.vehicleId != null) {
      yield r'vehicleId';
      yield serializers.serialize(
        object.vehicleId,
        specifiedType: const FullType(String),
      );
    }
    yield r'category';
    yield serializers.serialize(
      object.category,
      specifiedType: const FullType(IncidentCategory),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(IncidentStatus),
    );
    yield r'description';
    yield serializers.serialize(
      object.description,
      specifiedType: const FullType(String),
    );
    if (object.photoObjectKeys != null) {
      yield r'photoObjectKeys';
      yield serializers.serialize(
        object.photoObjectKeys,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
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
    if (object.resolutionNote != null) {
      yield r'resolutionNote';
      yield serializers.serialize(
        object.resolutionNote,
        specifiedType: const FullType(String),
      );
    }
    if (object.createdById != null) {
      yield r'createdById';
      yield serializers.serialize(
        object.createdById,
        specifiedType: const FullType(String),
      );
    }
    if (object.createdByType != null) {
      yield r'createdByType';
      yield serializers.serialize(
        object.createdByType,
        specifiedType: const FullType(ActorType),
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
    Incident object, {
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
    required IncidentBuilder result,
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
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.customerId = valueDes;
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
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleId = valueDes;
          break;
        case r'category':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(IncidentCategory),
          ) as IncidentCategory;
          result.category = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(IncidentStatus),
          ) as IncidentStatus;
          result.status = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.description = valueDes;
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
        case r'resolutionNote':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.resolutionNote = valueDes;
          break;
        case r'createdById':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.createdById = valueDes;
          break;
        case r'createdByType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(ActorType),
          ) as ActorType?;
          if (valueDes == null) continue;
          result.createdByType = valueDes;
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
  Incident deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = IncidentBuilder();
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
