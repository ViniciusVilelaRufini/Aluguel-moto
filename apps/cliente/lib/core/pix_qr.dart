import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:volti_api/volti_api.dart';

/// Menor PNG aceito como QR (o fake do gateway devolve 1x1 transparente).
const _minQrPx = 64;

/// Bytes do PNG do QR quando ele e uma imagem de verdade (>= 64 px); senao `null`.
Uint8List? usablePixPng(String? b64) {
  if (b64 == null || b64.trim().isEmpty) return null;
  try {
    final bytes = base64Decode(b64.contains(',') ? b64.split(',').last.trim() : b64.trim());
    // Assinatura PNG + IHDR: largura e altura em big-endian nos bytes 16..23.
    const sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    if (bytes.length < 24) return null;
    for (var i = 0; i < sig.length; i++) {
      if (bytes[i] != sig[i]) return null;
    }
    final d = ByteData.sublistView(bytes);
    final w = d.getUint32(16), h = d.getUint32(20);
    return w >= _minQrPx && h >= _minQrPx ? bytes : null;
  } catch (_) {
    return null;
  }
}

/// QR do Pix: o PNG do gateway quando ele serve; sem imagem (ou imagem
/// minuscula, como no fake), gera o QR a partir do "copia e cola", que e o
/// mesmo conteudo (em dev e como reserva em producao).
class PixQrCode extends StatelessWidget {
  const PixQrCode({super.key, required this.pix, required this.semanticLabel, this.size = 200});
  final PixCharge pix;
  final String semanticLabel;
  final double size;

  @override
  Widget build(BuildContext context) {
    final png = usablePixPng(pix.qrCodeBase64);
    final Widget qr = png != null
        ? Image.memory(png, width: size, height: size, errorBuilder: (_, _, _) => _fromText())
        : _fromText();
    return Semantics(image: true, label: semanticLabel, child: ExcludeSemantics(child: qr));
  }

  Widget _fromText() => pix.copyPaste.isEmpty
      ? SizedBox.square(dimension: size)
      : QrImageView(
          data: pix.copyPaste,
          size: size,
          padding: const EdgeInsets.all(8),
          backgroundColor: Colors.white, // tema: fixo (QR precisa de fundo branco para a leitura)
          errorCorrectionLevel: QrErrorCorrectLevel.M,
        );
}
