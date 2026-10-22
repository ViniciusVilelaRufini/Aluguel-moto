import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Relogio em UTC (sobrescrito nos testes para controlar contagens regressivas).
final clockProvider = Provider<DateTime Function()>((ref) => () => DateTime.now().toUtc());
