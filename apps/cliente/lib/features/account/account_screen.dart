import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/geo.dart';
import '../../core/launcher.dart';
import '../../core/legal.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import 'account_common.dart';
import 'privacy_screen.dart';
import 'subscriptions_screen.dart';
import 'wallet_screen.dart';

/// Conta (AccountScreen do design): perfil com selos, creditos, recarga e grupos
/// Plano, Viagens, Ajuda e Privacidade (LGPD).
///
/// Cupons e indicacao, estacoes de troca de bateria e agendamento de manutencao
/// dependem de contrato (docs/decisoes.md) e ficam fora ate la.
class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final s = ref.watch(sessionProvider).value;
    final c = s?.customer;
    final wallet = ref.watch(walletProvider);
    final subs = ref.watch(subscriptionsProvider);
    final history = ref.watch(historyProvider);
    final active = subs.value == null ? null : activeSubscription(subs.value!);
    final emergency = c?.emergencyContactName;

    return VoltiScaffold(
      title: l.accountTitle,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s16, VoltiSpacing.screenGutter, VoltiSpacing.s40),
        children: VoltiStagger.wrap([
          _Profile(customer: c, kyc: s?.kyc ?? KycStatus.notStarted),
          const SizedBox(height: VoltiSpacing.s16),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: StatTile(
                icon: LucideIcons.wallet,
                label: l.credits,
                value: wallet.value == null ? '—' : money(wallet.value!.balanceCents),
                onTap: () => context.push('/account/wallet'),
              ),
            ),
            const SizedBox(width: VoltiSpacing.s10),
            Expanded(
              child: StatTile(
                icon: LucideIcons.timer,
                label: l.minutePackage,
                value: wallet.value == null ? '—' : l.minutesBalance(wallet.value!.minutesBalance),
                onTap: () => context.push('/account/wallet'),
              ),
            ),
          ]),
          const SizedBox(height: VoltiSpacing.s10),
          VoltiButton(
            label: l.topUpWallet,
            icon: LucideIcons.plus,
            variant: VoltiButtonVariant.secondary,
            fullWidth: true,
            onPressed: () => openTopUp(context, ref),
          ),
          VoltiListGroup(title: l.groupPlan, children: [
            ListRow(
              icon: LucideIcons.calendarClock,
              iconTone: ListRowTone.brand,
              title: active == null ? l.myPlan : subscriptionName(context, active.planCode),
              subtitle: active == null
                  ? l.noActivePlan
                  : (active.cancelAtPeriodEnd == true
                      ? l.subscriptionEndsOn(formatDaySp(active.currentPeriodEnd))
                      : l.subscriptionNextCharge(formatDaySp(active.currentPeriodEnd), money(active.priceCents))),
              trailing: ListRowTrailing.chevron,
              onTap: () => context.push('/account/subscriptions'),
            ),
            ListRow(
              icon: LucideIcons.wallet,
              title: l.walletAndPackages,
              trailing: ListRowTrailing.chevron,
              onTap: () => context.push('/account/wallet'),
            ),
          ]),
          VoltiListGroup(title: l.groupTrips, children: [
            ListRow(
              icon: LucideIcons.history,
              title: l.historyTitle,
              value: history.value == null ? null : '${history.value!.length}',
              trailing: ListRowTrailing.chevron,
              onTap: () => context.push('/account/history'),
            ),
            ListRow(
              icon: LucideIcons.fileText,
              title: l.disputeOrClaim,
              trailing: ListRowTrailing.chevron,
              onTap: () => context.push('/account/requests'),
            ),
          ]),
          VoltiListGroup(title: l.groupHelp, children: [
            ListRow(
              icon: LucideIcons.messageCircle,
              iconTone: ListRowTone.brand,
              title: l.supportChat,
              trailing: ListRowTrailing.chevron,
              onTap: () => context.push('/account/support'),
            ),
            ListRow(
              icon: LucideIcons.circleQuestionMark,
              title: l.helpCenter,
              trailing: ListRowTrailing.chevron,
              onTap: () => context.push('/account/help'),
            ),
            ListRow(
              icon: LucideIcons.signpost,
              title: l.trafficRules,
              trailing: ListRowTrailing.chevron,
              onTap: () => context.push('/account/rules'),
            ),
            ListRow(
              icon: LucideIcons.siren,
              iconTone: ListRowTone.danger,
              title: l.emergencyTitle,
              subtitle: emergency == null || emergency.isEmpty ? l.emergencyRowEmpty : emergency,
              trailing: ListRowTrailing.chevron,
              onTap: () => context.push('/account/emergency'),
            ),
          ]),
          VoltiListGroup(title: l.groupPrivacy, children: [
            ListRow(
              icon: LucideIcons.download,
              title: l.downloadMyData,
              trailing: ListRowTrailing.chevron,
              onTap: () => exportMyData(context, ref),
            ),
            ListRow(
              icon: LucideIcons.slidersHorizontal,
              title: l.consentsRow,
              trailing: ListRowTrailing.chevron,
              onTap: () => context.push('/account/privacy'),
            ),
            ListRow(
              key: const Key('account-terms'),
              icon: LucideIcons.fileText,
              title: l.termsOfUse,
              trailing: ListRowTrailing.chevron,
              onTap: () => openLegalDocument(context, ref, ref.read(legalLinksProvider).terms),
            ),
            ListRow(
              key: const Key('account-privacy-policy'),
              icon: LucideIcons.shieldCheck,
              title: l.privacyPolicy,
              trailing: ListRowTrailing.chevron,
              onTap: () => openLegalDocument(context, ref, ref.read(legalLinksProvider).privacy),
            ),
            ListRow(
              icon: LucideIcons.trash2,
              iconTone: ListRowTone.danger,
              title: l.deleteAccountConfirm,
              trailing: ListRowTrailing.chevron,
              onTap: () => confirmDeleteAccount(context, ref),
            ),
          ]),
          const SizedBox(height: VoltiSpacing.s24),
          VoltiButton(
            label: l.signOut,
            icon: LucideIcons.logOut,
            variant: VoltiButtonVariant.ghost,
            fullWidth: true,
            onPressed: () async {
              await ref.read(sessionProvider.notifier).signOut();
              if (context.mounted) context.go('/welcome');
            },
          ),
        ]),
      ),
    );
  }
}

