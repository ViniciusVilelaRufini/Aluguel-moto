// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BatteryPage extends BatteryPage {
  @override
  final BuiltList<Battery> items;
  @override
  final String? nextCursor;
  @override
  final BatteryStatusCounts statusCounts;

  factory _$BatteryPage([void Function(BatteryPageBuilder)? updates]) =>
      (BatteryPageBuilder()..update(updates))._build();

  _$BatteryPage._(
      {required this.items, this.nextCursor, required this.statusCounts})
      : super._();
  @override
  BatteryPage rebuild(void Function(BatteryPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatteryPageBuilder toBuilder() => BatteryPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BatteryPage &&
        items == other.items &&
        nextCursor == other.nextCursor &&
        statusCounts == other.statusCounts;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jc(_$hash, nextCursor.hashCode);
    _$hash = $jc(_$hash, statusCounts.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'BatteryPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor)
          ..add('statusCounts', statusCounts))
        .toString();
  }
}

class BatteryPageBuilder implements Builder<BatteryPage, BatteryPageBuilder> {
  _$BatteryPage? _$v;

  ListBuilder<Battery>? _items;
  ListBuilder<Battery> get items => _$this._items ??= ListBuilder<Battery>();
  set items(ListBuilder<Battery>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  BatteryStatusCountsBuilder? _statusCounts;
  BatteryStatusCountsBuilder get statusCounts =>
      _$this._statusCounts ??= BatteryStatusCountsBuilder();
  set statusCounts(BatteryStatusCountsBuilder? statusCounts) =>
      _$this._statusCounts = statusCounts;

  BatteryPageBuilder() {
    BatteryPage._defaults(this);
  }

  BatteryPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _statusCounts = $v.statusCounts.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BatteryPage other) {
    _$v = other as _$BatteryPage;
  }

  @override
  void update(void Function(BatteryPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BatteryPage build() => _build();

  _$BatteryPage _build() {
    _$BatteryPage _$result;
    try {
      _$result = _$v ??
          _$BatteryPage._(
            items: items.build(),
            nextCursor: nextCursor,
            statusCounts: statusCounts.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();

        _$failedField = 'statusCounts';
        statusCounts.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'BatteryPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
