import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import '../plan/plan_screen.dart' show walletProvider;

export '../onboarding/onboarding_screen.dart' show VerificationStatusScreen;

// ---------------------------------------------------------------------------
// Conta
// ---------------------------------------------------------------------------

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final s = ref.watch(sessionProvider).value;
    final c = s?.customer;
    return VoltiScaffold(
      title: l.accountTitle,
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: VoltiStagger.wrap([
          Text(c?.name ?? l.accountNoName, style: VoltiTypography.title),
          Text(c?.email ?? '', style: VoltiTypography.body),
          const SizedBox(height: VoltiSpacing.s16),
          ListRow(title: l.history, icon: LucideIcons.history, onTap: () => context.push('/account/history')),
          ListRow(title: l.wallet, icon: LucideIcons.wallet, onTap: () => context.push('/account/wallet')),
          ListRow(title: l.myPlan, icon: LucideIcons.calendarClock, onTap: () => context.push('/account/subscriptions')),
          ListRow(
              title: l.verificationTitle,
              icon: LucideIcons.shieldCheck,
              value: switch (s?.kyc) {
                KycStatus.approved => l.kycApprovedShort,
                KycStatus.rejected => l.kycRejectedShort,
                _ => l.kycPendingShort,
              },
              onTap: () => context.push('/account/verification')),
          ListRow(title: l.support, icon: LucideIcons.messageCircle, onTap: () => context.push('/account/support')),
          ListRow(title: l.helpCenter, icon: LucideIcons.lifeBuoy, onTap: () => context.push('/account/help')),
          ListRow(title: l.privacy, icon: LucideIcons.lock, onTap: () => context.push('/account/privacy')),
          const SizedBox(height: VoltiSpacing.s16),
          VoltiButton(
            label: l.signOut,
            icon: LucideIcons.logOut,
            variant: VoltiButtonVariant.secondary,
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

// ---------------------------------------------------------------------------
// Historico
// ---------------------------------------------------------------------------

final historyProvider = FutureProvider.autoDispose<List<Rental>>((ref) => ref.watch(backendProvider).rentals());

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    return VoltiScaffold(
      title: l.history,
      body: AsyncView<List<Rental>>(
        value: ref.watch(historyProvider),
        onRetry: () => ref.invalidate(historyProvider),
        data: (list) => list.isEmpty
            ? Center(child: Text(l.historyEmpty, style: VoltiTypography.body))
            : ListView(
                padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
                children: [
                  for (final r in list)
                    ListRow(
                      title: l.historyItem(r.vehicleCode, _date(r.startedAt)),
                      icon: LucideIcons.bike,
                      subtitle: clock(r.elapsedSeconds),
                      value: money(r.costCents),
                      onTap: () => VoltiBottomSheet.show<void>(
                        context,
                        builder: (ctx) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                          VoltiButton(
                              label: l.viewReceipt,
                              icon: LucideIcons.receipt,
                              fullWidth: true,
                              onPressed: () {
                                Navigator.of(ctx).pop();
                                context.push('/summary/${r.id}');
                              }),
                          const SizedBox(height: 8),
                          VoltiButton(
                              label: l.openClaim,
                              icon: LucideIcons.shieldAlert,
                              variant: VoltiButtonVariant.secondary,
                              fullWidth: true,
                              onPressed: () {
                                Navigator.of(ctx).pop();
                                context.push('/account/claim/${r.id}');
                              }),
                        ]),
                      ),
                    ),
                ],
              ),
      ),
    );
  }

  static String _date(DateTime d) => formatDateTimeSp(d);
}

// ---------------------------------------------------------------------------
// Carteira de creditos
// ---------------------------------------------------------------------------

