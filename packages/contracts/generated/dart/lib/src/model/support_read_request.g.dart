// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_read_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SupportReadRequest extends SupportReadRequest {
  @override
  final String? upToMessageId;

  factory _$SupportReadRequest(
          [void Function(SupportReadRequestBuilder)? updates]) =>
      (SupportReadRequestBuilder()..update(updates))._build();

  _$SupportReadRequest._({this.upToMessageId}) : super._();
  @override
  SupportReadRequest rebuild(
          void Function(SupportReadRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SupportReadRequestBuilder toBuilder() =>
      SupportReadRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SupportReadRequest && upToMessageId == other.upToMessageId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, upToMessageId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SupportReadRequest')
          ..add('upToMessageId', upToMessageId))
        .toString();
  }
}

class SupportReadRequestBuilder
    implements Builder<SupportReadRequest, SupportReadRequestBuilder> {
  _$SupportReadRequest? _$v;

  String? _upToMessageId;
  String? get upToMessageId => _$this._upToMessageId;
  set upToMessageId(String? upToMessageId) =>
      _$this._upToMessageId = upToMessageId;

  SupportReadRequestBuilder() {
    SupportReadRequest._defaults(this);
  }

  SupportReadRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _upToMessageId = $v.upToMessageId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SupportReadRequest other) {
    _$v = other as _$SupportReadRequest;
  }

  @override
  void update(void Function(SupportReadRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SupportReadRequest build() => _build();

  _$SupportReadRequest _build() {
    final _$result = _$v ??
        _$SupportReadRequest._(
          upToMessageId: upToMessageId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
