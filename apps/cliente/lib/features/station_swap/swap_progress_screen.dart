import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/clock.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/services.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../home/providers.dart';
import 'swap_logic.dart';

/// Com o tempo real fora do ar, o GET da troca a cada [kSwapPollWhileOffline].
const kSwapPollWhileOffline = Duration(seconds: 10);

/// Progresso da troca na estacao: abrindo a vaga → devolva na vaga N →
/// bateria recebida → pegue a carregada → "Bateria trocada". O status vem do
/// `station_swap.updated` (sala `customer:{id}`); o GET da troca completa os
/// detalhes (vaga, prazo, motivo) e cobre a reconexao. Cancelar so antes da
/// devolucao. Concluida, recarrega o aluguel (bateria e autonomia).
class SwapProgressScreen extends ConsumerStatefulWidget {
  const SwapProgressScreen({super.key, required this.stationId, required this.swapId, this.initial});
  final String stationId;
  final String swapId;

  /// Troca recem-criada ou retomada (mostra na hora, antes do GET).
  final StationSwap? initial;

  @override
  ConsumerState<SwapProgressScreen> createState() => _SwapProgressScreenState();
}

class _SwapProgressScreenState extends ConsumerState<SwapProgressScreen> {
  StationSwap? _swap;
  Object? _loadError;
  int? _fromStep;
  bool _canceling = false;
  bool _doneHandled = false;
  int? _donePct;
  bool _rtWasDown = false;
  Timer? _tick;
  Timer? _poll;
  ProviderSubscription<RealtimeService>? _rtSub;
  StreamSubscription<RealtimeEvent>? _events;
  StreamSubscription<bool>? _conn;

