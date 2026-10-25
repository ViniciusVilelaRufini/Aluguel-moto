import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/fleet.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Situacao da revisao por km/horas: badge (Em dia/Próxima/Vencida), km desde
/// a revisao com o que falta (ou o excesso) e horas de uso.
class ServiceIndicator extends StatelessWidget {
  const ServiceIndicator({super.key, required this.service, this.scheduledFor});

  final VehicleServiceInfo service;

  /// Data da manutencao preventiva em aberto, se houver.
  final DateTime? scheduledFor;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final label = serviceStatusLabel(t, service.status);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        VoltiBadge(
          label,
          key: const Key('service-status'),
          icon: LucideIcons.wrench,
          tone: serviceStatusTone(service.status),
          size: VoltiBadgeSize.sm,
          semanticLabel: t.serviceStatusSemantics(label),
        ),
        const SizedBox(height: VoltiSpacing.s6),
        Text(serviceKmLine(t, service), style: VoltiTypography.body),
        Text(serviceHoursLine(t, service),
            style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
        if (scheduledFor != null)
          Padding(
            padding: const EdgeInsets.only(top: VoltiSpacing.s4),
            child: Text(t.serviceScheduled(formatDayTime(scheduledFor!)),
                style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
          ),
      ],
    );
  }
}

/// Foto do modelo (64 px); sem foto ou com erro de rede, um icone.
class ModelPhoto extends StatelessWidget {
  const ModelPhoto({super.key, required this.name, this.url, this.size = 64});

  final String name;
  final String? url;
  final double size;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    const placeholder = Center(child: Icon(LucideIcons.motorbike, color: VoltiColors.ink500, size: 28));
    return Semantics(
      image: true,
      label: t.modelPhotoSemantics(name),
      child: ClipRRect(
        borderRadius: VoltiRadii.rMd,
        child: Container(
          width: size,
          height: size,
          color: VoltiColors.surfaceSunken,
          child: url == null || url!.isEmpty
              ? placeholder
              : Image.network(
                  url!,
                  fit: BoxFit.cover,
                  excludeFromSemantics: true,
                  errorBuilder: (_, _, _) => placeholder,
                ),
        ),
      ),
    );
  }
}

/// Cartao "Moto" do detalhe: modelo (foto, nome, categoria e preco por minuto)
/// e a revisao por km/horas. Le a ficha da moto e o catalogo; sem rede some.
class VehicleInfoCard extends ConsumerWidget {
  const VehicleInfoCard({super.key, required this.vehicleId});

  final String vehicleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final vehicle = ref.watch(vehicleProvider(vehicleId)).value;
    if (vehicle == null) return const SizedBox.shrink();
    final models = ref.watch(vehicleModelsProvider).value ?? const {};
    final model = vehicle.vehicleModelId == null ? null : models[vehicle.vehicleModelId];
    final name = model?.name ?? vehicle.model;
    final category = model?.categoryLabel ?? vehicle.categoryLabel;
    final price = vehicle.pricePerMinuteCents ?? model?.pricePerMinuteCents;
    final caption = [
      ?category,
      if (price != null) formatCentsPerMinute(price),
    ].join(' · ');
    final service = vehicle.service;
    return SectionCard(
      key: const Key('vehicle-card'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t.vehicleCardTitle, style: VoltiTypography.label),
          const SizedBox(height: VoltiSpacing.s10),
          Row(
            children: [
              ModelPhoto(key: const Key('model-photo'), name: name, url: model?.photoUrl),
              const SizedBox(width: VoltiSpacing.s12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: VoltiTypography.body.copyWith(fontWeight: FontWeight.w600)),
                    if (caption.isNotEmpty)
                      Text(caption,
                          style: VoltiTypography.caption
                              .copyWith(color: VoltiColors.textSecondary)),
                  ],
                ),
              ),
            ],
          ),
          if (service != null) ...[
            const SizedBox(height: VoltiSpacing.s12),
            ServiceIndicator(service: service),
          ],
        ],
      ),
    );
  }
}

/// Cartao "Manutencao" das tarefas ligadas a uma manutencao: titulo, tipo,
/// origem (cliente so pelo primeiro nome), data agendada e descricao.
class MaintenanceInfoCard extends ConsumerWidget {
  const MaintenanceInfoCard({super.key, required this.maintenanceTaskId});

  final String maintenanceTaskId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final m = ref.watch(maintenanceTaskProvider(maintenanceTaskId)).value;
    if (m == null) return const SizedBox.shrink();
    final kind = switch (m.kind) {
      MaintenanceKind.corrective => t.maintenanceKindCorrective,
      _ => t.maintenanceKindPreventive,
    };
    final customer = firstName(m.customerName);
    final source = switch (m.source_) {
      MaintenanceSource.customer => customer == null
          ? t.maintenanceSourceCustomerNoName
          : t.maintenanceSourceCustomer(customer),
      MaintenanceSource.system => t.maintenanceSourceSystem,
      MaintenanceSource.staff => t.maintenanceSourceStaff,
      _ => null,
    };
    final secondary = VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary);
    return SectionCard(
      key: const Key('maintenance-card'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t.maintenanceCardTitle, style: VoltiTypography.label),
          const SizedBox(height: VoltiSpacing.s6),
          Text(m.title, style: VoltiTypography.body.copyWith(fontWeight: FontWeight.w600)),
          Text(kind, style: secondary),
          if (source != null) Text(source, style: secondary),
          if (m.scheduledFor != null)
            Text(t.maintenanceScheduledFor(formatDayTime(m.scheduledFor!)), style: secondary),
          if (m.description != null && m.description!.trim().isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: VoltiSpacing.s6),
              child: Text(m.description!, style: VoltiTypography.body),
            ),
        ],
      ),
    );
  }
}
