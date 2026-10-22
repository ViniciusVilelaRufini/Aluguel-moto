import 'package:flutter/services.dart';

/// Haptica semantica do Volti (evolucao E-03, `docs/design/evolucoes-app.md`).
///
/// Um nome por intencao para que os apps nao escolham intensidades soltas:
/// - [selection]: trocar selecao (pin, plano, estrela, filtro).
/// - [tap]: confirmar uma acao leve (copiar, puxar para atualizar).
/// - [warning]: algo pede atencao (zona com limite, ultimo minuto da reserva).
/// - [alert]: emergencia (queda detectada, SOS).
/// - [success]: conclusao (moto travada, Pix pago, recibo).
///
/// Haptica nao e movimento: continua ativa com reduced motion. Falhas da
/// plataforma (web, desktop, emulador sem motor) sao ignoradas.
abstract final class VoltiHaptics {
  /// Desliga a haptica (ex.: preferencia do usuario). Padrao: ligada.
  static bool enabled = true;

  static Future<void> selection() => _run(HapticFeedback.selectionClick);
  static Future<void> tap() => _run(HapticFeedback.lightImpact);
  static Future<void> warning() => _run(HapticFeedback.mediumImpact);
  static Future<void> alert() => _run(HapticFeedback.heavyImpact);

  /// Conclusao. Um impacto medio unico: sem atrasos/timers, para nao deixar
  /// trabalho pendente em testes nem competir com o check animado.
  static Future<void> success() => _run(HapticFeedback.mediumImpact);

  static Future<void> _run(Future<void> Function() f) async {
    if (!enabled) return;
    try {
      await f();
    } catch (_) {
      // Sem motor de vibracao: segue sem haptica.
    }
  }
}
