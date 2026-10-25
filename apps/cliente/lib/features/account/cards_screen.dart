import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/services.dart';
import '../../core/widgets.dart';
import 'account_common.dart';

/// "Visa •••• 4242".
String cardLabel(PaymentCard c) =>
    '${c.brand.isEmpty ? '' : '${c.brand[0].toUpperCase()}${c.brand.substring(1)}'} •••• ${c.last4}'.trim();

/// Cartoes salvos (Task 30, varredura E2E item 12): o cliente ve qual e o padrao,
/// escolhe outro (`PUT /payments/cards/{id}/default`), remove (`DELETE`) e adiciona.
/// O padrao e o cartao usado quando a cobranca nao escolhe um (caucao, plano, recarga).
class CardsScreen extends ConsumerStatefulWidget {
  const CardsScreen({super.key});
  @override
  ConsumerState<CardsScreen> createState() => _CardsScreenState();
}

class _CardsScreenState extends ConsumerState<CardsScreen> {
  /// Cartao com acao em andamento (um por vez).
  String? _busyId;
  bool _adding = false;

  Future<void> _run(String id, Future<void> Function() action, String done) async {
    final l = context.l;
    setState(() => _busyId = id);
    try {
      await action();
      ref.invalidate(accountCardsProvider);
      if (mounted) VoltiToast.show(context, done, tone: VoltiToastTone.success);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _makeDefault(PaymentCard c) =>
      _run(c.id, () => ref.read(backendProvider).setDefaultCard(c.id), context.l.cardsDefaultChanged);

  Future<void> _remove(PaymentCard c) async {
    final l = context.l;
    final ok = await VoltiDialog.show<bool>(
      context,
      title: l.cardsRemoveTitle,
      message: Text(l.cardsRemoveText),
      actions: [
        VoltiButton(
          key: const Key('cards-remove-confirm'),
          label: l.cardsRemove,
          variant: VoltiButtonVariant.danger,
          fullWidth: true,
          onPressed: () => Navigator.of(context).pop(true),
        ),
        VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    if (ok != true || !mounted) return;
    await _run(c.id, () => ref.read(backendProvider).deleteCard(c.id), l.cardsRemoved);
  }

  Future<void> _add() async {
    final l = context.l;
    setState(() => _adding = true);
    try {
      final token = await ref.read(cardTokenizerProvider).tokenize(context);
      if (token == null) return;
      await ref.read(backendProvider).addCard(token);
      ref.invalidate(accountCardsProvider);
      VoltiHaptics.success();
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final cards = ref.watch(accountCardsProvider);
    final list = cards.value ?? const <PaymentCard>[];
    return VoltiScaffold(
      title: l.cardsTitle,
      bottom: VoltiButton(
        key: const Key('cards-add'),
        label: l.addCard,
        icon: LucideIcons.plus,
        variant: VoltiButtonVariant.secondary,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        loading: _adding,
        onPressed: _adding ? null : _add,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s8, VoltiSpacing.screenGutter, VoltiSpacing.s24),
        children: [
          Text(l.cardsDefaultHint, style: VoltiTypography.body.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: VoltiSpacing.s16),
          if (cards.isLoading && !cards.hasValue)
            VoltiSkeleton.list(rows: 2, label: l.loading)
          else if (cards.hasError && !cards.hasValue)
            NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: failureText(l, cards.error!))
          else if (list.isEmpty)
            NoticeBanner(key: const Key('cards-empty'), icon: LucideIcons.creditCard, message: l.cardsEmpty)
          else
            for (final c in list) ...[
              _CardTile(
                card: c,
                busy: _busyId == c.id,
                disabled: _busyId != null && _busyId != c.id,
                onMakeDefault: () => _makeDefault(c),
                onRemove: () => _remove(c),
              ),
              const SizedBox(height: VoltiSpacing.s12),
            ],
        ],
      ),
    );
  }
}

class _CardTile extends StatelessWidget {
  const _CardTile({required this.card, required this.busy, required this.disabled, required this.onMakeDefault, required this.onRemove});
  final PaymentCard card;
  final bool busy;
  final bool disabled;
  final VoidCallback onMakeDefault;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final label = cardLabel(card);
    final inactive = busy || disabled;
    return Container(
      key: Key('card-${card.id}'),
      padding: const EdgeInsets.all(VoltiSpacing.s14),
      decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rMd),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Icon(LucideIcons.creditCard, size: 22, color: scheme.onSurface),
          const SizedBox(width: VoltiSpacing.s10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: VoltiTypography.bodyStrong),
              Text(l.cardsExpiry(card.expMonth.toString().padLeft(2, '0'), card.expYear.toString()),
                  style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
            ]),
          ),
          if (card.isDefault) VoltiBadge(l.cardsDefaultBadge, key: Key('card-default-${card.id}'), size: VoltiBadgeSize.sm),
        ]),
        const SizedBox(height: VoltiSpacing.s12),
        Row(children: [
          if (!card.isDefault)
            Expanded(
              child: Semantics(
                label: l.cardsMakeDefaultSemantics(label),
                excludeSemantics: true,
                button: true,
                child: VoltiButton(
                  key: Key('card-make-default-${card.id}'),
                  label: l.cardsMakeDefault,
                  size: VoltiButtonSize.sm,
                  variant: VoltiButtonVariant.secondary,
                  fullWidth: true,
                  loading: busy,
                  onPressed: inactive ? null : onMakeDefault,
                ),
              ),
            ),
          if (!card.isDefault) const SizedBox(width: VoltiSpacing.s8),
          Expanded(
            child: Semantics(
              label: l.cardsRemoveSemantics(label),
              excludeSemantics: true,
              button: true,
              child: VoltiButton(
                key: Key('card-remove-${card.id}'),
                label: l.cardsRemove,
                size: VoltiButtonSize.sm,
                variant: VoltiButtonVariant.ghost,
                fullWidth: true,
                onPressed: inactive ? null : onRemove,
              ),
            ),
          ),
        ]),
      ]),
    );
  }
}
