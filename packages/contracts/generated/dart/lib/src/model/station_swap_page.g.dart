// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'station_swap_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$StationSwapPage extends StationSwapPage {
  @override
  final BuiltList<StationSwap> items;
  @override
  final String? nextCursor;

  factory _$StationSwapPage([void Function(StationSwapPageBuilder)? updates]) =>
      (StationSwapPageBuilder()..update(updates))._build();

  _$StationSwapPage._({required this.items, this.nextCursor}) : super._();
  @override
  StationSwapPage rebuild(void Function(StationSwapPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  StationSwapPageBuilder toBuilder() => StationSwapPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is StationSwapPage &&
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
    return (newBuiltValueToStringHelper(r'StationSwapPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class StationSwapPageBuilder
    implements Builder<StationSwapPage, StationSwapPageBuilder> {
  _$StationSwapPage? _$v;

  ListBuilder<StationSwap>? _items;
  ListBuilder<StationSwap> get items =>
      _$this._items ??= ListBuilder<StationSwap>();
  set items(ListBuilder<StationSwap>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  StationSwapPageBuilder() {
    StationSwapPage._defaults(this);
  }

  StationSwapPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(StationSwapPage other) {
    _$v = other as _$StationSwapPage;
  }

  @override
  void update(void Function(StationSwapPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  StationSwapPage build() => _build();

  _$StationSwapPage _build() {
    _$StationSwapPage _$result;
    try {
      _$result = _$v ??
          _$StationSwapPage._(
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
            r'StationSwapPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
