import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../onboarding/otp_flow.dart' show formatBrPhone;

export '../plan/plan_screen.dart' show walletProvider;

// Providers compartilhados pelas telas da conta.

final historyProvider = FutureProvider.autoDispose<List<Rental>>((ref) => ref.watch(backendProvider).rentals());

final subscriptionsProvider =
    FutureProvider.autoDispose<List<Subscription>>((ref) => ref.watch(backendProvider).subscriptions());

final packagesProvider =
    FutureProvider.autoDispose<List<MinutePackage>>((ref) => ref.watch(backendProvider).minutePackages());

final ledgerProvider = FutureProvider.autoDispose<List<WalletEntry>>((ref) => ref.watch(backendProvider).walletLedger());

final disputesProvider = FutureProvider.autoDispose<List<Dispute>>((ref) => ref.watch(backendProvider).disputes());

final claimsProvider = FutureProvider.autoDispose<List<Claim>>((ref) => ref.watch(backendProvider).claims());

/// Planos recorrentes (semanal e mensal) com o preco vigente.
final recurringPlansProvider = FutureProvider.autoDispose<List<PricingPlan>>((ref) async {
  final plans = await ref.watch(backendProvider).plans();
  return plans.where((p) => p.recurring && p.active).toList();
});

final accountCardsProvider = FutureProvider.autoDispose<List<PaymentCard>>((ref) => ref.watch(backendProvider).cards());

/// Assinatura que vale agora (ativa e dentro do periodo), ou null.
Subscription? activeSubscription(List<Subscription> list) {
  for (final s in list) {
    if (s.status == SubscriptionStatus.active || s.status == SubscriptionStatus.pastDue) return s;
  }
  return null;
}

/// "28/10" no horario de Sao Paulo.
String formatDaySp(DateTime d) {
  final x = toSaoPaulo(d);
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(x.day)}/${two(x.month)}';
}

/// "14:05" no horario de Sao Paulo.
String formatTimeSp(DateTime d) {
  final x = toSaoPaulo(d);
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(x.hour)}:${two(x.minute)}';
}

/// Iniciais do nome para o avatar ("Ana Lima" -> "AL").
String initialsOf(String? name) {
  final parts = (name ?? '').trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  final first = parts.first.characters.first;
  final last = parts.length > 1 ? parts.last.characters.first : '';
  return (first + last).toUpperCase();
}

/// Esqueleto padrao das listas da conta (formato de `ListRow`).
Widget accountListSkeleton(String label) => Padding(
      padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
      child: VoltiSkeleton.list(label: label),
    );

/// Chave de idempotencia por tentativa do cliente: a mesma operacao (mesmos
/// parametros) repetida depois de falha de rede ou 5xx reusa a chave, para o
/// servidor devolver o mesmo recurso em vez de cobrar duas vezes. Resultado
/// definitivo (sucesso ou 4xx) ou parametros novos geram chave nova.
class AttemptKeys {
  AttemptKeys([String Function()? generate]) : _generate = generate ?? newIdempotencyKey;
  final String Function() _generate;
  Object? _params;
  String? _key;

  String keyFor(Object params) {
    if (_key != null && _params == params) return _key!;
    _params = params;
    return _key = _generate();
  }

  /// Fecha a tentativa: a proxima chamada gera chave nova.
  void settle() {
    _params = null;
    _key = null;
  }

  /// Sucesso ou erro definitivo (4xx) fecha a tentativa; rede e 5xx mantem a chave.
  static bool isDefinitive(Object error) {
    final f = toFailure(error);
    return f.kind == FailureKind.api && (f.status ?? 500) < 500;
  }
}

final topUpAttemptProvider = Provider<AttemptKeys>((ref) => AttemptKeys());
final subscribeAttemptProvider = Provider<AttemptKeys>((ref) => AttemptKeys());

/// Recarga Pix criada e ainda nao paga (cliente tocou em "Pagar depois" ou fechou o QR).
class PendingTopUpNotifier extends Notifier<TopUp?> {
  @override
  TopUp? build() => null;
  void set(TopUp? t) => state = t;
}

final pendingTopUpProvider = NotifierProvider<PendingTopUpNotifier, TopUp?>(PendingTopUpNotifier.new);

/// Intervalo da conferencia de Pix pendente com a Carteira aberta (baixa frequencia).
final pendingTopUpPollProvider = Provider<Duration>((ref) => const Duration(seconds: 20));

/// Dominios dos e-mails que o app/API inventam quando o cadastro e por
/// celular (ou o token nao traz e-mail). Nunca aparecem na interface.
const _syntheticEmailDomains = ['@celular.volti.dev', '@sem-email.volti.invalid'];

bool isSyntheticEmail(String email) => _syntheticEmailDomains.any(email.toLowerCase().endsWith);

/// Linha de contato abaixo do nome: o e-mail real ou, no cadastro por
/// celular, o telefone formatado ("(11) 96100-7441"). `null` se nao houver.
String? contactLine(Customer c) {
  if (!isSyntheticEmail(c.email)) return c.email;
  final phone = c.phone;
  if (phone != null && phone.isNotEmpty) return formatBrPhone(phone);
  final local = c.email.split('@').first;
  if (c.email.toLowerCase().endsWith('@celular.volti.dev') && RegExp(r'^\d{12,13}$').hasMatch(local)) {
    return formatBrPhone('+$local');
  }
  return null;
}
