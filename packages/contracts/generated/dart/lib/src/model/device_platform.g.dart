// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'device_platform.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const DevicePlatform _$android = const DevicePlatform._('android');
const DevicePlatform _$ios = const DevicePlatform._('ios');
const DevicePlatform _$web = const DevicePlatform._('web');
const DevicePlatform _$unknownDefaultOpenApi =
    const DevicePlatform._('unknownDefaultOpenApi');

DevicePlatform _$valueOf(String name) {
  switch (name) {
    case 'android':
      return _$android;
    case 'ios':
      return _$ios;
    case 'web':
      return _$web;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<DevicePlatform> _$values =
    BuiltSet<DevicePlatform>(const <DevicePlatform>[
  _$android,
  _$ios,
  _$web,
  _$unknownDefaultOpenApi,
]);

class _$DevicePlatformMeta {
  const _$DevicePlatformMeta();
  DevicePlatform get android => _$android;
  DevicePlatform get ios => _$ios;
  DevicePlatform get web => _$web;
  DevicePlatform get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  DevicePlatform valueOf(String name) => _$valueOf(name);
  BuiltSet<DevicePlatform> get values => _$values;
}

abstract class _$DevicePlatformMixin {
  // ignore: non_constant_identifier_names
  _$DevicePlatformMeta get DevicePlatform => const _$DevicePlatformMeta();
}

Serializer<DevicePlatform> _$devicePlatformSerializer =
    _$DevicePlatformSerializer();

class _$DevicePlatformSerializer
    implements PrimitiveSerializer<DevicePlatform> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'android': 'android',
    'ios': 'ios',
    'web': 'web',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'android': 'android',
    'ios': 'ios',
    'web': 'web',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[DevicePlatform];
  @override
  final String wireName = 'DevicePlatform';

  @override
  Object serialize(Serializers serializers, DevicePlatform object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DevicePlatform deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DevicePlatform.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
