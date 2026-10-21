// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'staff_group.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const StaffGroup _$admin = const StaffGroup._('admin');
const StaffGroup _$operacao = const StaffGroup._('operacao');
const StaffGroup _$financeiro = const StaffGroup._('financeiro');
const StaffGroup _$suporte = const StaffGroup._('suporte');
const StaffGroup _$campo = const StaffGroup._('campo');
const StaffGroup _$unknownDefaultOpenApi =
    const StaffGroup._('unknownDefaultOpenApi');

StaffGroup _$valueOf(String name) {
  switch (name) {
    case 'admin':
      return _$admin;
    case 'operacao':
      return _$operacao;
    case 'financeiro':
      return _$financeiro;
    case 'suporte':
      return _$suporte;
    case 'campo':
      return _$campo;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<StaffGroup> _$values = BuiltSet<StaffGroup>(const <StaffGroup>[
  _$admin,
  _$operacao,
  _$financeiro,
  _$suporte,
  _$campo,
  _$unknownDefaultOpenApi,
]);

class _$StaffGroupMeta {
  const _$StaffGroupMeta();
  StaffGroup get admin => _$admin;
  StaffGroup get operacao => _$operacao;
  StaffGroup get financeiro => _$financeiro;
  StaffGroup get suporte => _$suporte;
  StaffGroup get campo => _$campo;
  StaffGroup get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  StaffGroup valueOf(String name) => _$valueOf(name);
  BuiltSet<StaffGroup> get values => _$values;
}

abstract class _$StaffGroupMixin {
  // ignore: non_constant_identifier_names
  _$StaffGroupMeta get StaffGroup => const _$StaffGroupMeta();
}

Serializer<StaffGroup> _$staffGroupSerializer = _$StaffGroupSerializer();

class _$StaffGroupSerializer implements PrimitiveSerializer<StaffGroup> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'admin': 'admin',
    'operacao': 'operacao',
    'financeiro': 'financeiro',
    'suporte': 'suporte',
    'campo': 'campo',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'admin': 'admin',
    'operacao': 'operacao',
    'financeiro': 'financeiro',
    'suporte': 'suporte',
    'campo': 'campo',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[StaffGroup];
  @override
  final String wireName = 'StaffGroup';

  @override
  Object serialize(Serializers serializers, StaffGroup object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  StaffGroup deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      StaffGroup.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
