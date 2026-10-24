// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_movement_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BatteryMovementPage extends BatteryMovementPage {
  @override
  final BuiltList<BatteryMovement> items;
  @override
  final String? nextCursor;

  factory _$BatteryMovementPage(
          [void Function(BatteryMovementPageBuilder)? updates]) =>
      (BatteryMovementPageBuilder()..update(updates))._build();

  _$BatteryMovementPage._({required this.items, this.nextCursor}) : super._();
  @override
  BatteryMovementPage rebuild(
          void Function(BatteryMovementPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatteryMovementPageBuilder toBuilder() =>
      BatteryMovementPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BatteryMovementPage &&
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
    return (newBuiltValueToStringHelper(r'BatteryMovementPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class BatteryMovementPageBuilder
    implements Builder<BatteryMovementPage, BatteryMovementPageBuilder> {
  _$BatteryMovementPage? _$v;

  ListBuilder<BatteryMovement>? _items;
  ListBuilder<BatteryMovement> get items =>
      _$this._items ??= ListBuilder<BatteryMovement>();
  set items(ListBuilder<BatteryMovement>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  BatteryMovementPageBuilder() {
    BatteryMovementPage._defaults(this);
  }

  BatteryMovementPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BatteryMovementPage other) {
    _$v = other as _$BatteryMovementPage;
  }

  @override
  void update(void Function(BatteryMovementPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BatteryMovementPage build() => _build();

  _$BatteryMovementPage _build() {
    _$BatteryMovementPage _$result;
    try {
      _$result = _$v ??
          _$BatteryMovementPage._(
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
            r'BatteryMovementPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
