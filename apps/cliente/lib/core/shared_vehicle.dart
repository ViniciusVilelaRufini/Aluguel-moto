import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Tag do elemento compartilhado da moto (evolucao E-15, modelo galpao): a
/// midia do cartao em "Escolher moto" voa para o avatar do cabecalho do plano,
/// e o avatar segue no cabecalho do seguro e da retirada. Codigo da moto =
/// unico na frota.
Object vehicleHeroTag(String code) => 'vehicle-media-$code';

/// Hero da moto que respeita reduced motion e leitor de tela (sem voo: a tela
/// troca direto, como a transicao da rota).
class VehicleHero extends StatelessWidget {
  const VehicleHero({super.key, required this.code, required this.child});
  final String code;
  final Widget child;

  @override
  Widget build(BuildContext context) => HeroMode(
        enabled: !VoltiPageTransitions.reducedOf(context),
        // Curva do design no voo (o mesmo `--ease-screen` da troca de tela).
        child: Hero(tag: vehicleHeroTag(code), createRectTween: voltiHeroRectTween, child: child),
      );
}

/// `createRectTween` dos heroes da moto.
RectTween voltiHeroRectTween(Rect? begin, Rect? end) => VoltiHeroRectTween(begin: begin, end: end);

/// Foto do modelo para o [VehicleThumb] (a mesma no cartao da lista e no
/// cabecalho do fluxo, entao o Hero voa foto -> foto); sem URL, `null` (icone).
Widget? vehiclePhoto(String? url, {double iconSize = 32}) => url == null || url.isEmpty
    ? null
    : Image.network(url, fit: BoxFit.contain, errorBuilder: (_, _, _) => Icon(LucideIcons.motorbike, size: iconSize, color: VoltiColors.blue600));
