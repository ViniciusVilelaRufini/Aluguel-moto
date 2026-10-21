// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'audit_log_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AuditLogPage extends AuditLogPage {
  @override
  final BuiltList<AuditLog> items;
  @override
  final String? nextCursor;

  factory _$AuditLogPage([void Function(AuditLogPageBuilder)? updates]) =>
      (AuditLogPageBuilder()..update(updates))._build();

  _$AuditLogPage._({required this.items, this.nextCursor}) : super._();
  @override
  AuditLogPage rebuild(void Function(AuditLogPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AuditLogPageBuilder toBuilder() => AuditLogPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AuditLogPage &&
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
    return (newBuiltValueToStringHelper(r'AuditLogPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class AuditLogPageBuilder
    implements Builder<AuditLogPage, AuditLogPageBuilder> {
  _$AuditLogPage? _$v;

  ListBuilder<AuditLog>? _items;
  ListBuilder<AuditLog> get items => _$this._items ??= ListBuilder<AuditLog>();
  set items(ListBuilder<AuditLog>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  AuditLogPageBuilder() {
    AuditLogPage._defaults(this);
  }

  AuditLogPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AuditLogPage other) {
    _$v = other as _$AuditLogPage;
  }

  @override
  void update(void Function(AuditLogPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AuditLogPage build() => _build();

  _$AuditLogPage _build() {
    _$AuditLogPage _$result;
    try {
      _$result = _$v ??
          _$AuditLogPage._(
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
            r'AuditLogPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
