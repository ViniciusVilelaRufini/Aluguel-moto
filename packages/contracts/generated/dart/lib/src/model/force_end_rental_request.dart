//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'force_end_rental_request.g.dart';

/// ForceEndRentalRequest
///
/// Properties:
/// * [reason]
@BuiltValue()
abstract class ForceEndRentalRequest
    implements Built<ForceEndRentalRequest, ForceEndRentalRequestBuilder> {
  @BuiltValueField(wireName: r'reason')
  String get reason;

  ForceEndRentalRequest._();

  factory ForceEndRentalRequest(
      [void updates(ForceEndRentalRequestBuilder b)]) = _$ForceEndRentalRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ForceEndRentalRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ForceEndRentalRequest> get serializer =>
      _$ForceEndRentalRequestSerializer();
}

class _$ForceEndRentalRequestSerializer
    implements PrimitiveSerializer<ForceEndRentalRequest> {
  @override
  final Iterable<Type> types = const [
    ForceEndRentalRequest,
    _$ForceEndRentalRequest
  ];

  @override
  final String wireName = r'ForceEndRentalRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ForceEndRentalRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ForceEndRentalRequest object, {
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
    required ForceEndRentalRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ForceEndRentalRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ForceEndRentalRequestBuilder();
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
