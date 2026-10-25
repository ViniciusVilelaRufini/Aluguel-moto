import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

/// DSN do Sentry (`--dart-define=SENTRY_DSN=https://...`). Opcional: vazio = desligado.
const kSentryDsn = String.fromEnvironment('SENTRY_DSN');

/// Crash reporting so liga com DSN e em build release/profile (nunca em debug).
bool crashReportingEnabled({required String dsn, required bool isDebug}) => dsn.trim().isNotEmpty && !isDebug;

/// Redações em ordem: a de cartão roda antes da de CPF e da de telefone (um PAN contém sequências que as duas pegariam
/// pela metade), e as de coordenada antes da de telefone (revisão final, I2).
final List<(RegExp, String Function(Match))> _redactions = [
  (RegExp(r'Bearer\s+[A-Za-z0-9._~+/=-]+', caseSensitive: false), (_) => 'Bearer [token]'),
  (RegExp(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*'), (_) => '[jwt]'),
  (RegExp(r'[\w.+-]+@[\w-]+(\.[\w-]+)+'), (_) => '[email]'),
  // Coordenada com chave: lat=-23.56, "lng": -46.65, longitude: -46 (JSON, query string, toString de mapa).
  (
    RegExp(r'''\b(lat|latitude|lng|lon|long|longitude)\b(["']?\s*[:=]\s*["']?)[-+]?\d{1,3}(?:\.\d+)?''', caseSensitive: false),
    (m) => '${m[1]}${m[2]}[coord]',
  ),
  // Par de coordenadas com 2+ decimais e qualquer separador (vírgula, ponto e vírgula, barra ou espaço).
  (RegExp(r'[-+]?\d{1,3}\.\d{2,}\s*[,;/ ]\s*[-+]?\d{1,3}\.\d{2,}'), (_) => '[coords]'),
  // Número de cartão (PAN): 13 a 19 dígitos, com ou sem espaço/hífen entre eles.
  (RegExp(r'(?<![\w])(?:\d[ -]?){12,18}\d(?![\w])'), (_) => '[card]'),
  (RegExp(r'(?<![\w])\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?![\w])'), (_) => '[cpf]'),
  // Telefone BR: +55 opcional, DDD com ou sem parênteses, 8 ou 9 dígitos, com espaço, ponto ou hífen opcionais.
  (RegExp(r'(?<![\w+])(?:\+?55[\s.-]?)?(?:\(\d{2}\)|\d{2})[\s.-]?9?\d{4}[\s.-]?\d{4}(?![\w])'), (_) => '[phone]'),
];

/// Tira de um texto livre o que identifica pessoa (token, e-mail, coordenadas, cartão, CPF, telefone).
String scrubText(String input) {
  var out = input;
  for (final (re, to) in _redactions) {
    out = out.replaceAllMapped(re, to);
  }
  return out;
}

/// De `contexts` ficam só sistema, aparelho (modelo, sem nome dado pelo dono) e app (versão), sem campos livres.
Contexts _safeContexts(Contexts c) {
  final d = c.device;
  final os = c.operatingSystem;
  final app = c.app;
  return Contexts(
    device: d == null ? null : SentryDevice(family: d.family, model: d.model, modelId: d.modelId, arch: d.arch, manufacturer: d.manufacturer, brand: d.brand, simulator: d.simulator),
    operatingSystem: os == null ? null : SentryOperatingSystem(name: os.name, version: os.version, build: os.build),
    app: app == null ? null : SentryApp(name: app.name, version: app.version, identifier: app.identifier, build: app.build, buildType: app.buildType),
    runtimes: c.runtimes,
  );
}

/// Trilha de ações nunca é enviada (`maxBreadcrumbs = 0`); se algum caminho a reativar, o texto passa pelo scrub e os
/// dados (URLs, posição) saem.
Breadcrumb? scrubBreadcrumb(Breadcrumb? b) => null;

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
    contexts: _safeContexts(event.contexts),
    sdk: event.sdk,
    debugMeta: event.debugMeta,
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
  o.beforeBreadcrumb = (b, _) => scrubBreadcrumb(b);
  // ignore: experimental_member_use
  o.attachViewHierarchy = false;
  o.enableAutoPerformanceTracing = false;
  // Crash nativo (NDK/Android, KSCrash/iOS) é montado e enviado pelo SDK nativo sem passar pelo `beforeSend` do Dart,
  // então não teria o scrub acima. Até existir scrub nativo, fica desligado (revisão final, I2; docs/decisoes.md).
  o.enableNativeCrashHandling = false;
  o.enableNdkScopeSync = false;
}

/// Roda [app] sob o Sentry quando habilitado; sem DSN (ou em debug) so executa [app].
Future<void> runWithCrashReporting(FutureOr<void> Function() app) async {
  if (!crashReportingEnabled(dsn: kSentryDsn, isDebug: kDebugMode)) {
    await app();
    return;
  }
  await SentryFlutter.init((o) => configureSentry(o, dsn: kSentryDsn), appRunner: app);
}
