import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/flash.dart';
import '../../core/services.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../home/depot_providers.dart';
import '../home/providers.dart';

/// Nome do item do checklist de saida (codigos do app do operador).
String handoverItemLabel(AppLocalizations l, String code) => switch (code) {
      'freios' => l.handoverItemFreios,
      'luzes' => l.handoverItemLuzes,
      'pneus' => l.handoverItemPneus,
      'buzina' => l.handoverItemBuzina,
      'painel' => l.handoverItemPainel,
      'carenagem' => l.handoverItemCarenagem,
      _ => code,
    };

/// Texto do `lastError` gravado na entrega quando o aceite falha.
String handoverErrorText(AppLocalizations l, String code) => switch (code) {
      'payment-declined' => l.handoverPaymentDeclined,
      'deposit-not-held' => l.handoverDepositNotHeld,
      _ => l.handoverAcceptFailed,
    };

/// "Confira sua moto" (spec 2026-10-22 §3.7): o operador separou a moto e fez o
/// checklist de saida; o cliente ve fotos, checklist e bateria e escolhe
/// **Aceitar e destravar** (o aluguel comeca e a moto destrava; o plano e
/// acertado no fim, com a caucao de garantia) ou **Apontar problema** (suporte).
///
/// A Idempotency-Key do aceite nasce uma vez por entrega e fica no estado da
/// tela: toque duplo e novas tentativas mandam a mesma chave.
class HandoverScreen extends ConsumerStatefulWidget {
  const HandoverScreen({super.key, required this.handoverId});
  final String handoverId;
  @override
  ConsumerState<HandoverScreen> createState() => _HandoverScreenState();
}

class _HandoverScreenState extends ConsumerState<HandoverScreen> {
  late final String _acceptKey = newIdempotencyKey();
  Handover? _h;
  Object? _loadError;
  bool _accepting = false;

  /// Aceite confirmado: o botao mostra o check por [VoltiMotion.successHold].
  bool _accepted = false;

