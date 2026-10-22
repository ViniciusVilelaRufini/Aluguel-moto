import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../l10n/app_localizations.dart';

enum FailureKind { network, unauthorized, api, unknown }

/// Falha de dominio com texto pronto para a UI (RFC 7807 da API ou erro de rede).
class AppFailure implements Exception {
  AppFailure({
    required this.kind,
    this.status,
    this.slug,
    this.detail,
    this.title,
  });

  final FailureKind kind;
  final int? status;

  /// Ultimo segmento de `type` (ex.: `rental-outside-return-zone`).
  final String? slug;
  final String? detail;
  final String? title;

  bool get isNetwork => kind == FailureKind.network;

  String message(AppLocalizations l) {
    switch (kind) {
      case FailureKind.network:
        return l.errorNetwork;
      case FailureKind.unauthorized:
        return l.errorUnauthorized;
      case FailureKind.api:
        return detail ?? title ?? l.errorGeneric;
      case FailureKind.unknown:
        return l.errorGeneric;
    }
  }

  @override
  String toString() => 'AppFailure($kind, $status, $slug, $detail)';
}

AppFailure toFailure(Object error) {
  if (error is AppFailure) return error;
  _logError(error);
  if (error is DioException) {
    final res = error.response;
    if (res == null) return AppFailure(kind: FailureKind.network);
    final data = res.data;
    String? slug, detail, title;
    if (data is Map) {
      final type = data['type']?.toString();
      slug = type?.split('/').last;
      detail = data['detail']?.toString();
      title = data['title']?.toString();
    }
    if (res.statusCode == 401) {
      return AppFailure(kind: FailureKind.unauthorized, status: 401, slug: slug);
    }
    return AppFailure(
      kind: FailureKind.api,
      status: res.statusCode,
      slug: slug,
      detail: detail,
      title: title,
    );
  }
  return AppFailure(kind: FailureKind.unknown);
}

String failureText(AppLocalizations l, Object error) => toFailure(error).message(l);

/// Em debug, registra o erro original (DioException etc.) que o AppFailure esconde.
void _logError(Object error) {
  if (!kDebugMode) return;
  if (error is DioException) {
    final req = error.requestOptions;
    debugPrint('[toFailure] DioException ${error.type} ${req.method} ${req.uri.origin}${req.uri.path} '
        'status=${error.response?.statusCode} body=${error.response?.data} cause=${error.error}');
  } else {
    debugPrint('[toFailure] ${error.runtimeType}: $error');
  }
}
