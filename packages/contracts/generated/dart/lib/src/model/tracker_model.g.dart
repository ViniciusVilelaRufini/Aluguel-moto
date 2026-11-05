// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tracker_model.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const TrackerModel _$J16 = const TrackerModel._('J16');
const TrackerModel _$unknownDefaultOpenApi =
    const TrackerModel._('unknownDefaultOpenApi');

TrackerModel _$valueOf(String name) {
  switch (name) {
    case 'J16':
      return _$J16;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<TrackerModel> _$values =
    BuiltSet<TrackerModel>(const <TrackerModel>[
  _$J16,
  _$unknownDefaultOpenApi,
]);

class _$TrackerModelMeta {
  const _$TrackerModelMeta();
  TrackerModel get J16 => _$J16;
  TrackerModel get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  TrackerModel valueOf(String name) => _$valueOf(name);
  BuiltSet<TrackerModel> get values => _$values;
}

abstract class _$TrackerModelMixin {
  // ignore: non_constant_identifier_names
  _$TrackerModelMeta get TrackerModel => const _$TrackerModelMeta();
}

Serializer<TrackerModel> _$trackerModelSerializer = _$TrackerModelSerializer();

class _$TrackerModelSerializer implements PrimitiveSerializer<TrackerModel> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'J16': 'J16',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'J16': 'J16',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[TrackerModel];
  @override
  final String wireName = 'TrackerModel';

  @override
  Object serialize(Serializers serializers, TrackerModel object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  TrackerModel deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      TrackerModel.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
