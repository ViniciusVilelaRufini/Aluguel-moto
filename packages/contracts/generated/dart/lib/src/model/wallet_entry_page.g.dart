// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wallet_entry_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$WalletEntryPage extends WalletEntryPage {
  @override
  final BuiltList<WalletEntry> items;
  @override
  final String? nextCursor;

  factory _$WalletEntryPage([void Function(WalletEntryPageBuilder)? updates]) =>
      (WalletEntryPageBuilder()..update(updates))._build();

  _$WalletEntryPage._({required this.items, this.nextCursor}) : super._();
  @override
  WalletEntryPage rebuild(void Function(WalletEntryPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  WalletEntryPageBuilder toBuilder() => WalletEntryPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is WalletEntryPage &&
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
    return (newBuiltValueToStringHelper(r'WalletEntryPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class WalletEntryPageBuilder
    implements Builder<WalletEntryPage, WalletEntryPageBuilder> {
  _$WalletEntryPage? _$v;

  ListBuilder<WalletEntry>? _items;
  ListBuilder<WalletEntry> get items =>
      _$this._items ??= ListBuilder<WalletEntry>();
  set items(ListBuilder<WalletEntry>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  WalletEntryPageBuilder() {
    WalletEntryPage._defaults(this);
  }

  WalletEntryPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(WalletEntryPage other) {
    _$v = other as _$WalletEntryPage;
  }

  @override
  void update(void Function(WalletEntryPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  WalletEntryPage build() => _build();

  _$WalletEntryPage _build() {
    _$WalletEntryPage _$result;
    try {
      _$result = _$v ??
          _$WalletEntryPage._(
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
            r'WalletEntryPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
