//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/sim_card_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'update_sim_card_request.g.dart';

/// Todos os campos são opcionais. `vehicleId: null` ou `trackerId: null` desvincula. `vehicleId` e `trackerId` juntos → 400.
///
/// Properties:
/// * [iccid]
/// * [msisdn]
/// * [carrier]
/// * [apn]
/// * [status]
/// * [notes]
/// * [vehicleId]
/// * [trackerId] - Vincula (ou move) o chip a este rastreador; `null` desvincula.
@BuiltValue()
abstract class UpdateSimCardRequest
    implements Built<UpdateSimCardRequest, UpdateSimCardRequestBuilder> {
  @BuiltValueField(wireName: r'iccid')
  String? get iccid;

  @BuiltValueField(wireName: r'msisdn')
  String? get msisdn;

  @BuiltValueField(wireName: r'carrier')
  String? get carrier;

  @BuiltValueField(wireName: r'apn')
  String? get apn;

  @BuiltValueField(wireName: r'status')
  SimCardStatus? get status;
  // enum statusEnum {  active,  suspended,  cancelled,  };

  @BuiltValueField(wireName: r'notes')
  String? get notes;

  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  /// Vincula (ou move) o chip a este rastreador; `null` desvincula.
  @BuiltValueField(wireName: r'trackerId')
  String? get trackerId;

  UpdateSimCardRequest._();

  factory UpdateSimCardRequest([void updates(UpdateSimCardRequestBuilder b)]) =
      _$UpdateSimCardRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UpdateSimCardRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UpdateSimCardRequest> get serializer =>
      _$UpdateSimCardRequestSerializer();
}

class _$UpdateSimCardRequestSerializer
    implements PrimitiveSerializer<UpdateSimCardRequest> {
  @override
  final Iterable<Type> types = const [
    UpdateSimCardRequest,
    _$UpdateSimCardRequest
  ];

  @override
  final String wireName = r'UpdateSimCardRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UpdateSimCardRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.iccid != null) {
      yield r'iccid';
      yield serializers.serialize(
        object.iccid,
        specifiedType: const FullType(String),
      );
    }
    if (object.msisdn != null) {
      yield r'msisdn';
      yield serializers.serialize(
        object.msisdn,
        specifiedType: const FullType.nullable(String),
      );
    }
    if (object.carrier != null) {
      yield r'carrier';
      yield serializers.serialize(
        object.carrier,
        specifiedType: const FullType(String),
      );
    }
    if (object.apn != null) {
      yield r'apn';
      yield serializers.serialize(
        object.apn,
        specifiedType: const FullType.nullable(String),
      );
    }
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(SimCardStatus),
      );
    }
    if (object.notes != null) {
      yield r'notes';
      yield serializers.serialize(
        object.notes,
        specifiedType: const FullType.nullable(String),
      );
    }
    if (object.vehicleId != null) {
      yield r'vehicleId';
      yield serializers.serialize(
        object.vehicleId,
        specifiedType: const FullType.nullable(String),
      );
    }
    if (object.trackerId != null) {
      yield r'trackerId';
      yield serializers.serialize(
        object.trackerId,
        specifiedType: const FullType.nullable(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    UpdateSimCardRequest object, {
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
    required UpdateSimCardRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'iccid':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
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
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
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
            specifiedType: const FullType.nullable(SimCardStatus),
          ) as SimCardStatus?;
          if (valueDes == null) continue;
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
        case r'trackerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.trackerId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  UpdateSimCardRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UpdateSimCardRequestBuilder();
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
