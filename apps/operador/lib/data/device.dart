import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

/// Captura de foto (camera). Abstrai o plugin para os testes.
abstract class PhotoPicker {
  /// Caminho do arquivo local ou `null` se cancelado.
  Future<String?> take();
}

class CameraPhotoPicker implements PhotoPicker {
  final _picker = ImagePicker();

  @override
  Future<String?> take() async {
    final f = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1600,
      imageQuality: 80,
    );
    return f?.path;
  }
}

final photoPickerProvider = Provider<PhotoPicker>((ref) => CameraPhotoPicker());
