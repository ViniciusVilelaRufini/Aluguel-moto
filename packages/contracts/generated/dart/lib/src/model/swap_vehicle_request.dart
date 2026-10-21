//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'swap_vehicle_request.g.dart';

/// SwapVehicleRequest
///
/// Properties:
/// * [newVehicleId]
/// * [reason]
/// * [incidentId]
@BuiltValue()
abstract class SwapVehicleRequest
    implements Built<SwapVehicleRequest, SwapVehicleRequestBuilder> {
  @BuiltValueField(wireName: r'newVehicleId')
  String get newVehicleId;

  @BuiltValueField(wireName: r'reason')
  String get reason;

  @BuiltValueField(wireName: r'incidentId')
  String? get incidentId;

  SwapVehicleRequest._();

  factory SwapVehicleRequest([void updates(SwapVehicleRequestBuilder b)]) =
      _$SwapVehicleRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SwapVehicleRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SwapVehicleRequest> get serializer =>
      _$SwapVehicleRequestSerializer();
}

class _$SwapVehicleRequestSerializer
    implements PrimitiveSerializer<SwapVehicleRequest> {
  @override
  final Iterable<Type> types = const [SwapVehicleRequest, _$SwapVehicleRequest];

  @override
  final String wireName = r'SwapVehicleRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SwapVehicleRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'newVehicleId';
    yield serializers.serialize(
      object.newVehicleId,
      specifiedType: const FullType(String),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
    if (object.incidentId != null) {
      yield r'incidentId';
      yield serializers.serialize(
        object.incidentId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    SwapVehicleRequest object, {
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
    required SwapVehicleRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'newVehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.newVehicleId = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        case r'incidentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.incidentId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SwapVehicleRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SwapVehicleRequestBuilder();
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
