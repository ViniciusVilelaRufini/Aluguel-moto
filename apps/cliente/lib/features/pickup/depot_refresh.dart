import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../home/depot_providers.dart';

/// Mantem o horario do galpao atualizado no fluxo de reserva (E-02): busca de
/// novo ao entrar na tela e ao voltar do 2o plano. Sem isso o app continuava
/// com o "fechado agora" de antes de o galpao abrir.
///
/// Uso: `with WidgetsBindingObserver, DepotRefreshOnResume<MinhaTela>`.
mixin DepotRefreshOnResume<T extends ConsumerStatefulWidget> on ConsumerState<T>, WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Fora da fase de build: invalidar provider durante o initState e proibido.
    Future.microtask(() {
      if (mounted) ref.invalidate(depotsProvider);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) ref.invalidate(depotsProvider);
  }
}