final packagesProvider = FutureProvider.autoDispose<List<MinutePackage>>((ref) => ref.watch(backendProvider).minutePackages());

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    return VoltiScaffold(
      title: l.wallet,
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          AsyncView<Wallet>(
            value: ref.watch(walletProvider),
            onRetry: () => ref.invalidate(walletProvider),
            data: (w) => Container(
              padding: const EdgeInsets.all(VoltiSpacing.s16),
              decoration: BoxDecoration(color: VoltiColors.ink900, borderRadius: VoltiRadii.rLg),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(l.walletBalanceTitle, style: VoltiTypography.caption.copyWith(color: Colors.white70)),
                Text(money(w.balanceCents), style: VoltiTypography.title.copyWith(color: Colors.white)),
                Text(l.minutesBalance(w.minutesBalance), style: VoltiTypography.caption.copyWith(color: Colors.white70)),
              ]),
            ),
          ),
          SectionTitle(l.minutePackages),
          AsyncView<List<MinutePackage>>(
            value: ref.watch(packagesProvider),
            onRetry: () => ref.invalidate(packagesProvider),
            data: (list) => Column(children: [
              for (final p in list.where((p) => p.active))
                ListRow(
                  title: p.name,
                  icon: LucideIcons.clock,
                  subtitle: l.minutesBalance(p.minutes),
                  value: money(p.priceCents),
                  onTap: () async {
                    try {
                      final t = await ref.read(backendProvider).topUp(packageId: p.id);
                      if (!context.mounted) return;
                      await VoltiDialog.show<void>(
                        context,
                        title: l.pixTitle,
                        message: Text(t.pix?.copyPaste ?? l.pixWaiting),
                        actions: [
                          if (t.pix != null)
                            VoltiButton(
                                label: l.copyPixCode,
                                fullWidth: true,
                                onPressed: () async {
                                  await Clipboard.setData(ClipboardData(text: t.pix!.copyPaste));
                                  if (context.mounted) Navigator.of(context).pop();
                                }),
                          VoltiButton(
                              label: l.close, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop()),
                        ],
                      );
                      ref.invalidate(walletProvider);
                    } catch (e) {
                      if (context.mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
                    }
                  },
                ),
            ]),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Plano semanal e mensal
// ---------------------------------------------------------------------------

final subscriptionsProvider = FutureProvider.autoDispose<List<Subscription>>((ref) => ref.watch(backendProvider).subscriptions());

class SubscriptionsScreen extends ConsumerWidget {
  const SubscriptionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    Future<void> run(Future<void> Function() f) async {
      try {
        await f();
        ref.invalidate(subscriptionsProvider);
      } catch (e) {
        if (context.mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
      }
    }

    return VoltiScaffold(
      title: l.myPlan,
      body: AsyncView<List<Subscription>>(
        value: ref.watch(subscriptionsProvider),
        onRetry: () => ref.invalidate(subscriptionsProvider),
        data: (list) => ListView(
          padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
          children: [
            for (final s in list)
              ListRow(
                title: s.planCode == SubscriptionPlanCode.weekly ? l.planWeekly : l.planMonthly,
                icon: LucideIcons.calendarClock,
                subtitle: s.cancelAtPeriodEnd == true ? l.subscriptionEnding : l.subscriptionRenews(HistoryScreen._date(s.currentPeriodEnd)),
                value: money(s.priceCents),
                onTap: s.cancelAtPeriodEnd == true ? null : () => run(() => ref.read(backendProvider).cancelSubscription(s.id)),
              ),
            if (list.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text(l.tapToCancel, style: VoltiTypography.caption)),
            SectionTitle(l.subscribe),
            VoltiButton(
              label: l.planWeekly,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              onPressed: () => run(() => ref.read(backendProvider).subscribe(SubscriptionPlanCode.weekly)),
            ),
            const SizedBox(height: 8),
            VoltiButton(
              label: l.planMonthly,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              onPressed: () => run(() => ref.read(backendProvider).subscribe(SubscriptionPlanCode.monthly)),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Suporte (chat)
// ---------------------------------------------------------------------------

final conversationsProvider = FutureProvider.autoDispose<List<SupportConversation>>((ref) => ref.watch(backendProvider).conversations());

class SupportScreen extends ConsumerWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    return VoltiScaffold(
      title: l.support,
      bottom: VoltiButton(
        label: l.newConversation,
        icon: LucideIcons.plus,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        onPressed: () async {
          final subject = TextEditingController();
          final message = TextEditingController();
          final ok = await VoltiDialog.show<bool>(
            context,
            title: l.newConversation,
            message: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: subject, decoration: InputDecoration(labelText: l.subject)),
              const SizedBox(height: 8),
              TextField(controller: message, maxLines: 3, decoration: InputDecoration(labelText: l.message)),
            ]),
            actions: [
              VoltiButton(label: l.send, fullWidth: true, onPressed: () => Navigator.of(context).pop(true)),
              VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
            ],
          );
          final s = subject.text.trim(), m = message.text.trim();
          subject.dispose();
          message.dispose();
          if (ok != true || s.isEmpty || m.isEmpty) return;
          try {
            final c = await ref.read(backendProvider).openConversation(s, m);
            ref.invalidate(conversationsProvider);
            if (context.mounted) context.push('/account/support/${c.id}');
          } catch (e) {
            if (context.mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
          }
        },
      ),
      body: AsyncView<List<SupportConversation>>(
        value: ref.watch(conversationsProvider),
        onRetry: () => ref.invalidate(conversationsProvider),
        data: (list) => list.isEmpty
            ? Center(child: Text(l.supportEmpty, style: VoltiTypography.body))
            : ListView(padding: const EdgeInsets.all(VoltiSpacing.screenGutter), children: [
                for (final c in list)
                  ListRow(
                    title: c.subject,
                    icon: LucideIcons.messageCircle,
                    subtitle: c.unreadCount != null && c.unreadCount! > 0 ? l.unreadMessages(c.unreadCount!) : null,
                    onTap: () => context.push('/account/support/${c.id}'),
                  ),
              ]),
      ),
    );
  }
}

final messagesProvider =
    FutureProvider.autoDispose.family<List<SupportMessage>, String>((ref, id) => ref.watch(backendProvider).messages(id));

class SupportChatScreen extends ConsumerStatefulWidget {
  const SupportChatScreen({super.key, required this.conversationId});
  final String conversationId;
  @override
  ConsumerState<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends ConsumerState<SupportChatScreen> {
  final _ctrl = TextEditingController();
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _poll = Timer.periodic(const Duration(seconds: 6), (_) => ref.invalidate(messagesProvider(widget.conversationId)));
  }

  @override
  void dispose() {
    _poll?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    final l = context.l;
    try {
      await ref.read(backendProvider).sendMessage(widget.conversationId, text);
      _ctrl.clear();
      ref.invalidate(messagesProvider(widget.conversationId));
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return VoltiScaffold(
      title: l.support,
      bottom: Row(children: [
        Expanded(child: TextField(controller: _ctrl, decoration: InputDecoration(hintText: l.typeMessage), onSubmitted: (_) => _send())),
        const SizedBox(width: 8),
        VoltiIconButton(icon: LucideIcons.send, variant: VoltiButtonVariantBrandAlias.brand, label: l.send, onPressed: _send),
      ]),
      body: AsyncView<List<SupportMessage>>(
        value: ref.watch(messagesProvider(widget.conversationId)),
        onRetry: () => ref.invalidate(messagesProvider(widget.conversationId)),
        data: (list) => ListView(
          padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
          children: [
            for (final m in list)
              Align(
                alignment: m.authorType == MessageAuthorType.customer ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  constraints: const BoxConstraints(maxWidth: 300),
                  decoration: BoxDecoration(
                    color: m.authorType == MessageAuthorType.customer ? VoltiColors.brand : Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: VoltiRadii.rMd,
                  ),
                  child: Text(m.body,
                      style: VoltiTypography.body.copyWith(
                          color: m.authorType == MessageAuthorType.customer ? VoltiColors.onBrand : Theme.of(context).colorScheme.onSurface)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Alias local para a variante `brand` do botao de icone.
class VoltiButtonVariantBrandAlias {
  static const brand = VoltiIconButtonVariant.brand;
}

// ---------------------------------------------------------------------------
// Central de ajuda
// ---------------------------------------------------------------------------

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final items = [
      (l.helpRule1Title, l.helpRule1Text),
      (l.helpRule2Title, l.helpRule2Text),
      (l.helpRule3Title, l.helpRule3Text),
      (l.helpRule4Title, l.helpRule4Text),
      (l.helpRule5Title, l.helpRule5Text),
    ];
    return VoltiScaffold(
      title: l.helpCenter,
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          Text(l.helpIntro, style: VoltiTypography.body),
          const SizedBox(height: 12),
          for (final i in items)
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: Text(i.$1, style: VoltiTypography.bodyStrong),
              children: [Align(alignment: Alignment.centerLeft, child: Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(i.$2)))],
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Privacidade (LGPD)
// ---------------------------------------------------------------------------

class PrivacyScreen extends ConsumerStatefulWidget {
  const PrivacyScreen({super.key});
  @override
  ConsumerState<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends ConsumerState<PrivacyScreen> {
  bool _busy = false;

  Future<void> _guard(Future<void> Function() f) async {
    final l = context.l;
    setState(() => _busy = true);
    try {
      await f();
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final s = ref.watch(sessionProvider).value;
    final consents = s?.consents;
    return VoltiScaffold(
      title: l.privacy,
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          Text(l.privacyIntro, style: VoltiTypography.body),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l.consentLocationTitle),
            subtitle: Text(l.acceptLocationHint),
            value: s?.locationConsent ?? false,
            onChanged: _busy
                ? null
                : (v) => _guard(() => ref
                    .read(sessionProvider.notifier)
                    .saveConsents(terms: s?.termsAccepted ?? true, location: v, marketing: consents?.marketing ?? false)),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l.acceptMarketing),
            value: consents?.marketing ?? false,
            onChanged: _busy
                ? null
                : (v) => _guard(() =>
                    ref.read(sessionProvider.notifier).saveConsents(terms: s?.termsAccepted ?? true, location: s?.locationConsent ?? false, marketing: v)),
          ),
          const SizedBox(height: 12),
          VoltiButton(
            label: l.exportData,
            icon: LucideIcons.download,
            variant: VoltiButtonVariant.secondary,
            fullWidth: true,
            onPressed: _busy
                ? null
                : () => _guard(() async {
                      final data = await ref.read(backendProvider).exportData();
                      final json = jsonEncode(standardSerializers.serializeWith(LgpdExport.serializer, data));
                      await SharePlus.instance.share(ShareParams(text: json, subject: 'volti-meus-dados.json'));
                    }),
          ),
          const SizedBox(height: 8),
          VoltiButton(
            label: l.deleteAccount,
            icon: LucideIcons.trash2,
            variant: VoltiButtonVariant.danger,
            fullWidth: true,
            onPressed: _busy
                ? null
                : () async {
                    final ok = await VoltiDialog.show<bool>(
                      context,
                      title: l.deleteAccountTitle,
                      message: Text(l.deleteAccountText),
                      actions: [
                        VoltiButton(
                            label: l.deleteAccountConfirm,
                            variant: VoltiButtonVariant.danger,
                            fullWidth: true,
                            onPressed: () => Navigator.of(context).pop(true)),
                        VoltiButton(
                            label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
                      ],
                    );
                    if (ok != true) return;
                    await _guard(() async {
                      await ref.read(backendProvider).deleteAccount();
                      await ref.read(sessionProvider.notifier).signOut();
                      if (context.mounted) context.go('/welcome');
                    });
                  },
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sinistro
// ---------------------------------------------------------------------------

class ClaimScreen extends ConsumerStatefulWidget {
  const ClaimScreen({super.key, required this.rentalId});
  final String rentalId;
  @override
  ConsumerState<ClaimScreen> createState() => _ClaimScreenState();
}

class _ClaimScreenState extends ConsumerState<ClaimScreen> {
  ClaimType _type = ClaimType.accident;
  final _desc = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _desc.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l = context.l;
    setState(() => _busy = true);
    try {
      await ref.read(backendProvider).claim(widget.rentalId, _type, _desc.text.trim());
      if (mounted) {
        VoltiToast.show(context, l.claimSent);
        context.pop();
      }
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final types = {
      ClaimType.accident: l.claimAccident,
      ClaimType.theft: l.claimTheft,
      ClaimType.damage: l.claimDamage,
      ClaimType.personalInjury: l.claimInjury,
    };
    return VoltiScaffold(
      title: l.openClaim,
      bottom: VoltiButton(
        label: _busy ? l.sending : l.send,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        onPressed: (_desc.text.trim().length >= 5 && !_busy) ? _send : null,
      ),
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final e in types.entries)
              ChoiceChip(label: Text(e.value), selected: _type == e.key, onSelected: (_) => setState(() => _type = e.key)),
          ]),
          const SizedBox(height: 16),
          TextField(
            controller: _desc,
            maxLines: 5,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: l.claimDescription),
          ),
        ],
      ),
    );
  }
}
