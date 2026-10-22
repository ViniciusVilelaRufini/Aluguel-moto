import 'package:flutter/foundation.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Modo de autenticacao efetivo. Um build de release nunca roda o modo `dev`
/// (token de `POST /dev/token` e codigo fixo 123456), mesmo sem `AUTH_MODE`
/// ou com `AUTH_MODE=dev`: vai para o Cognito, que sem configuracao so mostra o
/// aviso "Cognito nao configurado" nas telas de login.
AuthMode resolveAuthMode(AuthMode requested, {bool release = kReleaseMode}) => release ? AuthMode.cognito : requested;