  @override
  void initState() {
    super.initState();
    _swap = widget.initial;
    _fetch();
    _startRealtime();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _swap != null && !isTerminalSwap(_swap!.status)) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    _poll?.cancel();
    _events?.cancel();
    _conn?.cancel();
    _rtSub?.close();
    super.dispose();
  }

  void _startRealtime() {
    try {
      _rtSub = ref.listenManual(customerRealtimeProvider, (_, _) {});
      final rt = _rtSub!.read();
      _events = rt.events.listen(_onEvent, onError: (Object _) {});
      _conn = rt.connected.listen(_onConnection, onError: (Object _) {});
    } catch (_) {
      // Sem tempo real: segue pelo GET periodico.
      _onConnection(false);
    }
  }

  void _onConnection(bool up) {
    if (!mounted) return;
    if (up) {
      _poll?.cancel();
      _poll = null;
      // Reconectou: o que mudou enquanto estava fora vem pelo GET.
      if (_rtWasDown) _fetch();
      _rtWasDown = false;
    } else {
      _rtWasDown = true;
      _poll ??= Timer.periodic(kSwapPollWhileOffline, (_) => _fetch());
    }
  }

  void _onEvent(RealtimeEvent e) {
    if (!mounted || e is! StationSwapUpdated || e.swapId != widget.swapId) return;
    final current = _swap;
    if (current != null) _set(applySwapEvent(current, swapId: e.swapId, status: swapStatusFromWire(e.status)));
    // Vaga, prazo e motivo da etapa nova.
    _fetch();
  }

  void _set(StationSwap next) {
    final before = _swap;
    if (before != null && before.status != next.status) _fromStep = swapStepIndex(before.status);
    setState(() {
      _swap = next;
      _loadError = null;
    });
    _afterChange(before?.status, next);
  }

  Future<void> _fetch() async {
    try {
      final fetched = await ref.read(backendProvider).stationSwap(widget.stationId, widget.swapId);
      if (!mounted) return;
      final current = _swap;
      _set(current == null ? fetched : mergeSwapFetch(current, fetched));
    } catch (e) {
      if (mounted && _swap == null) setState(() => _loadError = e);
    }
  }

  void _afterChange(StationSwapStatus? before, StationSwap now) {
    final changed = before != now.status;
    // A home e a corrida deixam de oferecer "Continuar troca".
    if (changed && isTerminalSwap(now.status)) ref.invalidate(currentRentalStateProvider);
    if (now.status == StationSwapStatus.completed) {
      _poll?.cancel();
      _poll = null;
      if (!_doneHandled) {
        _doneHandled = true;
        VoltiHaptics.success();
        _loadBattery();
      }
      return;
    }
    if (!changed || before == null) return;
    if (now.status == StationSwapStatus.canceled || now.status == StationSwapStatus.failed) {
      VoltiHaptics.warning();
    } else {
      VoltiHaptics.selection();
    }
  }

  /// Carga da bateria instalada (o aluguel recarregado traz a moto nova).
  Future<void> _loadBattery() async {
    try {
      final state = await ref.read(backendProvider).currentRentalState();
      final code = state.rental?.vehicleCode;
      if (code == null) return;
      final v = await ref.read(backendProvider).vehicleByCode(code);
      if (mounted) setState(() => _donePct = v.batteryPct);
    } catch (_) {
      // Fica o 100% da bateria carregada.
    }
  }

  Future<void> _cancel() async {
    final l = context.l;
    final ok = await VoltiDialog.show<bool>(
      context,
      title: l.swapCancelConfirmTitle,
      icon: const Icon(LucideIcons.circleX, size: 32, color: VoltiColors.danger),
      message: Text(l.swapCancelConfirmText),
      actions: [
        VoltiButton(
          key: const Key('swap-cancel-confirm'),
          label: l.swapCancel,
          variant: VoltiButtonVariant.danger,
          fullWidth: true,
          onPressed: () => Navigator.of(context).pop(true),
        ),
        VoltiButton(label: l.swapCancelKeep, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    if (ok != true || !mounted) return;
    setState(() => _canceling = true);
    try {
      final s = await ref.read(backendProvider).cancelStationSwap(widget.stationId, widget.swapId);
      if (mounted) _set(s);
    } catch (e) {
      if (!mounted) return;
      VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
      // `swap-not-cancelable`: a bateria ja foi devolvida; mostra o passo real.
      _fetch();
    } finally {
      if (mounted) setState(() => _canceling = false);
    }
  }

  void _close() {
    ref.invalidate(currentRentalStateProvider);
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/ride');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final swap = _swap;
    return PopScope(
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) ref.invalidate(currentRentalStateProvider);
      },
      child: VoltiScaffold(
        title: l.swapProgressTitle,
        body: swap == null
            ? (_loadError != null ? ErrorState(error: _loadError!, onRetry: _fetch) : const LoadingState())
            : _body(context, l, swap),
      ),
    );
  }

  Widget _body(BuildContext context, AppLocalizations l, StationSwap swap) {
    final scheme = Theme.of(context).colorScheme;
    final status = swap.status;
    final ended = status == StationSwapStatus.canceled || status == StationSwapStatus.failed;
    final done = status == StationSwapStatus.completed;
    final step = swapStepIndex(status);
    final left = swapTimeLeft(swap.expiresAt, ref.watch(clockProvider)());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!ended)
            ProgressSteps(
              key: const Key('swap-steps'),
              total: swapSteps.length,
              current: step,
              animateFrom: _fromStep,
              label: l.swapStepSemantics(step + 1, swapSteps.length),
            ),
          const SizedBox(height: VoltiSpacing.s24),
          AnimatedSwitcher(
            duration: VoltiMotion.scaled(context, VoltiMotion.durScreen),
            switchInCurve: VoltiMotion.easeScreen,
            switchOutCurve: VoltiMotion.easeScreen.flipped,
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SlideTransition(position: Tween(begin: const Offset(.08, 0), end: Offset.zero).animate(anim), child: child),
            ),
            child: KeyedSubtree(
              key: ValueKey('swap-step-${status.name}'),
              child: _StepView(swap: swap, donePct: _donePct),
            ),
          ),
          if (!isTerminalSwap(status)) ...[
            const SizedBox(height: VoltiSpacing.s16),
            Center(
              child: Semantics(
                label: l.swapCountdownSemantics(clock(left.inSeconds)),
                excludeSemantics: true,
                child: Container(
                  key: const Key('swap-countdown'),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(color: scheme.surfaceContainerHighest, borderRadius: VoltiRadii.rPill),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.hourglass, size: 14, color: scheme.onSurfaceVariant),
                      const SizedBox(width: 6),
                      Text(
                        left == Duration.zero ? l.swapTimeUp : l.swapTimeLeft(clock(left.inSeconds)),
                        style: VoltiTypography.label.copyWith(color: scheme.onSurface),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
          if (swap.feeCents > 0 && !ended) ...[
            const SizedBox(height: VoltiSpacing.s16),
            Text(
              l.swapFeeNote(money(swap.feeCents)),
              key: const Key('swap-fee'),
              textAlign: TextAlign.center,
              style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
          if (ended && swapLateReturnAccepted(swap)) ...[
            const SizedBox(height: VoltiSpacing.s16),
            KeyedSubtree(
              key: const Key('swap-late-return'),
              child: NoticeBanner(icon: LucideIcons.info, message: l.swapLateReturnNote),
            ),
          ],
          const SizedBox(height: VoltiSpacing.s24),
          if (canCancelSwap(status))
            VoltiButton(
              key: const Key('swap-cancel'),
              label: l.swapCancel,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              loading: _canceling,
              onPressed: _canceling ? null : _cancel,
            ),
          if (ended && swapNeedsSupport(swap)) ...[
            VoltiButton(
              key: const Key('swap-support'),
              label: l.contactSupport,
              icon: LucideIcons.lifeBuoy,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              onPressed: () => context.push('/account/support'),
            ),
            const SizedBox(height: VoltiSpacing.s8),
          ],
          if (done || ended)
            VoltiButton(
              key: const Key('swap-close'),
              label: l.swapBackToRide,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              onPressed: _close,
            ),
        ],
      ),
    );
  }
}

/// Icone, titulo e instrucao do passo atual.
class _StepView extends StatelessWidget {
  const _StepView({required this.swap, required this.donePct});
  final StationSwap swap;
  final int? donePct;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final (Widget art, String title, String text) = switch (swap.status) {
      StationSwapStatus.openingSlot => (
          const _Art(icon: LucideIcons.packageOpen, bg: VoltiColors.infoSoft, fg: VoltiColors.infoInk),
          l.swapStepOpening,
          l.swapStepOpeningText,
        ),
      StationSwapStatus.awaitingReturn => (
          _SlotArt(slot: swap.slotNumber),
          swap.slotNumber != null ? l.swapStepAwaiting(swap.slotNumber!) : l.swapStepAwaitingNoSlot,
          l.swapStepAwaitingText,
        ),
      StationSwapStatus.returned => (
          const _Art(icon: LucideIcons.circleCheck, bg: VoltiColors.successSoft, fg: VoltiColors.successInk),
          l.swapStepReturned,
          l.swapStepReturnedText,
        ),
      StationSwapStatus.releasing => (
          const _Art(icon: LucideIcons.batteryCharging, bg: VoltiColors.successSoft, fg: VoltiColors.successInk),
          l.swapStepReleasing,
          l.swapStepReleasingText,
        ),
      StationSwapStatus.completed => (
          const VoltiSuccessCheck(size: 72),
          l.swapDoneTitle(donePct ?? 100),
          l.swapDoneText,
        ),
      StationSwapStatus.canceled || StationSwapStatus.failed => (
          const _Art(icon: LucideIcons.triangleAlert, bg: VoltiColors.warningSoft, fg: VoltiColors.warningInk),
          swapEndTitle(l, swap),
          swapEndMessage(l, swap),
        ),
      _ => (
          const _Art(icon: LucideIcons.batteryCharging, bg: VoltiColors.infoSoft, fg: VoltiColors.infoInk),
          l.swapProgressTitle,
          l.swapEndGeneric,
        ),
    };
    return Column(
      children: [
        art,
        const SizedBox(height: VoltiSpacing.s16),
        Semantics(
          header: true,
          liveRegion: true,
          child: Text(title, key: const Key('swap-step-title'), textAlign: TextAlign.center, style: VoltiTypography.title.copyWith(color: scheme.onSurface)),
        ),
        const SizedBox(height: VoltiSpacing.s8),
        Text(text, key: const Key('swap-step-text'), textAlign: TextAlign.center, style: VoltiTypography.body.copyWith(color: scheme.onSurfaceVariant)),
      ],
    );
  }
}

class _Art extends StatelessWidget {
  const _Art({required this.icon, required this.bg, required this.fg});
  final IconData icon;
  final Color bg, fg;

  @override
  Widget build(BuildContext context) => Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
        child: Icon(icon, color: fg, size: 32),
      );
}

/// Numero da vaga em destaque ("devolva na vaga N").
class _SlotArt extends StatelessWidget {
  const _SlotArt({required this.slot});
  final int? slot;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: Container(
          key: const Key('swap-slot'),
          width: 88,
          height: 88,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: VoltiColors.brandSoft, borderRadius: VoltiRadii.rLg, border: Border.all(color: VoltiColors.brand, width: 2)),
          child: slot == null
              ? const Icon(LucideIcons.packageOpen, color: VoltiColors.brandAction, size: 32)
              : Text('$slot', style: VoltiTypography.display.copyWith(color: VoltiColors.brandAction)),
        ),
      );
}
