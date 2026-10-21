// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'account_deletion_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AccountDeletionStatus _$scheduled =
    const AccountDeletionStatus._('scheduled');
const AccountDeletionStatus _$completed =
    const AccountDeletionStatus._('completed');
const AccountDeletionStatus _$unknownDefaultOpenApi =
    const AccountDeletionStatus._('unknownDefaultOpenApi');

AccountDeletionStatus _$valueOf(String name) {
  switch (name) {
    case 'scheduled':
      return _$scheduled;
    case 'completed':
      return _$completed;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<AccountDeletionStatus> _$values =
    BuiltSet<AccountDeletionStatus>(const <AccountDeletionStatus>[
  _$scheduled,
  _$completed,
  _$unknownDefaultOpenApi,
]);

class _$AccountDeletionStatusMeta {
  const _$AccountDeletionStatusMeta();
  AccountDeletionStatus get scheduled => _$scheduled;
  AccountDeletionStatus get completed => _$completed;
  AccountDeletionStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  AccountDeletionStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<AccountDeletionStatus> get values => _$values;
}

abstract class _$AccountDeletionStatusMixin {
  // ignore: non_constant_identifier_names
  _$AccountDeletionStatusMeta get AccountDeletionStatus =>
      const _$AccountDeletionStatusMeta();
}

Serializer<AccountDeletionStatus> _$accountDeletionStatusSerializer =
    _$AccountDeletionStatusSerializer();

class _$AccountDeletionStatusSerializer
    implements PrimitiveSerializer<AccountDeletionStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'scheduled': 'scheduled',
    'completed': 'completed',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'scheduled': 'scheduled',
    'completed': 'completed',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[AccountDeletionStatus];
  @override
  final String wireName = 'AccountDeletionStatus';

  @override
  Object serialize(Serializers serializers, AccountDeletionStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AccountDeletionStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AccountDeletionStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
