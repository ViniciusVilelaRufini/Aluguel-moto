// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rental_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RentalPage extends RentalPage {
  @override
  final BuiltList<Rental> items;
  @override
  final String? nextCursor;

  factory _$RentalPage([void Function(RentalPageBuilder)? updates]) =>
      (RentalPageBuilder()..update(updates))._build();

  _$RentalPage._({required this.items, this.nextCursor}) : super._();
  @override
  RentalPage rebuild(void Function(RentalPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RentalPageBuilder toBuilder() => RentalPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RentalPage &&
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
    return (newBuiltValueToStringHelper(r'RentalPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class RentalPageBuilder implements Builder<RentalPage, RentalPageBuilder> {
  _$RentalPage? _$v;

  ListBuilder<Rental>? _items;
  ListBuilder<Rental> get items => _$this._items ??= ListBuilder<Rental>();
  set items(ListBuilder<Rental>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  RentalPageBuilder() {
    RentalPage._defaults(this);
  }

  RentalPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RentalPage other) {
    _$v = other as _$RentalPage;
  }

  @override
  void update(void Function(RentalPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RentalPage build() => _build();

  _$RentalPage _build() {
    _$RentalPage _$result;
    try {
      _$result = _$v ??
          _$RentalPage._(
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
            r'RentalPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
