// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wellbeing_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$WellbeingResponse extends WellbeingResponse {
  @override
  final bool ok;
  @override
  final String? note;

  factory _$WellbeingResponse(
          [void Function(WellbeingResponseBuilder)? updates]) =>
      (WellbeingResponseBuilder()..update(updates))._build();

  _$WellbeingResponse._({required this.ok, this.note}) : super._();
  @override
  WellbeingResponse rebuild(void Function(WellbeingResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  WellbeingResponseBuilder toBuilder() =>
      WellbeingResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is WellbeingResponse && ok == other.ok && note == other.note;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, ok.hashCode);
    _$hash = $jc(_$hash, note.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'WellbeingResponse')
          ..add('ok', ok)
          ..add('note', note))
        .toString();
  }
}

class WellbeingResponseBuilder
    implements Builder<WellbeingResponse, WellbeingResponseBuilder> {
  _$WellbeingResponse? _$v;

  bool? _ok;
  bool? get ok => _$this._ok;
  set ok(bool? ok) => _$this._ok = ok;

  String? _note;
  String? get note => _$this._note;
  set note(String? note) => _$this._note = note;

  WellbeingResponseBuilder() {
    WellbeingResponse._defaults(this);
  }

  WellbeingResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _ok = $v.ok;
      _note = $v.note;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(WellbeingResponse other) {
    _$v = other as _$WellbeingResponse;
  }

  @override
  void update(void Function(WellbeingResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  WellbeingResponse build() => _build();

  _$WellbeingResponse _build() {
    final _$result = _$v ??
        _$WellbeingResponse._(
          ok: BuiltValueNullFieldError.checkNotNull(
              ok, r'WellbeingResponse', 'ok'),
          note: note,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