  /// Motivo da ultima tentativa que falhou nesta tela (o `lastError` da entrega
  /// cobre o que aconteceu fora dela).
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final h = await ref.read(backendProvider).handover(widget.handoverId);
      if (mounted) {
        setState(() {
          _h = h;
          _loadError = null;
        });
      }
    } catch (e) {
      final f = toFailure(e);
      if (f.status == 404) return _notMine();
      if (mounted) setState(() => _loadError = f);
    }
  }

  /// 404: a entrega nao e do cliente (ou nao existe). Volta ao inicio.
  void _notMine() {
    if (!mounted) return;
    ref.read(flashProvider.notifier).show(context.l.handoverNotFound, tone: VoltiToastTone.danger);
    context.go('/home');
  }

  void _back() {
    final router = GoRouter.of(context);
    if (router.canPop()) {
      router.pop();
    } else {
      context.go('/home');
    }
  }

  Future<void> _accept() async {
    if (_accepting) return;
    setState(() {
      _accepting = true;
      _error = null;
    });
    final l = context.l;
    try {
      await ref.read(backendProvider).acceptHandover(widget.handoverId, _acceptKey);
      VoltiHaptics.success();
      if (!mounted) return;
      // Estado global primeiro (a tela pode sair durante a espera abaixo).
      ref.read(createdReservationProvider.notifier).set(null);
      ref.invalidate(currentReservationProvider);
      ref.invalidate(currentRentalProvider);
      ref.invalidate(depotsProvider);
      // Micro-animacao de sucesso no proprio botao antes de abrir a corrida.
      setState(() => _accepted = true);
      await Future<void>.delayed(VoltiMotion.successHoldOf(context));
      if (mounted) context.go('/ride');
      return;
    } catch (e) {
      if (!mounted) return;
      final f = toFailure(e);
      if (f.status == 404) return _notMine();
      VoltiHaptics.warning();
      if (f.slug == 'handover-not-pending') {
        await _load();
      } else {
        if (mounted) {
          setState(() => _error = switch (f.slug) {
                'payment-declined' || 'deposit-not-held' => handoverErrorText(l, f.slug!),
                _ => f.message(l),
              });
        }
        // O servidor grava o motivo na entrega (o operador tambem ve).
        await _load();
      }
    } finally {
      if (mounted) setState(() => _accepting = false);
    }
  }

  Future<void> _report() async {
    final result = await VoltiBottomSheet.show<Object>(context, builder: (_) => HandoverDisputeSheet(handoverId: widget.handoverId));
    if (!mounted) return;
    if (identical(result, HandoverDisputeSheet.stale)) {
      // A entrega mudou (aceita, cancelada ou ja disputada): mostra o estado novo.
      await _load();
      return;
    }
    final updated = result is Handover ? result : null;
    if (updated != null) {
      ref.invalidate(currentReservationProvider);
      setState(() {
        _h = updated;
        _error = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    // Mudancas da entrega (aceite falhou no servidor, operador cancelou).
    ref.listen(customerEventsProvider, (_, next) {
      final e = next.value;
      if (e is HandoverUpdated && e.handoverId == widget.handoverId && !_accepting) _load();
    });
    final h = _h;
    final Widget body;
    if (h == null) {
      body = _loadError != null ? ErrorState(error: _loadError!, onRetry: _load) : const LoadingState();
    } else {
      body = switch (h.status) {
        HandoverStatus.pendingCustomer => _pending(context, h),
        HandoverStatus.disputed => _Outcome(
            key: const Key('handover-disputed'),
            icon: LucideIcons.messageCircle,
            title: l.handoverDisputedTitle,
            text: l.handoverDisputedText,
            detail: (h.disputeReason ?? '').trim().isEmpty ? null : l.handoverDisputedReason(h.disputeReason!.trim()),
            primary: VoltiButton(
              key: const Key('handover-support'),
              label: l.contactSupport,
              icon: LucideIcons.messageCircle,
              fullWidth: true,
              onPressed: () => context.push('/account/support'),
            ),
            secondary: VoltiButton(label: l.goHome, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => context.go('/home')),
          ),
        HandoverStatus.accepted => _Outcome(
            key: const Key('handover-accepted'),
            icon: LucideIcons.lockOpen,
            success: true,
            title: l.handoverAcceptedTitle,
            text: l.handoverAcceptedText,
            primary: VoltiButton(label: l.handoverGoToRide, icon: LucideIcons.bike, fullWidth: true, onPressed: () => context.go('/ride')),
          ),
        _ => _Outcome(
            key: const Key('handover-canceled'),
            icon: LucideIcons.packageX,
            title: l.handoverCanceledTitle,
            text: l.handoverCanceledText,
            primary: VoltiButton(label: l.goHome, icon: LucideIcons.house, fullWidth: true, onPressed: () => context.go('/home')),
          ),
      };
    }

    // Aceitando (rede ou check de sucesso): sem voltar no meio.
    return PopScope(
      canPop: !_accepting,
      child: Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, VoltiSpacing.s8),
              child: Row(children: [
                VoltiIconButton(
                  key: const Key('handover-back'),
                  icon: LucideIcons.arrowLeft,
                  size: VoltiSpacing.hitMin,
                  label: l.back,
                  onPressed: _accepting ? null : _back,
                ),
                const SizedBox(width: VoltiSpacing.s12),
                Expanded(child: Semantics(header: true, child: Text(l.handoverTitle, style: VoltiTypography.heading))),
              ]),
            ),
            Expanded(child: body),
          ],
        ),
      ),
      ),
    );
  }

  Widget _pending(BuildContext context, Handover h) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final code = h.vehicleCode ?? '';
    final operator = h.operatorFirstName?.trim() ?? '';
    final photos = h.photoUrls?.toList() ?? const <String>[];
    // Aceitando: o motivo antigo some ate a resposta nova.
    final error = _accepting ? null : _error ?? (h.lastError == null ? null : handoverErrorText(l, h.lastError!));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4, VoltiSpacing.screenGutter, VoltiSpacing.s16),
            children: VoltiStagger.wrap([
              Text(
                operator.isEmpty ? l.handoverIntroNoOperator(code) : l.handoverIntro(operator, code),
                style: VoltiTypography.body.copyWith(color: scheme.onSurfaceVariant),
              ),
              if (error != null) ...[
                const SizedBox(height: VoltiSpacing.s12),
                NoticeBanner(key: const Key('handover-error'), danger: true, icon: LucideIcons.circleAlert, message: error),
              ],
              const SizedBox(height: VoltiSpacing.s16),
              SectionTitle(l.handoverPhotos),
              if (photos.isEmpty)
                Text(l.handoverNoPhotos, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant))
              else
                SizedBox(
                  height: 132,
                  child: ListView.separated(
                    key: const Key('handover-photos'),
                    scrollDirection: Axis.horizontal,
                    itemCount: photos.length,
                    separatorBuilder: (_, _) => const SizedBox(width: VoltiSpacing.s8),
                    itemBuilder: (_, i) => VehicleThumb(
                      size: 132,
                      semanticLabel: l.handoverPhotoLabel(i + 1, photos.length),
                      image: Image.network(
                        photos[i],
                        width: 132,
                        height: 132,
                        fit: BoxFit.cover,
                        excludeFromSemantics: true,
                        errorBuilder: (_, _, _) => const Icon(LucideIcons.imageOff, color: VoltiColors.blue600),
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: VoltiSpacing.s16),
              Container(
                key: const Key('handover-battery'),
                padding: const EdgeInsets.all(VoltiSpacing.s16),
                decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                child: Row(children: [
                  const Icon(LucideIcons.batteryCharging, size: 22, color: VoltiColors.brandAction),
                  const SizedBox(width: VoltiSpacing.s12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(l.battery, style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
                      if ((h.batterySerial ?? '').isNotEmpty)
                        Text(l.handoverBatterySerial(h.batterySerial!), style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                    ]),
                  ),
                  const SizedBox(width: VoltiSpacing.s8),
                  FittedBox(fit: BoxFit.scaleDown, child: BatteryPill(h.batteryPct, light: true)),
                ]),
              ),
              VoltiListGroup(
                title: l.handoverChecklist,
                children: [for (final i in h.checklist) _ChecklistRow(item: i)],
              ),
              const SizedBox(height: VoltiSpacing.s16),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(LucideIcons.info, size: 18, color: VoltiColors.brandAction),
                const SizedBox(width: VoltiSpacing.s8),
                Expanded(child: Text(l.handoverStartsNow, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant))),
              ]),
            ]),
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, VoltiSpacing.s16),
          decoration: BoxDecoration(color: scheme.surface, boxShadow: VoltiShadows.shadowSheet),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            VoltiButton(
              key: const Key('handover-accept'),
              label: l.handoverAccept,
              icon: LucideIcons.lockOpen,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              loading: _accepting && !_accepted,
              success: _accepted,
              haptic: VoltiHapticKind.tap,
              onPressed: _accepting ? null : _accept,
            ),
            const SizedBox(height: VoltiSpacing.s8),
            VoltiButton(
              key: const Key('handover-report'),
              label: l.handoverReport,
              icon: LucideIcons.circleAlert,
              variant: VoltiButtonVariant.ghost,
              fullWidth: true,
              onPressed: _accepting ? null : _report,
            ),
          ]),
        ),
      ],
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  const _ChecklistRow({required this.item});
  final HandoverChecklistItem item;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final label = handoverItemLabel(l, item.code);
    final state = item.ok ? l.handoverItemOk : l.handoverItemProblem;
    final note = item.note?.trim() ?? '';
    // Um no por item: "Carenagem: Com problema" e a observacao do operador.
    return MergeSemantics(
      child: Semantics(
        label: l.handoverItemSemantics(label, state),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(color: item.ok ? VoltiColors.brandSoft : VoltiColors.dangerSoft, shape: BoxShape.circle),
              child: Icon(item.ok ? LucideIcons.check : LucideIcons.x, size: 16, color: item.ok ? VoltiColors.successInk : VoltiColors.dangerInk),
            ),
            const SizedBox(width: VoltiSpacing.s12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                ExcludeSemantics(child: Text(label, style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface))),
                if (note.isNotEmpty) Text(note, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
              ]),
            ),
            const SizedBox(width: VoltiSpacing.s8),
            ExcludeSemantics(
              child: Text(
                state,
                style: VoltiTypography.label.copyWith(color: item.ok ? VoltiColors.successInk : VoltiColors.dangerInkStrong),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

/// Resultado da entrega (problema apontado, aceita, cancelada).
class _Outcome extends StatelessWidget {
  const _Outcome({
    super.key,
    required this.icon,
    required this.title,
    required this.text,
    required this.primary,
    this.detail,
    this.secondary,
    this.success = false,
  });
  final IconData icon;
  final String title, text;
  final String? detail;
  final Widget primary;
  final Widget? secondary;
  final bool success;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: VoltiSpacing.s24),
          Center(
            child: VoltiEnter.pop(
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(color: success ? VoltiColors.brandSoft : VoltiColors.warningSoft, shape: BoxShape.circle),
                child: Icon(icon, size: 32, color: success ? VoltiColors.successInk : VoltiColors.warningInk),
              ),
            ),
          ),
          const SizedBox(height: VoltiSpacing.s16),
          Semantics(
            liveRegion: true,
            child: Text(title, textAlign: TextAlign.center, style: VoltiTypography.heading.copyWith(color: scheme.onSurface)),
          ),
          const SizedBox(height: VoltiSpacing.s8),
          Text(text, textAlign: TextAlign.center, style: VoltiTypography.body.copyWith(color: scheme.onSurface)),
          if (detail != null) ...[
            const SizedBox(height: VoltiSpacing.s8),
            Text(detail!, textAlign: TextAlign.center, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
          ],
          const SizedBox(height: VoltiSpacing.s24),
          primary,
          if (secondary != null) ...[const SizedBox(height: VoltiSpacing.s8), secondary!],
        ],
      ),
    );
  }
}

