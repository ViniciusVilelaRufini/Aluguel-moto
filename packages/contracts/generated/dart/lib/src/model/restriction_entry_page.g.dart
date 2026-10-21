// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'restriction_entry_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RestrictionEntryPage extends RestrictionEntryPage {
  @override
  final BuiltList<RestrictionEntry> items;
  @override
  final String? nextCursor;

  factory _$RestrictionEntryPage(
          [void Function(RestrictionEntryPageBuilder)? updates]) =>
      (RestrictionEntryPageBuilder()..update(updates))._build();

  _$RestrictionEntryPage._({required this.items, this.nextCursor}) : super._();
  @override
  RestrictionEntryPage rebuild(
          void Function(RestrictionEntryPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RestrictionEntryPageBuilder toBuilder() =>
      RestrictionEntryPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RestrictionEntryPage &&
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
    return (newBuiltValueToStringHelper(r'RestrictionEntryPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class RestrictionEntryPageBuilder
    implements Builder<RestrictionEntryPage, RestrictionEntryPageBuilder> {
  _$RestrictionEntryPage? _$v;

  ListBuilder<RestrictionEntry>? _items;
  ListBuilder<RestrictionEntry> get items =>
      _$this._items ??= ListBuilder<RestrictionEntry>();
  set items(ListBuilder<RestrictionEntry>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  RestrictionEntryPageBuilder() {
    RestrictionEntryPage._defaults(this);
  }

  RestrictionEntryPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RestrictionEntryPage other) {
    _$v = other as _$RestrictionEntryPage;
  }

  @override
  void update(void Function(RestrictionEntryPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RestrictionEntryPage build() => _build();

  _$RestrictionEntryPage _build() {
    _$RestrictionEntryPage _$result;
    try {
      _$result = _$v ??
          _$RestrictionEntryPage._(
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
            r'RestrictionEntryPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
