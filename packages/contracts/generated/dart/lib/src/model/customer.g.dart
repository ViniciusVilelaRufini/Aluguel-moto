// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Customer extends Customer {
  @override
  final String id;
  @override
  final String? name;
  @override
  final String email;
  @override
  final String? phone;
  @override
  final String? cpf;
  @override
  final Date? birthDate;
  @override
  final KycStatus kycStatus;
  @override
  final CustomerStatus status;
  @override
  final bool delinquent;
  @override
  final bool restricted;
  @override
  final String? blockedReason;
  @override
  final DateTime? blockedAt;
  @override
  final bool? locationConsent;
  @override
  final String? emergencyContactName;
  @override
  final String? emergencyContactPhone;
  @override
  final PixKeyType? pixRefundKeyType;
  @override
  final String? pixRefundKey;
  @override
  final SubscriptionPlanCode? activePlanCode;
  @override
  final String? activeSubscriptionId;
  @override
  final CustomerStats? stats;
  @override
  final int? walletBalanceCents;
  @override
  final int? debtCents;
  @override
  final DateTime createdAt;

  factory _$Customer([void Function(CustomerBuilder)? updates]) =>
      (CustomerBuilder()..update(updates))._build();

  _$Customer._(
      {required this.id,
      this.name,
      required this.email,
      this.phone,
      this.cpf,
      this.birthDate,
      required this.kycStatus,
      required this.status,
      required this.delinquent,
      required this.restricted,
      this.blockedReason,
      this.blockedAt,
      this.locationConsent,
      this.emergencyContactName,
      this.emergencyContactPhone,
      this.pixRefundKeyType,
      this.pixRefundKey,
      this.activePlanCode,
      this.activeSubscriptionId,
      this.stats,
      this.walletBalanceCents,
      this.debtCents,
      required this.createdAt})
      : super._();
  @override
  Customer rebuild(void Function(CustomerBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CustomerBuilder toBuilder() => CustomerBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Customer &&
        id == other.id &&
        name == other.name &&
        email == other.email &&
        phone == other.phone &&
        cpf == other.cpf &&
        birthDate == other.birthDate &&
        kycStatus == other.kycStatus &&
        status == other.status &&
        delinquent == other.delinquent &&
        restricted == other.restricted &&
        blockedReason == other.blockedReason &&
        blockedAt == other.blockedAt &&
        locationConsent == other.locationConsent &&
        emergencyContactName == other.emergencyContactName &&
        emergencyContactPhone == other.emergencyContactPhone &&
        pixRefundKeyType == other.pixRefundKeyType &&
        pixRefundKey == other.pixRefundKey &&
        activePlanCode == other.activePlanCode &&
        activeSubscriptionId == other.activeSubscriptionId &&
        stats == other.stats &&
        walletBalanceCents == other.walletBalanceCents &&
        debtCents == other.debtCents &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, phone.hashCode);
    _$hash = $jc(_$hash, cpf.hashCode);
    _$hash = $jc(_$hash, birthDate.hashCode);
    _$hash = $jc(_$hash, kycStatus.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, delinquent.hashCode);
    _$hash = $jc(_$hash, restricted.hashCode);
    _$hash = $jc(_$hash, blockedReason.hashCode);
    _$hash = $jc(_$hash, blockedAt.hashCode);
    _$hash = $jc(_$hash, locationConsent.hashCode);
    _$hash = $jc(_$hash, emergencyContactName.hashCode);
    _$hash = $jc(_$hash, emergencyContactPhone.hashCode);
    _$hash = $jc(_$hash, pixRefundKeyType.hashCode);
    _$hash = $jc(_$hash, pixRefundKey.hashCode);
    _$hash = $jc(_$hash, activePlanCode.hashCode);
    _$hash = $jc(_$hash, activeSubscriptionId.hashCode);
    _$hash = $jc(_$hash, stats.hashCode);
    _$hash = $jc(_$hash, walletBalanceCents.hashCode);
    _$hash = $jc(_$hash, debtCents.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Customer')
          ..add('id', id)
          ..add('name', name)
          ..add('email', email)
          ..add('phone', phone)
          ..add('cpf', cpf)
          ..add('birthDate', birthDate)
          ..add('kycStatus', kycStatus)
          ..add('status', status)
          ..add('delinquent', delinquent)
          ..add('restricted', restricted)
          ..add('blockedReason', blockedReason)
          ..add('blockedAt', blockedAt)
          ..add('locationConsent', locationConsent)
          ..add('emergencyContactName', emergencyContactName)
          ..add('emergencyContactPhone', emergencyContactPhone)
          ..add('pixRefundKeyType', pixRefundKeyType)
          ..add('pixRefundKey', pixRefundKey)
          ..add('activePlanCode', activePlanCode)
          ..add('activeSubscriptionId', activeSubscriptionId)
          ..add('stats', stats)
          ..add('walletBalanceCents', walletBalanceCents)
          ..add('debtCents', debtCents)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class CustomerBuilder implements Builder<Customer, CustomerBuilder> {
  _$Customer? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _email;
  String? get email => _$this._email;
  set email(String? email) => _$this._email = email;

  String? _phone;
  String? get phone => _$this._phone;
  set phone(String? phone) => _$this._phone = phone;

  String? _cpf;
  String? get cpf => _$this._cpf;
  set cpf(String? cpf) => _$this._cpf = cpf;

  Date? _birthDate;
  Date? get birthDate => _$this._birthDate;
  set birthDate(Date? birthDate) => _$this._birthDate = birthDate;

  KycStatus? _kycStatus;
  KycStatus? get kycStatus => _$this._kycStatus;
  set kycStatus(KycStatus? kycStatus) => _$this._kycStatus = kycStatus;

  CustomerStatus? _status;
  CustomerStatus? get status => _$this._status;
  set status(CustomerStatus? status) => _$this._status = status;

  bool? _delinquent;
  bool? get delinquent => _$this._delinquent;
  set delinquent(bool? delinquent) => _$this._delinquent = delinquent;

  bool? _restricted;
  bool? get restricted => _$this._restricted;
  set restricted(bool? restricted) => _$this._restricted = restricted;

  String? _blockedReason;
  String? get blockedReason => _$this._blockedReason;
  set blockedReason(String? blockedReason) =>
      _$this._blockedReason = blockedReason;

  DateTime? _blockedAt;
  DateTime? get blockedAt => _$this._blockedAt;
  set blockedAt(DateTime? blockedAt) => _$this._blockedAt = blockedAt;

  bool? _locationConsent;
  bool? get locationConsent => _$this._locationConsent;
  set locationConsent(bool? locationConsent) =>
      _$this._locationConsent = locationConsent;

  String? _emergencyContactName;
  String? get emergencyContactName => _$this._emergencyContactName;
  set emergencyContactName(String? emergencyContactName) =>
      _$this._emergencyContactName = emergencyContactName;

  String? _emergencyContactPhone;
  String? get emergencyContactPhone => _$this._emergencyContactPhone;
  set emergencyContactPhone(String? emergencyContactPhone) =>
      _$this._emergencyContactPhone = emergencyContactPhone;

  PixKeyType? _pixRefundKeyType;
  PixKeyType? get pixRefundKeyType => _$this._pixRefundKeyType;
  set pixRefundKeyType(PixKeyType? pixRefundKeyType) =>
      _$this._pixRefundKeyType = pixRefundKeyType;

  String? _pixRefundKey;
  String? get pixRefundKey => _$this._pixRefundKey;
  set pixRefundKey(String? pixRefundKey) => _$this._pixRefundKey = pixRefundKey;

  SubscriptionPlanCode? _activePlanCode;
  SubscriptionPlanCode? get activePlanCode => _$this._activePlanCode;
  set activePlanCode(SubscriptionPlanCode? activePlanCode) =>
      _$this._activePlanCode = activePlanCode;

  String? _activeSubscriptionId;
  String? get activeSubscriptionId => _$this._activeSubscriptionId;
  set activeSubscriptionId(String? activeSubscriptionId) =>
      _$this._activeSubscriptionId = activeSubscriptionId;

  CustomerStatsBuilder? _stats;
  CustomerStatsBuilder get stats => _$this._stats ??= CustomerStatsBuilder();
  set stats(CustomerStatsBuilder? stats) => _$this._stats = stats;

  int? _walletBalanceCents;
  int? get walletBalanceCents => _$this._walletBalanceCents;
  set walletBalanceCents(int? walletBalanceCents) =>
      _$this._walletBalanceCents = walletBalanceCents;

  int? _debtCents;
  int? get debtCents => _$this._debtCents;
  set debtCents(int? debtCents) => _$this._debtCents = debtCents;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  CustomerBuilder() {
    Customer._defaults(this);
  }

  CustomerBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _email = $v.email;
      _phone = $v.phone;
      _cpf = $v.cpf;
      _birthDate = $v.birthDate;
      _kycStatus = $v.kycStatus;
      _status = $v.status;
      _delinquent = $v.delinquent;
      _restricted = $v.restricted;
      _blockedReason = $v.blockedReason;
      _blockedAt = $v.blockedAt;
      _locationConsent = $v.locationConsent;
      _emergencyContactName = $v.emergencyContactName;
      _emergencyContactPhone = $v.emergencyContactPhone;
      _pixRefundKeyType = $v.pixRefundKeyType;
      _pixRefundKey = $v.pixRefundKey;
      _activePlanCode = $v.activePlanCode;
      _activeSubscriptionId = $v.activeSubscriptionId;
      _stats = $v.stats?.toBuilder();
      _walletBalanceCents = $v.walletBalanceCents;
      _debtCents = $v.debtCents;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Customer other) {
    _$v = other as _$Customer;
  }

  @override
  void update(void Function(CustomerBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Customer build() => _build();

  _$Customer _build() {
    _$Customer _$result;
    try {
      _$result = _$v ??
          _$Customer._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Customer', 'id'),
            name: name,
            email: BuiltValueNullFieldError.checkNotNull(
                email, r'Customer', 'email'),
            phone: phone,
            cpf: cpf,
            birthDate: birthDate,
            kycStatus: BuiltValueNullFieldError.checkNotNull(
                kycStatus, r'Customer', 'kycStatus'),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'Customer', 'status'),
            delinquent: BuiltValueNullFieldError.checkNotNull(
                delinquent, r'Customer', 'delinquent'),
            restricted: BuiltValueNullFieldError.checkNotNull(
                restricted, r'Customer', 'restricted'),
            blockedReason: blockedReason,
            blockedAt: blockedAt,
            locationConsent: locationConsent,
            emergencyContactName: emergencyContactName,
            emergencyContactPhone: emergencyContactPhone,
            pixRefundKeyType: pixRefundKeyType,
            pixRefundKey: pixRefundKey,
            activePlanCode: activePlanCode,
            activeSubscriptionId: activeSubscriptionId,
            stats: _stats?.build(),
            walletBalanceCents: walletBalanceCents,
            debtCents: debtCents,
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'Customer', 'createdAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'stats';
        _stats?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Customer', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
