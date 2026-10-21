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
      required this.claims})
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
        claims == other.claims;
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
          ..add('claims', claims))
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
