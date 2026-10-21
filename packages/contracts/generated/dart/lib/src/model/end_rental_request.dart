//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'end_rental_request.g.dart';

/// EndRentalRequest
///
/// Properties:
/// * [returnPhotoObjectKey] - `objectKey` devolvido por `createReturnPhotoUpload`.
@BuiltValue()
abstract class EndRentalRequest
    implements Built<EndRentalRequest, EndRentalRequestBuilder> {
  /// `objectKey` devolvido por `createReturnPhotoUpload`.
  @BuiltValueField(wireName: r'returnPhotoObjectKey')
  String get returnPhotoObjectKey;

  EndRentalRequest._();

  factory EndRentalRequest([void updates(EndRentalRequestBuilder b)]) =
      _$EndRentalRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(EndRentalRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<EndRentalRequest> get serializer =>
      _$EndRentalRequestSerializer();
}

class _$EndRentalRequestSerializer
    implements PrimitiveSerializer<EndRentalRequest> {
  @override
  final Iterable<Type> types = const [EndRentalRequest, _$EndRentalRequest];

  @override
  final String wireName = r'EndRentalRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    EndRentalRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'returnPhotoObjectKey';
    yield serializers.serialize(
      object.returnPhotoObjectKey,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    EndRentalRequest object, {
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
    required EndRentalRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'returnPhotoObjectKey':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.returnPhotoObjectKey = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  EndRentalRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = EndRentalRequestBuilder();
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
