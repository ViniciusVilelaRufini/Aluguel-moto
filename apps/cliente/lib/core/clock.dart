import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Relogio em UTC no horario do servidor: o relogio do aparelho corrigido pelo
/// cabecalho `Date` das respostas da API ([ServerClock]). Sobrescrito nos testes
/// para controlar contagens regressivas.
final clockProvider = Provider<DateTime Function()>((ref) => ref.watch(serverClockProvider).now);
