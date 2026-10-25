import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

/// DSN do Sentry (`--dart-define=SENTRY_DSN=https://...`). Opcional: vazio = desligado.
const kSentryDsn = String.fromEnvironment('SENTRY_DSN');

/// Crash reporting so liga com DSN e em build release/profile (nunca em debug).
bool crashReportingEnabled({required String dsn, required bool isDebug}) => dsn.trim().isNotEmpty && !isDebug;

final _redactions = <RegExp, String>{
  RegExp(r'Bearer\s+[A-Za-z0-9._~+/=-]+', caseSensitive: false): 'Bearer [token]',
  RegExp(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*'): '[jwt]',
  RegExp(r'[\w.+-]+@[\w-]+(\.[\w-]+)+'): '[email]',
  RegExp(r'\d{3}\.?\d{3}\.?\d{3}-?\d{2}'): '[cpf]',
  RegExp(r'[-+]?\d{1,3}\.\d{4,},\s*[-+]?\d{1,3}\.\d{4,}'): '[coords]',
};

/// Tira de um texto livre o que identifica pessoa (token, e-mail, CPF, coordenadas).
String scrubText(String input) {
  var out = input;
  _redactions.forEach((re, to) => out = out.replaceAll(re, to));
  return out;
}

/// Remove dados pessoais do evento antes do envio: usuario, requisicao (URL,
/// cabecalhos, cookies, corpo), trilha de acoes (URLs e posicao), dados extras,
/// tags, nome do servidor, e redige o texto das excecoes e da mensagem.
SentryEvent? scrubEvent(SentryEvent event) {
  // `copyWith` mantem o valor antigo quando recebe null; por isso o evento e remontado
  // so com os campos seguros (sem user, request, breadcrumbs, extra, tags, transaction).
  final message = event.message;
  final exceptions = event.exceptions;
  if (exceptions != null) {
    for (final e in exceptions) {
      final v = e.value;
      if (v != null) e.value = scrubText(v);
    }
  }
  return SentryEvent(
    eventId: event.eventId,
    timestamp: event.timestamp,
    platform: event.platform,
    logger: event.logger,
    release: event.release,
    dist: event.dist,
    environment: event.environment,
    throwable: event.throwable,
    level: event.level,
    fingerprint: event.fingerprint,
    contexts: event.contexts,
    sdk: event.sdk,
    debugMeta: event.debugMeta,
    threads: event.threads,
    type: event.type,
    exceptions: exceptions,
    message: message == null ? null : SentryMessage(scrubText(message.formatted)),
  );
}

void configureSentry(SentryFlutterOptions o, {required String dsn}) {
  o.dsn = dsn;
  o.sendDefaultPii = false;
  o.attachScreenshot = false;
  o.attachThreads = false;
  o.maxBreadcrumbs = 0;
  o.enableAutoNativeBreadcrumbs = false;
  o.tracesSampleRate = null;
  o.beforeSend = (event, hint) => scrubEvent(event);
  o.beforeBreadcrumb = (_, _) => null;
}

/// Roda [app] sob o Sentry quando habilitado; sem DSN (ou em debug) so executa [app].
Future<void> runWithCrashReporting(FutureOr<void> Function() app) async {
  if (!crashReportingEnabled(dsn: kSentryDsn, isDebug: kDebugMode)) {
    await app();
    return;
  }
  await SentryFlutter.init((o) => configureSentry(o, dsn: kSentryDsn), appRunner: app);
}
