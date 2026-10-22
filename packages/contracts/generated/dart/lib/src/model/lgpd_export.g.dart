// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lgpd_export.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$LgpdExport extends LgpdExport {
  @override
  final DateTime generatedAt;
  @override
  final Customer customer;
  @override
  final Consents consents;
  @override
  final BuiltList<Rental> rentals;
  @override
  final BuiltList<Payment> payments;
  @override
  final BuiltList<Track> tracks;
  @override
  final BuiltList<WalletEntry> walletEntries;
  @override
  final BuiltList<Incident> incidents;
  @override
  final BuiltList<Dispute> disputes;
  @override
  final BuiltList<Claim> claims;
  @override
  final BuiltList<Subscription>? subscriptions;
  @override
  final BuiltList<CustomerCoupon>? coupons;
  @override
  final BuiltList<ReferralReward>? referrals;
  @override
  final String? referralCode;
  @override
  final BuiltList<CustomerMaintenanceRequest>? maintenanceRequests;
  @override
  final BuiltList<Reservation>? depotReservations;
  @override
  final BuiltList<Handover>? handovers;

  factory _$LgpdExport([void Function(LgpdExportBuilder)? updates]) =>
      (LgpdExportBuilder()..update(updates))._build();

  _$LgpdExport._(
      {required this.generatedAt,
      required this.customer,
      required this.consents,
      required this.rentals,
      required this.payments,
      required this.tracks,
      required this.walletEntries,
      required this.incidents,
      required this.disputes,
      required this.claims,
      this.subscriptions,
      this.coupons,
      this.referrals,
      this.referralCode,
      this.maintenanceRequests,
      this.depotReservations,
      this.handovers})
      : super._();
  @override
  LgpdExport rebuild(void Function(LgpdExportBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  LgpdExportBuilder toBuilder() => LgpdExportBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is LgpdExport &&
        generatedAt == other.generatedAt &&
        customer == other.customer &&
        consents == other.consents &&
        rentals == other.rentals &&
        payments == other.payments &&
        tracks == other.tracks &&
        walletEntries == other.walletEntries &&
        incidents == other.incidents &&
        disputes == other.disputes &&
        claims == other.claims &&
        subscriptions == other.subscriptions &&
        coupons == other.coupons &&
        referrals == other.referrals &&
        referralCode == other.referralCode &&
        maintenanceRequests == other.maintenanceRequests &&
        depotReservations == other.depotReservations &&
        handovers == other.handovers;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, generatedAt.hashCode);
    _$hash = $jc(_$hash, customer.hashCode);
    _$hash = $jc(_$hash, consents.hashCode);
    _$hash = $jc(_$hash, rentals.hashCode);
    _$hash = $jc(_$hash, payments.hashCode);
    _$hash = $jc(_$hash, tracks.hashCode);
    _$hash = $jc(_$hash, walletEntries.hashCode);
    _$hash = $jc(_$hash, incidents.hashCode);
    _$hash = $jc(_$hash, disputes.hashCode);
    _$hash = $jc(_$hash, claims.hashCode);
    _$hash = $jc(_$hash, subscriptions.hashCode);
    _$hash = $jc(_$hash, coupons.hashCode);
    _$hash = $jc(_$hash, referrals.hashCode);
    _$hash = $jc(_$hash, referralCode.hashCode);
    _$hash = $jc(_$hash, maintenanceRequests.hashCode);
    _$hash = $jc(_$hash, depotReservations.hashCode);
    _$hash = $jc(_$hash, handovers.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'LgpdExport')
          ..add('generatedAt', generatedAt)
          ..add('customer', customer)
          ..add('consents', consents)
          ..add('rentals', rentals)
          ..add('payments', payments)
          ..add('tracks', tracks)
          ..add('walletEntries', walletEntries)
          ..add('incidents', incidents)
          ..add('disputes', disputes)
          ..add('claims', claims)
          ..add('subscriptions', subscriptions)
          ..add('coupons', coupons)
          ..add('referrals', referrals)
          ..add('referralCode', referralCode)
          ..add('maintenanceRequests', maintenanceRequests)
          ..add('depotReservations', depotReservations)
          ..add('handovers', handovers))
        .toString();
  }
}

class LgpdExportBuilder implements Builder<LgpdExport, LgpdExportBuilder> {
  _$LgpdExport? _$v;

  DateTime? _generatedAt;
  DateTime? get generatedAt => _$this._generatedAt;
  set generatedAt(DateTime? generatedAt) => _$this._generatedAt = generatedAt;

  CustomerBuilder? _customer;
  CustomerBuilder get customer => _$this._customer ??= CustomerBuilder();
  set customer(CustomerBuilder? customer) => _$this._customer = customer;

  ConsentsBuilder? _consents;
  ConsentsBuilder get consents => _$this._consents ??= ConsentsBuilder();
  set consents(ConsentsBuilder? consents) => _$this._consents = consents;

  ListBuilder<Rental>? _rentals;
  ListBuilder<Rental> get rentals => _$this._rentals ??= ListBuilder<Rental>();
  set rentals(ListBuilder<Rental>? rentals) => _$this._rentals = rentals;

  ListBuilder<Payment>? _payments;
  ListBuilder<Payment> get payments =>
      _$this._payments ??= ListBuilder<Payment>();
  set payments(ListBuilder<Payment>? payments) => _$this._payments = payments;

  ListBuilder<Track>? _tracks;
  ListBuilder<Track> get tracks => _$this._tracks ??= ListBuilder<Track>();
  set tracks(ListBuilder<Track>? tracks) => _$this._tracks = tracks;

  ListBuilder<WalletEntry>? _walletEntries;
  ListBuilder<WalletEntry> get walletEntries =>
      _$this._walletEntries ??= ListBuilder<WalletEntry>();
  set walletEntries(ListBuilder<WalletEntry>? walletEntries) =>
      _$this._walletEntries = walletEntries;

