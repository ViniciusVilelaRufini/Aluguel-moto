// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tracker_console_command.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$TrackerConsoleCommand extends TrackerConsoleCommand {
  @override
  final String id;
  @override
  final String vehicleId;
  @override
  final String text;
  @override
  final TrackerConsoleRisk risk;
  @override
  final TrackerConsoleStatus status;
  @override
  final TrackerConsoleFailReason? failReason;
  @override
  final String? response;
  @override
  final TrackerStatusReport? statusReport;
  @override
  final String requestedById;
  @override
  final DateTime createdAt;
  @override
  final DateTime? respondedAt;

  factory _$TrackerConsoleCommand(
          [void Function(TrackerConsoleCommandBuilder)? updates]) =>
      (TrackerConsoleCommandBuilder()..update(updates))._build();

  _$TrackerConsoleCommand._(
      {required this.id,
      required this.vehicleId,
      required this.text,
      required this.risk,
      required this.status,
      this.failReason,
      this.response,
      this.statusReport,
      required this.requestedById,
      required this.createdAt,
      this.respondedAt})
      : super._();
  @override
  TrackerConsoleCommand rebuild(
          void Function(TrackerConsoleCommandBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TrackerConsoleCommandBuilder toBuilder() =>
      TrackerConsoleCommandBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is TrackerConsoleCommand &&
        id == other.id &&
        vehicleId == other.vehicleId &&
        text == other.text &&
        risk == other.risk &&
        status == other.status &&
        failReason == other.failReason &&
        response == other.response &&
        statusReport == other.statusReport &&
        requestedById == other.requestedById &&
        createdAt == other.createdAt &&
        respondedAt == other.respondedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, text.hashCode);
    _$hash = $jc(_$hash, risk.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, failReason.hashCode);
    _$hash = $jc(_$hash, response.hashCode);
    _$hash = $jc(_$hash, statusReport.hashCode);
    _$hash = $jc(_$hash, requestedById.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, respondedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'TrackerConsoleCommand')
          ..add('id', id)
          ..add('vehicleId', vehicleId)
          ..add('text', text)
          ..add('risk', risk)
          ..add('status', status)
          ..add('failReason', failReason)
          ..add('response', response)
          ..add('statusReport', statusReport)
          ..add('requestedById', requestedById)
          ..add('createdAt', createdAt)
          ..add('respondedAt', respondedAt))
        .toString();
  }
}

class TrackerConsoleCommandBuilder
    implements Builder<TrackerConsoleCommand, TrackerConsoleCommandBuilder> {
  _$TrackerConsoleCommand? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _text;
  String? get text => _$this._text;
  set text(String? text) => _$this._text = text;

  TrackerConsoleRisk? _risk;
  TrackerConsoleRisk? get risk => _$this._risk;
  set risk(TrackerConsoleRisk? risk) => _$this._risk = risk;

  TrackerConsoleStatus? _status;
  TrackerConsoleStatus? get status => _$this._status;
  set status(TrackerConsoleStatus? status) => _$this._status = status;

  TrackerConsoleFailReason? _failReason;
  TrackerConsoleFailReason? get failReason => _$this._failReason;
  set failReason(TrackerConsoleFailReason? failReason) =>
      _$this._failReason = failReason;

  String? _response;
  String? get response => _$this._response;
  set response(String? response) => _$this._response = response;

  TrackerStatusReportBuilder? _statusReport;
  TrackerStatusReportBuilder get statusReport =>
      _$this._statusReport ??= TrackerStatusReportBuilder();
  set statusReport(TrackerStatusReportBuilder? statusReport) =>
      _$this._statusReport = statusReport;

  String? _requestedById;
  String? get requestedById => _$this._requestedById;
  set requestedById(String? requestedById) =>
      _$this._requestedById = requestedById;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _respondedAt;
  DateTime? get respondedAt => _$this._respondedAt;
  set respondedAt(DateTime? respondedAt) => _$this._respondedAt = respondedAt;

  TrackerConsoleCommandBuilder() {
    TrackerConsoleCommand._defaults(this);
  }

  TrackerConsoleCommandBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _vehicleId = $v.vehicleId;
      _text = $v.text;
      _risk = $v.risk;
      _status = $v.status;
      _failReason = $v.failReason;
      _response = $v.response;
      _statusReport = $v.statusReport?.toBuilder();
      _requestedById = $v.requestedById;
      _createdAt = $v.createdAt;
      _respondedAt = $v.respondedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(TrackerConsoleCommand other) {
    _$v = other as _$TrackerConsoleCommand;
  }

  @override
  void update(void Function(TrackerConsoleCommandBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  TrackerConsoleCommand build() => _build();

  _$TrackerConsoleCommand _build() {
    _$TrackerConsoleCommand _$result;
    try {
      _$result = _$v ??
          _$TrackerConsoleCommand._(
            id: BuiltValueNullFieldError.checkNotNull(
                id, r'TrackerConsoleCommand', 'id'),
            vehicleId: BuiltValueNullFieldError.checkNotNull(
                vehicleId, r'TrackerConsoleCommand', 'vehicleId'),
            text: BuiltValueNullFieldError.checkNotNull(
                text, r'TrackerConsoleCommand', 'text'),
            risk: BuiltValueNullFieldError.checkNotNull(
                risk, r'TrackerConsoleCommand', 'risk'),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'TrackerConsoleCommand', 'status'),
            failReason: failReason,
            response: response,
            statusReport: _statusReport?.build(),
            requestedById: BuiltValueNullFieldError.checkNotNull(
                requestedById, r'TrackerConsoleCommand', 'requestedById'),
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'TrackerConsoleCommand', 'createdAt'),
            respondedAt: respondedAt,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'statusReport';
        _statusReport?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'TrackerConsoleCommand', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
