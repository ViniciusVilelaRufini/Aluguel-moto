// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'alert_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AlertPage extends AlertPage {
  @override
  final BuiltList<Alert> items;
  @override
  final String? nextCursor;

  factory _$AlertPage([void Function(AlertPageBuilder)? updates]) =>
      (AlertPageBuilder()..update(updates))._build();

  _$AlertPage._({required this.items, this.nextCursor}) : super._();
  @override
  AlertPage rebuild(void Function(AlertPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AlertPageBuilder toBuilder() => AlertPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AlertPage &&
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
    return (newBuiltValueToStringHelper(r'AlertPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class AlertPageBuilder implements Builder<AlertPage, AlertPageBuilder> {
  _$AlertPage? _$v;

  ListBuilder<Alert>? _items;
  ListBuilder<Alert> get items => _$this._items ??= ListBuilder<Alert>();
  set items(ListBuilder<Alert>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  AlertPageBuilder() {
    AlertPage._defaults(this);
  }

  AlertPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AlertPage other) {
    _$v = other as _$AlertPage;
  }

  @override
  void update(void Function(AlertPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AlertPage build() => _build();

  _$AlertPage _build() {
    _$AlertPage _$result;
    try {
      _$result = _$v ??
          _$AlertPage._(
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
            r'AlertPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
