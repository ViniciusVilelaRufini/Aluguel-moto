// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_reward_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReferralRewardPage extends ReferralRewardPage {
  @override
  final BuiltList<ReferralReward> items;
  @override
  final String? nextCursor;

  factory _$ReferralRewardPage(
          [void Function(ReferralRewardPageBuilder)? updates]) =>
      (ReferralRewardPageBuilder()..update(updates))._build();

  _$ReferralRewardPage._({required this.items, this.nextCursor}) : super._();
  @override
  ReferralRewardPage rebuild(
          void Function(ReferralRewardPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReferralRewardPageBuilder toBuilder() =>
      ReferralRewardPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReferralRewardPage &&
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
    return (newBuiltValueToStringHelper(r'ReferralRewardPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class ReferralRewardPageBuilder
    implements Builder<ReferralRewardPage, ReferralRewardPageBuilder> {
  _$ReferralRewardPage? _$v;

  ListBuilder<ReferralReward>? _items;
  ListBuilder<ReferralReward> get items =>
      _$this._items ??= ListBuilder<ReferralReward>();
  set items(ListBuilder<ReferralReward>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  ReferralRewardPageBuilder() {
    ReferralRewardPage._defaults(this);
  }

  ReferralRewardPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReferralRewardPage other) {
    _$v = other as _$ReferralRewardPage;
  }

  @override
  void update(void Function(ReferralRewardPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReferralRewardPage build() => _build();

  _$ReferralRewardPage _build() {
    _$ReferralRewardPage _$result;
    try {
      _$result = _$v ??
          _$ReferralRewardPage._(
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
            r'ReferralRewardPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
