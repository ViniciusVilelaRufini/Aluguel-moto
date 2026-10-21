// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'me.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Me extends Me {
  @override
  final String id;
  @override
  final String? sub;
  @override
  final AuthPool pool;
  @override
  final String email;
  @override
  final BuiltList<StaffGroup> groups;
  @override
  final Customer? customer;
  @override
  final StaffUser? staff;

  factory _$Me([void Function(MeBuilder)? updates]) =>
      (MeBuilder()..update(updates))._build();

  _$Me._(
      {required this.id,
      this.sub,
      required this.pool,
      required this.email,
      required this.groups,
      this.customer,
      this.staff})
      : super._();
  @override
  Me rebuild(void Function(MeBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MeBuilder toBuilder() => MeBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Me &&
        id == other.id &&
        sub == other.sub &&
        pool == other.pool &&
        email == other.email &&
        groups == other.groups &&
        customer == other.customer &&
        staff == other.staff;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, sub.hashCode);
    _$hash = $jc(_$hash, pool.hashCode);
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, groups.hashCode);
    _$hash = $jc(_$hash, customer.hashCode);
    _$hash = $jc(_$hash, staff.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Me')
          ..add('id', id)
          ..add('sub', sub)
          ..add('pool', pool)
          ..add('email', email)
          ..add('groups', groups)
          ..add('customer', customer)
          ..add('staff', staff))
        .toString();
  }
}

class MeBuilder implements Builder<Me, MeBuilder> {
  _$Me? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _sub;
  String? get sub => _$this._sub;
  set sub(String? sub) => _$this._sub = sub;

  AuthPool? _pool;
  AuthPool? get pool => _$this._pool;
  set pool(AuthPool? pool) => _$this._pool = pool;

  String? _email;
  String? get email => _$this._email;
  set email(String? email) => _$this._email = email;

  ListBuilder<StaffGroup>? _groups;
  ListBuilder<StaffGroup> get groups =>
      _$this._groups ??= ListBuilder<StaffGroup>();
  set groups(ListBuilder<StaffGroup>? groups) => _$this._groups = groups;

  CustomerBuilder? _customer;
  CustomerBuilder get customer => _$this._customer ??= CustomerBuilder();
  set customer(CustomerBuilder? customer) => _$this._customer = customer;

  StaffUserBuilder? _staff;
  StaffUserBuilder get staff => _$this._staff ??= StaffUserBuilder();
  set staff(StaffUserBuilder? staff) => _$this._staff = staff;

  MeBuilder() {
    Me._defaults(this);
  }

  MeBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _sub = $v.sub;
      _pool = $v.pool;
      _email = $v.email;
      _groups = $v.groups.toBuilder();
      _customer = $v.customer?.toBuilder();
      _staff = $v.staff?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Me other) {
    _$v = other as _$Me;
  }

  @override
  void update(void Function(MeBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Me build() => _build();

  _$Me _build() {
    _$Me _$result;
    try {
      _$result = _$v ??
          _$Me._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Me', 'id'),
            sub: sub,
            pool: BuiltValueNullFieldError.checkNotNull(pool, r'Me', 'pool'),
            email: BuiltValueNullFieldError.checkNotNull(email, r'Me', 'email'),
            groups: groups.build(),
            customer: _customer?.build(),
            staff: _staff?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'groups';
        groups.build();
        _$failedField = 'customer';
        _customer?.build();
        _$failedField = 'staff';
        _staff?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'Me', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
