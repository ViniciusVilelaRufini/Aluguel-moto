// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'handover_checklist_item.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$HandoverChecklistItem extends HandoverChecklistItem {
  @override
  final String code;
  @override
  final bool ok;
  @override
  final String? note;

  factory _$HandoverChecklistItem(
          [void Function(HandoverChecklistItemBuilder)? updates]) =>
      (HandoverChecklistItemBuilder()..update(updates))._build();

  _$HandoverChecklistItem._({required this.code, required this.ok, this.note})
      : super._();
  @override
  HandoverChecklistItem rebuild(
          void Function(HandoverChecklistItemBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  HandoverChecklistItemBuilder toBuilder() =>
      HandoverChecklistItemBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is HandoverChecklistItem &&
        code == other.code &&
        ok == other.ok &&
        note == other.note;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, ok.hashCode);
    _$hash = $jc(_$hash, note.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'HandoverChecklistItem')
          ..add('code', code)
          ..add('ok', ok)
          ..add('note', note))
        .toString();
  }
}

class HandoverChecklistItemBuilder
    implements Builder<HandoverChecklistItem, HandoverChecklistItemBuilder> {
  _$HandoverChecklistItem? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  bool? _ok;
  bool? get ok => _$this._ok;
  set ok(bool? ok) => _$this._ok = ok;

  String? _note;
  String? get note => _$this._note;
  set note(String? note) => _$this._note = note;

  HandoverChecklistItemBuilder() {
    HandoverChecklistItem._defaults(this);
  }

  HandoverChecklistItemBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _ok = $v.ok;
      _note = $v.note;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(HandoverChecklistItem other) {
    _$v = other as _$HandoverChecklistItem;
  }

  @override
  void update(void Function(HandoverChecklistItemBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  HandoverChecklistItem build() => _build();

  _$HandoverChecklistItem _build() {
    final _$result = _$v ??
        _$HandoverChecklistItem._(
          code: BuiltValueNullFieldError.checkNotNull(
              code, r'HandoverChecklistItem', 'code'),
          ok: BuiltValueNullFieldError.checkNotNull(
              ok, r'HandoverChecklistItem', 'ok'),
          note: note,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
