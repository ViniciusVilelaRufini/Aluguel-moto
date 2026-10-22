import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Intencao de uma haptica do Volti (ver [VoltiHaptics]).
enum VoltiHapticKind { selection, tap, warning, alert, success }

/// Recebe cada haptica pedida. Troque por um gravador em testes
/// ([VoltiHaptics.debugHandler]).
typedef VoltiHapticsHandler = Future<void> Function(VoltiHapticKind kind);

/// Haptica semantica do Volti (evolucao E-03, `docs/design/evolucoes-app.md`).
///
/// Um nome por intencao para que os apps nao escolham intensidades soltas:
/// - [selection]: trocar selecao (pin, plano, estrela, filtro).
/// - [tap]: confirmar uma acao leve (copiar, puxar para atualizar) e o toque
///   nos CTAs de confirmacao (`VoltiButton(haptic: ...)`).
/// - [warning]: algo pede atencao (zona com limite, ultimo minuto da reserva).
/// - [alert]: emergencia (queda detectada, SOS).
/// - [success]: conclusao (moto travada, Pix pago, recibo).
///
/// Haptica nao e movimento: continua ativa com reduced motion. So vibra em
/// Android e iOS; falhas da plataforma (emulador sem motor) sao ignoradas.
abstract final class VoltiHaptics {
  /// Desliga a haptica (preferencia do usuario). Padrao: ligada.
  static bool enabled = true;

  /// Substitui a plataforma (testes). `null` = canal do sistema.
  @visibleForTesting
  static VoltiHapticsHandler? debugHandler;

  static Future<void> selection() => play(VoltiHapticKind.selection);
  static Future<void> tap() => play(VoltiHapticKind.tap);
  static Future<void> warning() => play(VoltiHapticKind.warning);
  static Future<void> alert() => play(VoltiHapticKind.alert);

  /// Conclusao. Um impacto medio unico: sem atrasos/timers, para nao deixar
  /// trabalho pendente em testes nem competir com o check animado.
  static Future<void> success() => play(VoltiHapticKind.success);

  /// Toca a haptica [kind], respeitando [enabled] e a plataforma.
  static Future<void> play(VoltiHapticKind kind) async {
    if (!enabled) return;
    final h = debugHandler;
    if (h != null) return h(kind);
    if (!supported) return;
    try {
      await switch (kind) {
        VoltiHapticKind.selection => HapticFeedback.selectionClick(),
        VoltiHapticKind.tap => HapticFeedback.lightImpact(),
        VoltiHapticKind.warning => HapticFeedback.mediumImpact(),
        VoltiHapticKind.alert => HapticFeedback.heavyImpact(),
        VoltiHapticKind.success => HapticFeedback.mediumImpact(),
      };
    } catch (_) {
      // Sem motor de vibracao: segue sem haptica.
    }
  }

  /// `true` em Android e iOS (web e desktop nao vibram).
  static bool get supported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);
}
