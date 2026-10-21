// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_task_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$MaintenanceTaskPage extends MaintenanceTaskPage {
  @override
  final BuiltList<MaintenanceTask> items;
  @override
  final String? nextCursor;

  factory _$MaintenanceTaskPage(
          [void Function(MaintenanceTaskPageBuilder)? updates]) =>
      (MaintenanceTaskPageBuilder()..update(updates))._build();

  _$MaintenanceTaskPage._({required this.items, this.nextCursor}) : super._();
  @override
  MaintenanceTaskPage rebuild(
          void Function(MaintenanceTaskPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MaintenanceTaskPageBuilder toBuilder() =>
      MaintenanceTaskPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is MaintenanceTaskPage &&
        items == other.items &&
        nextCursor == other.nextCursor;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jc(_$hash, nextCursor.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'MaintenanceTaskPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class MaintenanceTaskPageBuilder
    implements Builder<MaintenanceTaskPage, MaintenanceTaskPageBuilder> {
  _$MaintenanceTaskPage? _$v;

  ListBuilder<MaintenanceTask>? _items;
  ListBuilder<MaintenanceTask> get items =>
      _$this._items ??= ListBuilder<MaintenanceTask>();
  set items(ListBuilder<MaintenanceTask>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  MaintenanceTaskPageBuilder() {
    MaintenanceTaskPage._defaults(this);
  }

  MaintenanceTaskPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(MaintenanceTaskPage other) {
    _$v = other as _$MaintenanceTaskPage;
  }

  @override
  void update(void Function(MaintenanceTaskPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  MaintenanceTaskPage build() => _build();

  _$MaintenanceTaskPage _build() {
    _$MaintenanceTaskPage _$result;
    try {
      _$result = _$v ??
          _$MaintenanceTaskPage._(
            items: items.build(),
            nextCursor: nextCursor,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'MaintenanceTaskPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