  ListBuilder<Incident>? _incidents;
  ListBuilder<Incident> get incidents =>
      _$this._incidents ??= ListBuilder<Incident>();
  set incidents(ListBuilder<Incident>? incidents) =>
      _$this._incidents = incidents;

  ListBuilder<Dispute>? _disputes;
  ListBuilder<Dispute> get disputes =>
      _$this._disputes ??= ListBuilder<Dispute>();
  set disputes(ListBuilder<Dispute>? disputes) => _$this._disputes = disputes;

  ListBuilder<Claim>? _claims;
  ListBuilder<Claim> get claims => _$this._claims ??= ListBuilder<Claim>();
  set claims(ListBuilder<Claim>? claims) => _$this._claims = claims;

  ListBuilder<Subscription>? _subscriptions;
  ListBuilder<Subscription> get subscriptions =>
      _$this._subscriptions ??= ListBuilder<Subscription>();
  set subscriptions(ListBuilder<Subscription>? subscriptions) =>
      _$this._subscriptions = subscriptions;

  ListBuilder<CustomerCoupon>? _coupons;
  ListBuilder<CustomerCoupon> get coupons =>
      _$this._coupons ??= ListBuilder<CustomerCoupon>();
  set coupons(ListBuilder<CustomerCoupon>? coupons) =>
      _$this._coupons = coupons;

  ListBuilder<ReferralReward>? _referrals;
  ListBuilder<ReferralReward> get referrals =>
      _$this._referrals ??= ListBuilder<ReferralReward>();
  set referrals(ListBuilder<ReferralReward>? referrals) =>
      _$this._referrals = referrals;

  String? _referralCode;
  String? get referralCode => _$this._referralCode;
  set referralCode(String? referralCode) => _$this._referralCode = referralCode;

  ListBuilder<CustomerMaintenanceRequest>? _maintenanceRequests;
  ListBuilder<CustomerMaintenanceRequest> get maintenanceRequests =>
      _$this._maintenanceRequests ??= ListBuilder<CustomerMaintenanceRequest>();
  set maintenanceRequests(
          ListBuilder<CustomerMaintenanceRequest>? maintenanceRequests) =>
      _$this._maintenanceRequests = maintenanceRequests;

  ListBuilder<Reservation>? _depotReservations;
  ListBuilder<Reservation> get depotReservations =>
      _$this._depotReservations ??= ListBuilder<Reservation>();
  set depotReservations(ListBuilder<Reservation>? depotReservations) =>
      _$this._depotReservations = depotReservations;

  ListBuilder<Handover>? _handovers;
  ListBuilder<Handover> get handovers =>
      _$this._handovers ??= ListBuilder<Handover>();
  set handovers(ListBuilder<Handover>? handovers) =>
      _$this._handovers = handovers;

  LgpdExportBuilder() {
    LgpdExport._defaults(this);
  }

  LgpdExportBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _generatedAt = $v.generatedAt;
      _customer = $v.customer.toBuilder();
      _consents = $v.consents.toBuilder();
      _rentals = $v.rentals.toBuilder();
      _payments = $v.payments.toBuilder();
      _tracks = $v.tracks.toBuilder();
      _walletEntries = $v.walletEntries.toBuilder();
      _incidents = $v.incidents.toBuilder();
      _disputes = $v.disputes.toBuilder();
      _claims = $v.claims.toBuilder();
      _subscriptions = $v.subscriptions?.toBuilder();
      _coupons = $v.coupons?.toBuilder();
      _referrals = $v.referrals?.toBuilder();
      _referralCode = $v.referralCode;
      _maintenanceRequests = $v.maintenanceRequests?.toBuilder();
      _depotReservations = $v.depotReservations?.toBuilder();
      _handovers = $v.handovers?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(LgpdExport other) {
    _$v = other as _$LgpdExport;
  }

  @override
  void update(void Function(LgpdExportBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  LgpdExport build() => _build();

  _$LgpdExport _build() {
    _$LgpdExport _$result;
    try {
      _$result = _$v ??
          _$LgpdExport._(
            generatedAt: BuiltValueNullFieldError.checkNotNull(
                generatedAt, r'LgpdExport', 'generatedAt'),
            customer: customer.build(),
            consents: consents.build(),
            rentals: rentals.build(),
            payments: payments.build(),
            tracks: tracks.build(),
            walletEntries: walletEntries.build(),
            incidents: incidents.build(),
            disputes: disputes.build(),
            claims: claims.build(),
            subscriptions: _subscriptions?.build(),
            coupons: _coupons?.build(),
            referrals: _referrals?.build(),
            referralCode: referralCode,
            maintenanceRequests: _maintenanceRequests?.build(),
            depotReservations: _depotReservations?.build(),
            handovers: _handovers?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'customer';
        customer.build();
        _$failedField = 'consents';
        consents.build();
        _$failedField = 'rentals';
        rentals.build();
        _$failedField = 'payments';
        payments.build();
        _$failedField = 'tracks';
        tracks.build();
        _$failedField = 'walletEntries';
        walletEntries.build();
        _$failedField = 'incidents';
        incidents.build();
        _$failedField = 'disputes';
        disputes.build();
        _$failedField = 'claims';
        claims.build();
        _$failedField = 'subscriptions';
        _subscriptions?.build();
        _$failedField = 'coupons';
        _coupons?.build();
        _$failedField = 'referrals';
        _referrals?.build();

        _$failedField = 'maintenanceRequests';
        _maintenanceRequests?.build();
        _$failedField = 'depotReservations';
        _depotReservations?.build();
        _$failedField = 'handovers';
        _handovers?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'LgpdExport', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
