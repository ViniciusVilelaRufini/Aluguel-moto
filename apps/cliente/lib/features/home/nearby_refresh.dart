import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'providers.dart';

/// Mantem `nearbyProvider` atualizado enquanto a tela esta visivel: recarrega a cada
/// [interval] (so com a rota no topo e o app em primeiro plano) e ao voltar do segundo plano.
/// Usado pelo mapa e pela lista "Escolha sua moto" (motos sao reservadas por outros clientes).
class NearbyAutoRefresh extends ConsumerStatefulWidget {
  const NearbyAutoRefresh({super.key, required this.child, this.interval = const Duration(seconds: 20)});
  final Widget child;
  final Duration interval;

  @override
  ConsumerState<NearbyAutoRefresh> createState() => _NearbyAutoRefreshState();
}

class _NearbyAutoRefreshState extends ConsumerState<NearbyAutoRefresh> with WidgetsBindingObserver {
  Timer? _timer;
  bool _foreground = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(widget.interval, (_) {
      if (mounted && _foreground && _visible) ref.invalidate(nearbyProvider);
    });
  }

  /// Rota no topo (a home coberta pela lista nao recarrega a toa).
  bool get _visible => ModalRoute.of(context)?.isCurrent ?? true;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final wasForeground = _foreground;
    _foreground = state == AppLifecycleState.resumed;
    if (_foreground && !wasForeground && mounted && _visible) ref.invalidate(nearbyProvider);
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
