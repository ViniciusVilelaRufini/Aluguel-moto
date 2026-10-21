// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'claim_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ClaimPage extends ClaimPage {
  @override
  final BuiltList<Claim> items;
  @override
  final String? nextCursor;

  factory _$ClaimPage([void Function(ClaimPageBuilder)? updates]) =>
      (ClaimPageBuilder()..update(updates))._build();

  _$ClaimPage._({required this.items, this.nextCursor}) : super._();
  @override
  ClaimPage rebuild(void Function(ClaimPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ClaimPageBuilder toBuilder() => ClaimPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ClaimPage &&
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
    return (newBuiltValueToStringHelper(r'ClaimPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class ClaimPageBuilder implements Builder<ClaimPage, ClaimPageBuilder> {
  _$ClaimPage? _$v;

  ListBuilder<Claim>? _items;
  ListBuilder<Claim> get items => _$this._items ??= ListBuilder<Claim>();
  set items(ListBuilder<Claim>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  ClaimPageBuilder() {
    ClaimPage._defaults(this);
  }

  ClaimPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ClaimPage other) {
    _$v = other as _$ClaimPage;
  }

  @override
  void update(void Function(ClaimPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ClaimPage build() => _build();

  _$ClaimPage _build() {
    _$ClaimPage _$result;
    try {
      _$result = _$v ??
          _$ClaimPage._(
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
            r'ClaimPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
