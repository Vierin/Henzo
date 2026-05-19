import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../constants/colors.dart';
import '../../models/service_item.dart';
import '../../utils/color_hex.dart';

Widget _catalogTrainerIcon() {
  return Padding(
    padding: const EdgeInsets.only(top: 1),
    child: SvgPicture.asset(
      'assets/icons/icon-profile.svg',
      width: 11,
      height: 13,
      colorFilter: const ColorFilter.mode(
        Color(0xFF4D39A8),
        BlendMode.srcIn,
      ),
    ),
  );
}

/// Карточка типа тренировки — тот же layout, что [OwnerDailyScheduleSessionCard].
class OwnerTrainingCatalogCard extends StatelessWidget {
  const OwnerTrainingCatalogCard({
    super.key,
    required this.item,
    required this.durationLabel,
    required this.priceLabel,
    this.addressLabel = '',
    required this.trainerLabel,
    required this.onTap,
  });

  final ServiceItem item;
  final String durationLabel;
  final String priceLabel;
  final String addressLabel;
  final String trainerLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent =
        parseHexColor(item.displayColor) ?? AppColors.primary500;
    final address = addressLabel.trim();
    final trainer = trainerLabel.trim();

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        clipBehavior: Clip.hardEdge,
        decoration: BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.circular(14),
        ),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                width: 4,
                decoration: BoxDecoration(color: accent),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 0, 10),
                child: SizedBox(
                  width: 56,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      durationLabel,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        height: 1,
                        letterSpacing: -0.3,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ),
              Container(width: 1, color: accent),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.displayName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          height: 1,
                          letterSpacing: -0.3,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (address.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(top: 1),
                              child: SvgPicture.asset(
                                'assets/icons/icon-pin.svg',
                                width: 11,
                                height: 15,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                address,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.textPrimary,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (trainer.isNotEmpty) ...[
                        if (address.isEmpty) const SizedBox(height: 8),
                        Row(
                          children: [
                            _catalogTrainerIcon(),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(
                                trainer,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.textPrimary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(0, 14, 14, 14),
                child: Center(
                  child: Text(
                    priceLabel,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: accent,
                      height: 1.1,
                    ),
                    textAlign: TextAlign.right,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
