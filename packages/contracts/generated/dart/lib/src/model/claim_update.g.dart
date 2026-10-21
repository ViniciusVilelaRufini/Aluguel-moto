// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'claim_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ClaimUpdate extends ClaimUpdate {
  @override
  final ClaimStatus status;
  @override
  final String? statusNote;

  factory _$ClaimUpdate([void Function(ClaimUpdateBuilder)? updates]) =>
      (ClaimUpdateBuilder()..update(updates))._build();

  _$ClaimUpdate._({required this.status, this.statusNote}) : super._();
  @override
  ClaimUpdate rebuild(void Function(ClaimUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ClaimUpdateBuilder toBuilder() => ClaimUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ClaimUpdate &&
        status == other.status &&
        statusNote == other.statusNote;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, statusNote.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ClaimUpdate')
          ..add('status', status)
          ..add('statusNote', statusNote))
        .toString();
  }
}

class ClaimUpdateBuilder implements Builder<ClaimUpdate, ClaimUpdateBuilder> {
  _$ClaimUpdate? _$v;

  ClaimStatus? _status;
  ClaimStatus? get status => _$this._status;
  set status(ClaimStatus? status) => _$this._status = status;

  String? _statusNote;
  String? get statusNote => _$this._statusNote;
  set statusNote(String? statusNote) => _$this._statusNote = statusNote;

  ClaimUpdateBuilder() {
    ClaimUpdate._defaults(this);
  }

  ClaimUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _status = $v.status;
      _statusNote = $v.statusNote;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ClaimUpdate other) {
    _$v = other as _$ClaimUpdate;
  }

  @override
  void update(void Function(ClaimUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ClaimUpdate build() => _build();

  _$ClaimUpdate _build() {
    final _$result = _$v ??
        _$ClaimUpdate._(
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'ClaimUpdate', 'status'),
          statusNote: statusNote,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
