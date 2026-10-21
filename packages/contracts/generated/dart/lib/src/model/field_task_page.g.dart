// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'field_task_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$FieldTaskPage extends FieldTaskPage {
  @override
  final BuiltList<FieldTask> items;
  @override
  final String? nextCursor;

  factory _$FieldTaskPage([void Function(FieldTaskPageBuilder)? updates]) =>
      (FieldTaskPageBuilder()..update(updates))._build();

  _$FieldTaskPage._({required this.items, this.nextCursor}) : super._();
  @override
  FieldTaskPage rebuild(void Function(FieldTaskPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FieldTaskPageBuilder toBuilder() => FieldTaskPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is FieldTaskPage &&
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
    return (newBuiltValueToStringHelper(r'FieldTaskPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class FieldTaskPageBuilder
    implements Builder<FieldTaskPage, FieldTaskPageBuilder> {
  _$FieldTaskPage? _$v;

  ListBuilder<FieldTask>? _items;
  ListBuilder<FieldTask> get items =>
      _$this._items ??= ListBuilder<FieldTask>();
  set items(ListBuilder<FieldTask>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  FieldTaskPageBuilder() {
    FieldTaskPage._defaults(this);
  }

  FieldTaskPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(FieldTaskPage other) {
    _$v = other as _$FieldTaskPage;
  }

  @override
  void update(void Function(FieldTaskPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  FieldTaskPage build() => _build();

  _$FieldTaskPage _build() {
    _$FieldTaskPage _$result;
    try {
      _$result = _$v ??
          _$FieldTaskPage._(
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
            r'FieldTaskPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
