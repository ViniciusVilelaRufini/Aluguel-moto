import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/widgets.dart';

class _Faq extends StatelessWidget {
  const _Faq({required this.items});
  final List<(String, String)> items;

  @override
  Widget build(BuildContext context) => Column(children: [
        for (final i in items)
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text(i.$1, style: VoltiTypography.bodyStrong),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(i.$2, style: VoltiTypography.body)),
              ),
            ],
          ),
      ]);
}

// ---------------------------------------------------------------------------
// Central de ajuda
// ---------------------------------------------------------------------------

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return VoltiScaffold(
      title: l.helpCenter,
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          _Faq(items: [
            (l.helpFaq1Title, l.helpFaq1Text),
            (l.helpFaq2Title, l.helpFaq2Text),
            (l.helpFaq3Title, l.helpFaq3Text),
            (l.helpFaq4Title, l.helpFaq4Text),
            (l.helpFaq5Title, l.helpFaq5Text),
          ]),
          const SizedBox(height: VoltiSpacing.s16),
          ListRow(
            title: l.trafficRules,
            icon: LucideIcons.signpost,
            trailing: ListRowTrailing.chevron,
            onTap: () => context.push('/account/rules'),
          ),
          const SizedBox(height: VoltiSpacing.s8),
          ListRow(
            title: l.supportChat,
            subtitle: l.helpStillNeed,
            icon: LucideIcons.messageCircle,
            iconTone: ListRowTone.brand,
            trailing: ListRowTrailing.chevron,
            onTap: () => context.push('/account/support'),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Regras de transito para autopropelidos
// ---------------------------------------------------------------------------

class TrafficRulesScreen extends StatelessWidget {
  const TrafficRulesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return VoltiScaffold(
      title: l.trafficRulesTitle,
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          Text(l.helpIntro, style: VoltiTypography.body),
          const SizedBox(height: 12),
          _Faq(items: [
            (l.helpRule1Title, l.helpRule1Text),
            (l.helpRule2Title, l.helpRule2Text),
            (l.helpRule3Title, l.helpRule3Text),
            (l.helpRule4Title, l.helpRule4Text),
            (l.helpRule5Title, l.helpRule5Text),
          ]),
        ],
      ),
    );
  }
}
