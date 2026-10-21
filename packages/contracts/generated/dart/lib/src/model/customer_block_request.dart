//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_block_request.g.dart';

/// CustomerBlockRequest
///
/// Properties:
/// * [reason]
/// * [addToRestrictionList]
@BuiltValue()
abstract class CustomerBlockRequest
    implements Built<CustomerBlockRequest, CustomerBlockRequestBuilder> {
  @BuiltValueField(wireName: r'reason')
  String get reason;

  @BuiltValueField(wireName: r'addToRestrictionList')
  bool? get addToRestrictionList;

  CustomerBlockRequest._();

  factory CustomerBlockRequest([void updates(CustomerBlockRequestBuilder b)]) =
      _$CustomerBlockRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CustomerBlockRequestBuilder b) =>
      b..addToRestrictionList = false;

  @BuiltValueSerializer(custom: true)
  static Serializer<CustomerBlockRequest> get serializer =>
      _$CustomerBlockRequestSerializer();
}

class _$CustomerBlockRequestSerializer
    implements PrimitiveSerializer<CustomerBlockRequest> {
  @override
  final Iterable<Type> types = const [
    CustomerBlockRequest,
    _$CustomerBlockRequest
  ];

  @override
  final String wireName = r'CustomerBlockRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CustomerBlockRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
    if (object.addToRestrictionList != null) {
      yield r'addToRestrictionList';
      yield serializers.serialize(
        object.addToRestrictionList,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CustomerBlockRequest object, {
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
    required CustomerBlockRequestBuilder result,
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
        case r'addToRestrictionList':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.addToRestrictionList = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CustomerBlockRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CustomerBlockRequestBuilder();
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
