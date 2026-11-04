import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/battery.dart';
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

/// "Sua moto está sendo preparada" (pre-reserva/balcao, 2026-11-04): o operador
/// separou a moto e fez a vistoria de saida; o cliente esta no balcao fazendo o
/// contrato e o pagamento. A tela mostra a vistoria so para leitura (fotos,
/// checklist e bateria), sem aceitar nem apontar problema: o atendente inicia o
/// aluguel no balcao (`POST /handovers/{id}/counter-checkout`). Quando a entrega
/// fica `accepted` (evento `handover.updated` ou `GET`) ou chega `rental.updated`
/// `active`, a corrida abre sozinha.
class HandoverScreen extends ConsumerStatefulWidget {
  const HandoverScreen({super.key, required this.handoverId});
  final String handoverId;
  @override
  ConsumerState<HandoverScreen> createState() => _HandoverScreenState();
}

class _HandoverScreenState extends ConsumerState<HandoverScreen> {
  Handover? _h;
  Object? _loadError;

  /// A corrida ja foi aberta por esta tela (evento e `GET` podem chegar juntos).
  bool _rideOpened = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final h = await ref.read(backendProvider).handover(widget.handoverId);
      if (!mounted) return;
      setState(() {
        _h = h;
        _loadError = null;
      });
      if (h.type == HandoverType.pickup && h.status == HandoverStatus.accepted) _openRide();
    } catch (e) {
      final f = toFailure(e);
      if (f.status == 404) return _notMine();
      if (mounted) setState(() => _loadError = f);
    }
  }

  /// O atendente iniciou o aluguel: atualiza o estado global e abre a corrida.
  void _openRide() {
    if (_rideOpened || !mounted) return;
    _rideOpened = true;
    VoltiHaptics.success();
    ref.read(createdReservationProvider.notifier).set(null);
    ref.invalidate(currentReservationProvider);
    ref.invalidate(currentRentalStateProvider);
    ref.invalidate(depotsProvider);
    context.go('/ride');
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

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    ref.listen(customerEventsProvider, (_, next) {
      final e = next.value;
      if (e is HandoverUpdated && e.handoverId == widget.handoverId) {
        // `accepted`: checkout feito no balcao (abre a corrida). Outras mudancas recarregam a tela.
        _load();
      } else if (e is RentalUpdated && e.status == 'active' && _h?.status == HandoverStatus.pendingCustomer) {
        _openRide();
      }
    });
    final h = _h;
    final Widget body;
    if (h == null) {
      body = _loadError != null ? ErrorState(error: _loadError!, onRetry: _load) : const LoadingState();
    } else {
      body = switch (h.status) {
        HandoverStatus.pendingCustomer => _preparing(context, h),
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
            primary: VoltiButton(label: l.handoverGoToRide, icon: LucideIcons.motorbike, fullWidth: true, onPressed: () => context.go('/ride')),
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

    return Scaffold(
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
                  onPressed: _back,
                ),
                const SizedBox(width: VoltiSpacing.s12),
                Expanded(child: Semantics(header: true, child: Text(l.handoverTitle, style: VoltiTypography.heading))),
              ]),
            ),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }

  /// Vistoria de saida so para leitura e o aviso de que o atendente inicia o aluguel.
  Widget _preparing(BuildContext context, Handover h) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final code = h.vehicleCode ?? '';
    final operator = h.operatorFirstName?.trim() ?? '';
    final photos = h.photoUrls?.toList() ?? const <String>[];
    return ListView(
      padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4, VoltiSpacing.screenGutter, VoltiSpacing.s24),
      children: VoltiStagger.wrap([
        Text(
          operator.isEmpty ? l.handoverIntroNoOperator(code) : l.handoverIntro(operator, code),
          style: VoltiTypography.body.copyWith(color: scheme.onSurfaceVariant),
        ),
        const SizedBox(height: VoltiSpacing.s12),
        NoticeBanner(key: const Key('handover-counter-note'), info: true, icon: LucideIcons.clipboardCheck, message: l.handoverCounterNote),
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
              // Toque abre a foto em tela cheia com zoom (conferir um dano).
              itemBuilder: (_, i) => VoltiPressable(
                key: Key('handover-photo-$i'),
                onTap: () => openHandoverPhoto(context, photos[i], l.handoverPhotoLabel(i + 1, photos.length)),
                child: VehicleThumb(
                  size: 132,
                  semanticLabel: l.handoverPhotoLabel(i + 1, photos.length),
                  image: Image.network(
                    photos[i],
                    width: 132,
                    height: 132,
                    fit: BoxFit.cover,
                    excludeFromSemantics: true,
                    errorBuilder: (_, _, _) => Icon(LucideIcons.imageOff, color: context.palette.onSurfaceMedia),
                  ),
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
            Icon(LucideIcons.batteryCharging, size: 22, color: context.palette.textBrand),
            const SizedBox(width: VoltiSpacing.s12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(l.battery, style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
                if ((h.batterySerial ?? '').isNotEmpty)
                  Text(l.handoverBatterySerial(h.batterySerial!), style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
              ]),
            ),
            const SizedBox(width: VoltiSpacing.s8),
            FittedBox(fit: BoxFit.scaleDown, child: BatteryPill(h.batteryPct, light: true, semanticsLabel: batteryPillSemantics(l, h.batteryPct))),
          ]),
        ),
        VoltiListGroup(
          title: l.handoverChecklist,
          children: [for (final i in h.checklist) _ChecklistRow(item: i)],
        ),
      ]),
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
              decoration: BoxDecoration(color: item.ok ? context.palette.brandSoft : context.palette.dangerSoft, shape: BoxShape.circle),
              child: Icon(item.ok ? LucideIcons.check : LucideIcons.x, size: 16, color: item.ok ? context.palette.successInk : context.palette.dangerInk),
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
                style: VoltiTypography.label.copyWith(color: item.ok ? context.palette.successInk : context.palette.dangerInkStrong),
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
                decoration: BoxDecoration(color: success ? context.palette.brandSoft : context.palette.warningSoft, shape: BoxShape.circle),
                child: Icon(icon, size: 32, color: success ? context.palette.successInk : context.palette.warningInk),
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

/// Foto da saida em tela cheia, com zoom por pinca ([InteractiveViewer]).
/// Abre a foto da saida em tela cheia (visivel para teste).
void openHandoverPhoto(BuildContext context, String url, String label) {
  Navigator.of(context).push(MaterialPageRoute<void>(
    fullscreenDialog: true,
    builder: (ctx) => Scaffold(
      key: const Key('handover-photo-viewer'),
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
        title: Text(label, style: VoltiTypography.label.copyWith(color: Colors.white)),
        actions: [
          IconButton(
            tooltip: ctx.l.close,
            icon: const Icon(LucideIcons.x),
            onPressed: () => Navigator.of(ctx).pop(),
          ),
        ],
      ),
      body: SafeArea(
        child: Semantics(
          label: label,
          image: true,
          child: InteractiveViewer(
            minScale: 1,
            maxScale: 5,
            child: Center(
              child: Image.network(
                url,
                fit: BoxFit.contain,
                excludeFromSemantics: true,
                errorBuilder: (_, _, _) => const Icon(LucideIcons.imageOff, color: Colors.white, size: 48),
              ),
            ),
          ),
        ),
      ),
    ),
  ));
}
