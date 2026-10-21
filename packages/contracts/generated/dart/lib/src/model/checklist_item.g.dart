// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'checklist_item.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ChecklistItem extends ChecklistItem {
  @override
  final bool ok;
  @override
  final String? notes;

  factory _$ChecklistItem([void Function(ChecklistItemBuilder)? updates]) =>
      (ChecklistItemBuilder()..update(updates))._build();

  _$ChecklistItem._({required this.ok, this.notes}) : super._();
  @override
  ChecklistItem rebuild(void Function(ChecklistItemBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ChecklistItemBuilder toBuilder() => ChecklistItemBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ChecklistItem && ok == other.ok && notes == other.notes;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, ok.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ChecklistItem')
          ..add('ok', ok)
          ..add('notes', notes))
        .toString();
  }
}

class ChecklistItemBuilder
    implements Builder<ChecklistItem, ChecklistItemBuilder> {
  _$ChecklistItem? _$v;

  bool? _ok;
  bool? get ok => _$this._ok;
  set ok(bool? ok) => _$this._ok = ok;

  String? _notes;
  String? get notes => _$this._notes;
  set notes(String? notes) => _$this._notes = notes;

  ChecklistItemBuilder() {
    ChecklistItem._defaults(this);
  }

  ChecklistItemBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _ok = $v.ok;
      _notes = $v.notes;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ChecklistItem other) {
    _$v = other as _$ChecklistItem;
  }

  @override
  void update(void Function(ChecklistItemBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ChecklistItem build() => _build();

  _$ChecklistItem _build() {
    final _$result = _$v ??
        _$ChecklistItem._(
          ok: BuiltValueNullFieldError.checkNotNull(ok, r'ChecklistItem', 'ok'),
          notes: notes,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
