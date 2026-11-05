//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/tracker_model.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'create_tracker_request.g.dart';

/// CreateTrackerRequest
///
/// Properties:
/// * [imei]
/// * [model]
/// * [simCardId] - Chip do estoque a vincular ao rastreador.
@BuiltValue()
abstract class CreateTrackerRequest
    implements Built<CreateTrackerRequest, CreateTrackerRequestBuilder> {
  @BuiltValueField(wireName: r'imei')
  String get imei;

  @BuiltValueField(wireName: r'model')
  TrackerModel get model;
  // enum modelEnum {  J16,  };

  /// Chip do estoque a vincular ao rastreador.
  @BuiltValueField(wireName: r'simCardId')
  String? get simCardId;

  CreateTrackerRequest._();

  factory CreateTrackerRequest([void updates(CreateTrackerRequestBuilder b)]) =
      _$CreateTrackerRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreateTrackerRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreateTrackerRequest> get serializer =>
      _$CreateTrackerRequestSerializer();
}

class _$CreateTrackerRequestSerializer
    implements PrimitiveSerializer<CreateTrackerRequest> {
  @override
  final Iterable<Type> types = const [
    CreateTrackerRequest,
    _$CreateTrackerRequest
  ];

  @override
  final String wireName = r'CreateTrackerRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreateTrackerRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'imei';
    yield serializers.serialize(
      object.imei,
      specifiedType: const FullType(String),
    );
    yield r'model';
    yield serializers.serialize(
      object.model,
      specifiedType: const FullType(TrackerModel),
    );
    if (object.simCardId != null) {
      yield r'simCardId';
      yield serializers.serialize(
        object.simCardId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CreateTrackerRequest object, {
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
    required CreateTrackerRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'imei':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.imei = valueDes;
          break;
        case r'model':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(TrackerModel),
          ) as TrackerModel;
          result.model = valueDes;
          break;
        case r'simCardId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.simCardId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CreateTrackerRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CreateTrackerRequestBuilder();
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
