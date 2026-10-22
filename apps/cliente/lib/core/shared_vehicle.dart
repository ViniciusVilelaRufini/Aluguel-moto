import 'package:flutter/widgets.dart';
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
        child: Hero(tag: vehicleHeroTag(code), child: child),
      );
}
