import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../common/henzo_modal.dart';

const double _kTimeWheelHeight = 216;

Future<TimeOfDay?> showTrainingTimePickerSheet(
  BuildContext context,
  TimeOfDay initialTime,
) {
  var selected = initialTime;
  final initialDateTime = DateTime(
    2000,
    1,
    1,
    initialTime.hour,
    initialTime.minute,
  );
  return showHenzoModalBottomSheet<TimeOfDay>(
    context: context,
    showDragHandle: false,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) {
      final t = sheetCtx.read<LocaleProvider>().t;
      final bottomInset = MediaQuery.paddingOf(sheetCtx).bottom;
      return Container(
        decoration: const BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: EdgeInsets.fromLTRB(8, 4, 8, 8 + bottomInset),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                TextButton(
                  onPressed: () => Navigator.of(sheetCtx).pop(),
                  child: Text(t('common.cancel')),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () => Navigator.of(sheetCtx).pop(selected),
                  child: Text(
                    t('common.done'),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            SizedBox(
              height: _kTimeWheelHeight,
              child: CupertinoDatePicker(
                mode: CupertinoDatePickerMode.time,
                use24hFormat: true,
                minuteInterval: 5,
                initialDateTime: initialDateTime,
                onDateTimeChanged: (value) {
                  selected = TimeOfDay(
                    hour: value.hour,
                    minute: value.minute,
                  );
                },
              ),
            ),
          ],
        ),
      );
    },
  );
}

String trainingTimeToHm(TimeOfDay t) {
  final hh = t.hour.toString().padLeft(2, '0');
  final mm = t.minute.toString().padLeft(2, '0');
  return '$hh:$mm';
}
