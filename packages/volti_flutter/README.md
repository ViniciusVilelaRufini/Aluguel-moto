# volti_flutter

Tokens, tema, widgets e infraestrutura de API/autenticação compartilhados pelos apps Flutter do Volti (`apps/cliente`, `apps/operador`). Fonte visual: `design-system/` (tokens CSS traduzidos 1:1).

## Uso

```yaml
dependencies:
  volti_flutter:
    path: ../../packages/volti_flutter
```

```dart
import 'package:volti_flutter/volti_flutter.dart';

MaterialApp(theme: VoltiTheme.light(), darkTheme: VoltiTheme.dark(), ...);
```

`volti_flutter.dart` reexporta `VehicleStatus` do `volti_api`.

## Tokens

| Classe | Conteúdo |
|---|---|
| `VoltiColors` | escalas (`green500`, `ink900`, ...), semânticas (`brand`, `danger`, `surfaceCard`, ...), `statusFree..statusOffline`, `batteryHigh/Mid/Low`, `batteryColor(pct)`, `statusColor(VehicleStatus)`, `statusLabel(...)` |
| `VoltiSpacing` | `s0..s48`, `screenGutter`, `controlSm/Md/Lg`, `hitMin` |
| `VoltiRadii` | `xs..xl`, `pill` e `BorderRadius` prontos (`rLg`, `sheetTop`, ...) |
| `VoltiShadows` | `shadow1`, `shadow2`, `shadowSheet`, `shadowBrand`, `shadowCoral`, `glassBlur` |
| `VoltiMotion` | `durFast/Base/Slow/Screen/Spring`, `easeOut/Spring/InOut/Screen`, `pressScale`, `staggerDelay(i)`, `reduced(context)` / `scaled(context, d)` |
| `VoltiTypography` | `display`, `title`, `heading`, `bodyStrong`, `body`, `label`, `caption`, `overline`, `timer` (JetBrains Mono) |
| `VoltiTheme` | `light()` e `dark()` (Material 3; escuro usa superfícies ink e mantém o verde) |

Fontes TTF estáticas (Plus Jakarta Sans 400-800, JetBrains Mono 500/700, OFL) vão em `fonts/` e já estão declaradas no `pubspec.yaml` do pacote. As famílias são referenciadas como `packages/volti_flutter/Plus Jakarta Sans` e `packages/volti_flutter/JetBrains Mono` (`VoltiTypography.fontSans/fontMono`): **os apps não devem redeclarar as fontes** nem usar o nome sem prefixo.

## Widgets

`VoltiButton` (variantes `primary`, `secondary`, `ghost`, `dark`, `danger`; tamanhos `sm/md/lg`), `VoltiIconButton`, `BatteryPill(pct, {rangeKm})`, `VehicleMarker(status, batteryPct, {selected, onTap})`, `FleetStatusBadge(status, {count, pill, selected, onTap})`, `RouteInfoPill`, `ReservationBanner`, `SwipeAction`, `OptionCard`, `OtpInput`, `PhotoCapture`, `ListRow`, `ProgressSteps`, `VoltiBottomSheet.show`, `VoltiDialog.show`, `VoltiToast.show`.

### Motion (design v2)

`VoltiFadeUp`/`VoltiStagger` (cascata 45 ms, primeiro aos 140 ms; `VoltiStagger.wrap(lista)` para `ListView`), `VoltiEnter` (`.pop`, `.toast`), `VoltiPulse` (anel), `VoltiCheckPop`, `VoltiSuccessCheck`, `VoltiShine`, `VoltiRouteDraw` (+ `partial` para truncar polylines), `VoltiUserDot`, `VoltiChip`, `PassCard`, e transições de tela `VoltiPageTransitions.push` / `.modal` (formato `transitionsBuilder`, usável em `CustomTransitionPage` do go_router; `VoltiPageRoute` para Navigator puro). `VoltiIconButton` agora escala .88 ao toque (design v2; era .92). `VoltiButton` ganhou `loading` e `shine`; `VehicleMarker` ganhou `delay`. Com `MediaQuery.disableAnimationsOf` (reduced motion) tudo mostra o estado final já no primeiro frame. Animações infinitas (pulso, brilho) impedem `pumpAndSettle` em testes: use `pump(duration)` ou ligue `disableAnimations`.

Cores de bateria: > 50 verde, 21-50 amarelo, <= 20 coral. Ícones: `lucide_icons_flutter` (`LucideIcons.*`), recebidos como `IconData`.

## API e autenticação

```dart
final api = ref.watch(apiClientProvider);            // VoltiApi (volti_api)
final auth = ref.watch(authRepositoryProvider);      // DevAuthRepository | CognitoAuthRepository
await (auth as DevAuthRepository).signIn(sub: 'u1', email: 'a@b.com');
```

- `API_BASE_URL` via `--dart-define` (padrão `http://10.0.2.2:3000` no Android, `http://localhost:3000` nos demais). Sobrescreva em testes com `apiBaseUrlProvider`.
- `AUTH_MODE=dev|cognito` via `--dart-define` (padrão `dev`).
- Retry exponencial (3 tentativas, 300 ms e 600 ms): `connectionTimeout` em qualquer método; `connectionError`, 5xx e timeouts de envio/resposta só se (método idempotente: GET, HEAD, PUT, DELETE) OU (header `Idempotency-Key`) OU (`extra['retryable']=true`) -- qualquer uma basta --, para não duplicar `POST`. Corpos FormData/stream nunca são repetidos.
- Modo `dev` (sem refresh; ao expirar, chame `signIn` de novo): `POST /dev/token` com `sub`, `email`, `groups`, `pool` (`DevAuthPool`). Token só em memória.
- Modo `cognito`: interface pronta (`CognitoAuthRepository`), mas o login (Hosted UI/PKCE) lança `UnimplementedError` até a infraestrutura de autenticação existir; `accessToken()` devolve `null`.

## Testes

```
flutter pub get && flutter analyze && flutter test
```
