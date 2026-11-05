//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'install_tracker_request.g.dart';

/// InstallTrackerRequest
///
/// Properties:
/// * [trackerId]
@BuiltValue()
abstract class InstallTrackerRequest
    implements Built<InstallTrackerRequest, InstallTrackerRequestBuilder> {
  @BuiltValueField(wireName: r'trackerId')
  String get trackerId;

  InstallTrackerRequest._();

  factory InstallTrackerRequest(
      [void updates(InstallTrackerRequestBuilder b)]) = _$InstallTrackerRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(InstallTrackerRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<InstallTrackerRequest> get serializer =>
      _$InstallTrackerRequestSerializer();
}

class _$InstallTrackerRequestSerializer
    implements PrimitiveSerializer<InstallTrackerRequest> {
  @override
  final Iterable<Type> types = const [
    InstallTrackerRequest,
    _$InstallTrackerRequest
  ];

  @override
  final String wireName = r'InstallTrackerRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    InstallTrackerRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'trackerId';
    yield serializers.serialize(
      object.trackerId,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    InstallTrackerRequest object, {
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
    required InstallTrackerRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'trackerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
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
  InstallTrackerRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = InstallTrackerRequestBuilder();
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
