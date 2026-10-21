//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/device_platform.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'device_registration.g.dart';

/// DeviceRegistration
///
/// Properties:
/// * [fcmToken]
/// * [platform]
/// * [appVersion]
@BuiltValue()
abstract class DeviceRegistration
    implements Built<DeviceRegistration, DeviceRegistrationBuilder> {
  @BuiltValueField(wireName: r'fcmToken')
  String get fcmToken;

  @BuiltValueField(wireName: r'platform')
  DevicePlatform get platform;
  // enum platformEnum {  android,  ios,  web,  };

  @BuiltValueField(wireName: r'appVersion')
  String? get appVersion;

  DeviceRegistration._();

  factory DeviceRegistration([void updates(DeviceRegistrationBuilder b)]) =
      _$DeviceRegistration;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DeviceRegistrationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DeviceRegistration> get serializer =>
      _$DeviceRegistrationSerializer();
}

class _$DeviceRegistrationSerializer
    implements PrimitiveSerializer<DeviceRegistration> {
  @override
  final Iterable<Type> types = const [DeviceRegistration, _$DeviceRegistration];

  @override
  final String wireName = r'DeviceRegistration';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DeviceRegistration object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'fcmToken';
    yield serializers.serialize(
      object.fcmToken,
      specifiedType: const FullType(String),
    );
    yield r'platform';
    yield serializers.serialize(
      object.platform,
      specifiedType: const FullType(DevicePlatform),
    );
    if (object.appVersion != null) {
      yield r'appVersion';
      yield serializers.serialize(
        object.appVersion,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    DeviceRegistration object, {
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
    required DeviceRegistrationBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'fcmToken':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.fcmToken = valueDes;
          break;
        case r'platform':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DevicePlatform),
          ) as DevicePlatform;
          result.platform = valueDes;
          break;
        case r'appVersion':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.appVersion = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DeviceRegistration deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DeviceRegistrationBuilder();
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
