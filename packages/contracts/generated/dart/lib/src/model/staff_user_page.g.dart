// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'staff_user_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$StaffUserPage extends StaffUserPage {
  @override
  final BuiltList<StaffUser> items;
  @override
  final String? nextCursor;

  factory _$StaffUserPage([void Function(StaffUserPageBuilder)? updates]) =>
      (StaffUserPageBuilder()..update(updates))._build();

  _$StaffUserPage._({required this.items, this.nextCursor}) : super._();
  @override
  StaffUserPage rebuild(void Function(StaffUserPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  StaffUserPageBuilder toBuilder() => StaffUserPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is StaffUserPage &&
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
    return (newBuiltValueToStringHelper(r'StaffUserPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class StaffUserPageBuilder
    implements Builder<StaffUserPage, StaffUserPageBuilder> {
  _$StaffUserPage? _$v;

  ListBuilder<StaffUser>? _items;
  ListBuilder<StaffUser> get items =>
      _$this._items ??= ListBuilder<StaffUser>();
  set items(ListBuilder<StaffUser>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  StaffUserPageBuilder() {
    StaffUserPage._defaults(this);
  }

  StaffUserPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(StaffUserPage other) {
    _$v = other as _$StaffUserPage;
  }

  @override
  void update(void Function(StaffUserPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  StaffUserPage build() => _build();

  _$StaffUserPage _build() {
    _$StaffUserPage _$result;
    try {
      _$result = _$v ??
          _$StaffUserPage._(
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
            r'StaffUserPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
