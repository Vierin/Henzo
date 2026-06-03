import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  setUpAll(() async {
    await dotenv.load(fileName: 'assets/.env.local.example');
  });

  testWidgets('App builds without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp(notificationsStore: null));
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
