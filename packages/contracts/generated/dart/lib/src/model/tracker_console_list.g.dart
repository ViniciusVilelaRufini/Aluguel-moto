// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tracker_console_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$TrackerConsoleList extends TrackerConsoleList {
  @override
  final BuiltList<TrackerConsoleCommand> items;

  factory _$TrackerConsoleList(
          [void Function(TrackerConsoleListBuilder)? updates]) =>
      (TrackerConsoleListBuilder()..update(updates))._build();

  _$TrackerConsoleList._({required this.items}) : super._();
  @override
  TrackerConsoleList rebuild(
          void Function(TrackerConsoleListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TrackerConsoleListBuilder toBuilder() =>
      TrackerConsoleListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is TrackerConsoleList && items == other.items;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'TrackerConsoleList')
          ..add('items', items))
        .toString();
  }
}

class TrackerConsoleListBuilder
    implements Builder<TrackerConsoleList, TrackerConsoleListBuilder> {
  _$TrackerConsoleList? _$v;

  ListBuilder<TrackerConsoleCommand>? _items;
  ListBuilder<TrackerConsoleCommand> get items =>
      _$this._items ??= ListBuilder<TrackerConsoleCommand>();
  set items(ListBuilder<TrackerConsoleCommand>? items) => _$this._items = items;

  TrackerConsoleListBuilder() {
    TrackerConsoleList._defaults(this);
  }

  TrackerConsoleListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(TrackerConsoleList other) {
    _$v = other as _$TrackerConsoleList;
  }

  @override
  void update(void Function(TrackerConsoleListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  TrackerConsoleList build() => _build();

  _$TrackerConsoleList _build() {
    _$TrackerConsoleList _$result;
    try {
      _$result = _$v ??
          _$TrackerConsoleList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'TrackerConsoleList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
