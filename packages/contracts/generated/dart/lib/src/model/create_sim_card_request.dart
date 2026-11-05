//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/sim_card_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'create_sim_card_request.g.dart';

/// CreateSimCardRequest
///
/// Properties:
/// * [iccid]
/// * [msisdn]
/// * [carrier]
/// * [apn]
/// * [status]
/// * [notes]
/// * [vehicleId] - Vincula o chip ao rastreador desta moto.
/// * [trackerId] - Vincula o chip a este rastreador (estoque ou instalado). `vehicleId` e `trackerId` juntos → 400.
@BuiltValue()
abstract class CreateSimCardRequest
    implements Built<CreateSimCardRequest, CreateSimCardRequestBuilder> {
  @BuiltValueField(wireName: r'iccid')
  String get iccid;

  @BuiltValueField(wireName: r'msisdn')
  String? get msisdn;

  @BuiltValueField(wireName: r'carrier')
  String get carrier;

  @BuiltValueField(wireName: r'apn')
  String? get apn;

  @BuiltValueField(wireName: r'status')
  SimCardStatus? get status;
  // enum statusEnum {  active,  suspended,  cancelled,  };

  @BuiltValueField(wireName: r'notes')
  String? get notes;

  /// Vincula o chip ao rastreador desta moto.
  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  /// Vincula o chip a este rastreador (estoque ou instalado). `vehicleId` e `trackerId` juntos → 400.
  @BuiltValueField(wireName: r'trackerId')
  String? get trackerId;

  CreateSimCardRequest._();

  factory CreateSimCardRequest([void updates(CreateSimCardRequestBuilder b)]) =
      _$CreateSimCardRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreateSimCardRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreateSimCardRequest> get serializer =>
      _$CreateSimCardRequestSerializer();
}

class _$CreateSimCardRequestSerializer
    implements PrimitiveSerializer<CreateSimCardRequest> {
  @override
  final Iterable<Type> types = const [
    CreateSimCardRequest,
    _$CreateSimCardRequest
  ];

  @override
  final String wireName = r'CreateSimCardRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreateSimCardRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'iccid';
    yield serializers.serialize(
      object.iccid,
      specifiedType: const FullType(String),
    );
    if (object.msisdn != null) {
      yield r'msisdn';
      yield serializers.serialize(
        object.msisdn,
        specifiedType: const FullType.nullable(String),
      );
    }
    yield r'carrier';
    yield serializers.serialize(
      object.carrier,
      specifiedType: const FullType(String),
    );
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
    CreateSimCardRequest object, {
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
    required CreateSimCardRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
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
  CreateSimCardRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CreateSimCardRequestBuilder();
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
