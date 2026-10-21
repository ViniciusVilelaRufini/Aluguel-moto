//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'alert_resolve_request.g.dart';

/// AlertResolveRequest
///
/// Properties:
/// * [resolution]
@BuiltValue()
abstract class AlertResolveRequest
    implements Built<AlertResolveRequest, AlertResolveRequestBuilder> {
  @BuiltValueField(wireName: r'resolution')
  String get resolution;

  AlertResolveRequest._();

  factory AlertResolveRequest([void updates(AlertResolveRequestBuilder b)]) =
      _$AlertResolveRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AlertResolveRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AlertResolveRequest> get serializer =>
      _$AlertResolveRequestSerializer();
}

class _$AlertResolveRequestSerializer
    implements PrimitiveSerializer<AlertResolveRequest> {
  @override
  final Iterable<Type> types = const [
    AlertResolveRequest,
    _$AlertResolveRequest
  ];

  @override
  final String wireName = r'AlertResolveRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AlertResolveRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'resolution';
    yield serializers.serialize(
      object.resolution,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AlertResolveRequest object, {
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
    required AlertResolveRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'resolution':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.resolution = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AlertResolveRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AlertResolveRequestBuilder();
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
