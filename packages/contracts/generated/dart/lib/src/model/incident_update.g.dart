// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'incident_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$IncidentUpdate extends IncidentUpdate {
  @override
  final IncidentStatus status;
  @override
  final String? resolutionNote;

  factory _$IncidentUpdate([void Function(IncidentUpdateBuilder)? updates]) =>
      (IncidentUpdateBuilder()..update(updates))._build();

  _$IncidentUpdate._({required this.status, this.resolutionNote}) : super._();
  @override
  IncidentUpdate rebuild(void Function(IncidentUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  IncidentUpdateBuilder toBuilder() => IncidentUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is IncidentUpdate &&
        status == other.status &&
        resolutionNote == other.resolutionNote;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, resolutionNote.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'IncidentUpdate')
          ..add('status', status)
          ..add('resolutionNote', resolutionNote))
        .toString();
  }
}

class IncidentUpdateBuilder
    implements Builder<IncidentUpdate, IncidentUpdateBuilder> {
  _$IncidentUpdate? _$v;

  IncidentStatus? _status;
  IncidentStatus? get status => _$this._status;
  set status(IncidentStatus? status) => _$this._status = status;

  String? _resolutionNote;
  String? get resolutionNote => _$this._resolutionNote;
  set resolutionNote(String? resolutionNote) =>
      _$this._resolutionNote = resolutionNote;

  IncidentUpdateBuilder() {
    IncidentUpdate._defaults(this);
  }

  IncidentUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _status = $v.status;
      _resolutionNote = $v.resolutionNote;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(IncidentUpdate other) {
    _$v = other as _$IncidentUpdate;
  }

  @override
  void update(void Function(IncidentUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  IncidentUpdate build() => _build();

  _$IncidentUpdate _build() {
    final _$result = _$v ??
        _$IncidentUpdate._(
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'IncidentUpdate', 'status'),
          resolutionNote: resolutionNote,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
