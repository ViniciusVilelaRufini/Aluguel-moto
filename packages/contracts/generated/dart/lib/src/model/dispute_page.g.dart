// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dispute_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DisputePage extends DisputePage {
  @override
  final BuiltList<Dispute> items;
  @override
  final String? nextCursor;

  factory _$DisputePage([void Function(DisputePageBuilder)? updates]) =>
      (DisputePageBuilder()..update(updates))._build();

  _$DisputePage._({required this.items, this.nextCursor}) : super._();
  @override
  DisputePage rebuild(void Function(DisputePageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DisputePageBuilder toBuilder() => DisputePageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DisputePage &&
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
    return (newBuiltValueToStringHelper(r'DisputePage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class DisputePageBuilder implements Builder<DisputePage, DisputePageBuilder> {
  _$DisputePage? _$v;

  ListBuilder<Dispute>? _items;
  ListBuilder<Dispute> get items => _$this._items ??= ListBuilder<Dispute>();
  set items(ListBuilder<Dispute>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  DisputePageBuilder() {
    DisputePage._defaults(this);
  }

  DisputePageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DisputePage other) {
    _$v = other as _$DisputePage;
  }

  @override
  void update(void Function(DisputePageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DisputePage build() => _build();

  _$DisputePage _build() {
    _$DisputePage _$result;
    try {
      _$result = _$v ??
          _$DisputePage._(
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
            r'DisputePage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
