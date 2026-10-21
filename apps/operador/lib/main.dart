import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';
import 'package:path_provider/path_provider.dart';
import 'package:volti_operador/app.dart';
import 'package:volti_operador/data/offline_queue.dart';
import 'package:volti_operador/data/sync.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final dir = await getApplicationDocumentsDirectory();
  Hive.init(dir.path);
  final queue = await HiveOfflineQueue.open();
  runApp(ProviderScope(
    overrides: [offlineQueueProvider.overrideWithValue(queue)],
    child: const OperatorApp(),
  ));
}
