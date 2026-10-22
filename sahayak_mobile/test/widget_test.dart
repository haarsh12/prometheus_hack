import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:sahayak_mobile/main.dart';

void main() {
  setUp(() async {
    final tempDir = await Directory.systemTemp.createTemp('hive_test');
    Hive.init(tempDir.path);
  });

  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ShetiMitraApp());

    // Allow splash timer to complete
    await tester.pump(const Duration(seconds: 3));

    // Verify MaterialApp mounts
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
