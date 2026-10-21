// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_message_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SupportMessageCreate extends SupportMessageCreate {
  @override
  final String body;
  @override
  final BuiltList<String>? attachmentObjectKeys;

  factory _$SupportMessageCreate(
          [void Function(SupportMessageCreateBuilder)? updates]) =>
      (SupportMessageCreateBuilder()..update(updates))._build();

  _$SupportMessageCreate._({required this.body, this.attachmentObjectKeys})
      : super._();
  @override
  SupportMessageCreate rebuild(
          void Function(SupportMessageCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SupportMessageCreateBuilder toBuilder() =>
      SupportMessageCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SupportMessageCreate &&
        body == other.body &&
        attachmentObjectKeys == other.attachmentObjectKeys;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, body.hashCode);
    _$hash = $jc(_$hash, attachmentObjectKeys.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SupportMessageCreate')
          ..add('body', body)
          ..add('attachmentObjectKeys', attachmentObjectKeys))
        .toString();
  }
}

class SupportMessageCreateBuilder
    implements Builder<SupportMessageCreate, SupportMessageCreateBuilder> {
  _$SupportMessageCreate? _$v;

  String? _body;
  String? get body => _$this._body;
  set body(String? body) => _$this._body = body;

  ListBuilder<String>? _attachmentObjectKeys;
  ListBuilder<String> get attachmentObjectKeys =>
      _$this._attachmentObjectKeys ??= ListBuilder<String>();
  set attachmentObjectKeys(ListBuilder<String>? attachmentObjectKeys) =>
      _$this._attachmentObjectKeys = attachmentObjectKeys;

  SupportMessageCreateBuilder() {
    SupportMessageCreate._defaults(this);
  }

  SupportMessageCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _body = $v.body;
      _attachmentObjectKeys = $v.attachmentObjectKeys?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SupportMessageCreate other) {
    _$v = other as _$SupportMessageCreate;
  }

  @override
  void update(void Function(SupportMessageCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SupportMessageCreate build() => _build();

  _$SupportMessageCreate _build() {
    _$SupportMessageCreate _$result;
    try {
      _$result = _$v ??
          _$SupportMessageCreate._(
            body: BuiltValueNullFieldError.checkNotNull(
                body, r'SupportMessageCreate', 'body'),
            attachmentObjectKeys: _attachmentObjectKeys?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'attachmentObjectKeys';
        _attachmentObjectKeys?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'SupportMessageCreate', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
