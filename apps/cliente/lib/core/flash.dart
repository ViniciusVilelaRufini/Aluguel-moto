import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Mensagem que uma tela deixa para a proxima mostrar (design: "Reserva
/// cancelada", "Obrigado por andar de Volti", "Cadastro enviado..." no mapa).
class FlashMessage {
  const FlashMessage(this.text, {this.tone = VoltiToastTone.success});
  final String text;
  final VoltiToastTone tone;
}

/// Toast entre telas (H8). Quem sai chama [FlashNotifier.show]; o mapa le com
/// [FlashNotifier.take] (consome uma vez) e mostra com `VoltiToast`.
final flashProvider = NotifierProvider<FlashNotifier, FlashMessage?>(FlashNotifier.new);

class FlashNotifier extends Notifier<FlashMessage?> {
  @override
  FlashMessage? build() => null;

  void show(String text, {VoltiToastTone tone = VoltiToastTone.success}) => state = FlashMessage(text, tone: tone);

  /// Devolve a mensagem pendente e limpa (cada flash aparece uma vez so).
  FlashMessage? take() {
    final m = state;
    if (m != null) state = null;
    return m;
  }
}
