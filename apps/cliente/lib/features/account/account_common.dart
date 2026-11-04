import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/geo.dart';
import '../onboarding/otp_flow.dart' show formatBrPhone;

export '../plan/plan_common.dart' show walletProvider;

// Providers compartilhados pelas telas da conta.

final historyProvider = FutureProvider.autoDispose<List<Rental>>((ref) => ref.watch(backendProvider).rentals());

final subscriptionsProvider =
    FutureProvider.autoDispose<List<Subscription>>((ref) => ref.watch(backendProvider).subscriptions());

final ledgerProvider = FutureProvider.autoDispose<List<WalletEntry>>((ref) => ref.watch(backendProvider).walletLedger());

final disputesProvider = FutureProvider.autoDispose<List<Dispute>>((ref) => ref.watch(backendProvider).disputes());

final claimsProvider = FutureProvider.autoDispose<List<Claim>>((ref) => ref.watch(backendProvider).claims());

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

/// Dia civil de Sao Paulo de [d] == o de [now]?
bool isSameDaySp(DateTime d, DateTime now) {
  final a = toSaoPaulo(d), b = toSaoPaulo(now);
  return a.year == b.year && a.month == b.month && a.day == b.day;
}

/// "13:46" se [d] cai no mesmo dia (Sao Paulo) de [now]; senao "11/11 13:46".
String formatTimeOrDateTimeSp(DateTime d, DateTime now) => isSameDaySp(d, now) ? formatTimeSp(d) : formatShortDateTimeSp(d, now);

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