class _Profile extends StatelessWidget {
  const _Profile({required this.customer, required this.kyc});
  final Customer? customer;
  final KycStatus kyc;

  bool get _adult {
    final b = customer?.birthDate;
    if (b == null) return kyc == KycStatus.approved;
    final now = DateTime.now();
    var age = now.year - b.year;
    if (now.month < b.month || (now.month == b.month && now.day < b.day)) age--;
    return age >= 18;
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final (kycLabel, kycTone, kycIcon) = switch (kyc) {
      KycStatus.approved => (l.kycVerified, VoltiBadgeTone.success, LucideIcons.shieldCheck),
      KycStatus.rejected => (l.kycRejectedShort, VoltiBadgeTone.danger, LucideIcons.shieldX),
      KycStatus.notStarted => (l.kycNotVerified, VoltiBadgeTone.neutral, LucideIcons.shield),
      _ => (l.kycPendingShort, VoltiBadgeTone.warning, LucideIcons.shieldEllipsis),
    };
    void open() => context.push('/account/verification');
    final c = customer;
    final contact = c == null ? null : contactLine(c);
    return Semantics(
      button: true,
      label: '${customer?.name ?? l.accountNoName}, $kycLabel${_adult ? ', ${l.adultBadge}' : ''}',
      onTap: open,
      excludeSemantics: true,
      child: InkWell(
        borderRadius: VoltiRadii.rMd,
        onTap: open,
        child: Row(children: [
          Container(
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: const BoxDecoration(color: VoltiColors.sun300, shape: BoxShape.circle),
            child: Text(
              initialsOf(customer?.name),
              style: const TextStyle(
                fontFamily: VoltiTypography.fontSans,
                fontWeight: VoltiTypography.fwBold,
                fontSize: 20,
                height: 1,
                color: VoltiColors.ink900,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(customer?.name ?? l.accountNoName, style: VoltiTypography.bodyStrong),
              if (contact != null)
                Text(contact, key: const Key('account-contact'), style: VoltiTypography.caption.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
              const SizedBox(height: 4),
              Wrap(spacing: 6, runSpacing: 4, children: [
                VoltiBadge(kycLabel, tone: kycTone, icon: kycIcon, size: VoltiBadgeSize.sm),
                if (_adult) VoltiBadge(l.adultBadge, tone: VoltiBadgeTone.neutral, size: VoltiBadgeSize.sm),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}