/// Folha "Apontar problema": motivo (3 a 500 caracteres) e envio. Devolve a
/// entrega ja `disputed`, ou [stale] quando ela deixou de estar pendente (422
/// `handover-not-pending`): a tela fecha a folha e recarrega.
class HandoverDisputeSheet extends ConsumerStatefulWidget {
  const HandoverDisputeSheet({super.key, required this.handoverId});
  final String handoverId;

  static const Object stale = #handoverStale;
  @override
  ConsumerState<HandoverDisputeSheet> createState() => _HandoverDisputeSheetState();
}

const kHandoverReasonMin = 3;
const kHandoverReasonMax = 500;

class _HandoverDisputeSheetState extends ConsumerState<HandoverDisputeSheet> {
  final _reason = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l = context.l;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final h = await ref.read(backendProvider).disputeHandover(widget.handoverId, _reason.text.trim());
      if (mounted) Navigator.of(context).pop(h);
    } catch (e) {
      final f = toFailure(e);
      if (f.slug == 'handover-not-pending') {
        if (mounted) Navigator.of(context).pop(HandoverDisputeSheet.stale);
        return;
      }
      if (mounted) setState(() => _error = f.message(l));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final ok = _reason.text.trim().length >= kHandoverReasonMin && !_busy;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Semantics(header: true, child: Text(l.handoverDisputeTitle, style: VoltiTypography.title)),
          const SizedBox(height: VoltiSpacing.s8),
          Text(l.handoverDisputeText, style: VoltiTypography.caption),
          const SizedBox(height: VoltiSpacing.s12),
          TextField(
            key: const Key('handover-dispute-reason'),
            controller: _reason,
            maxLines: 3,
            minLines: 1,
            maxLength: kHandoverReasonMax,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: l.handoverDisputeLabel, hintText: l.handoverDisputeHint),
          ),
          if (_error != null) NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _error!),
          const SizedBox(height: VoltiSpacing.s12),
          VoltiButton(
            key: const Key('handover-dispute-send'),
            label: l.handoverDisputeSend,
            icon: LucideIcons.send,
            fullWidth: true,
            loading: _busy,
            onPressed: ok ? _send : null,
          ),
          const SizedBox(height: VoltiSpacing.s8),
          VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop()),
        ]),
      ),
    );
  }
}
