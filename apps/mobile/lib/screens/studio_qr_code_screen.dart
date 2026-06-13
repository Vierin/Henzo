import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../constants/colors.dart';
import '../constants/layout.dart';
import '../l10n/locale_provider.dart';
import '../models/studio.dart';
import '../services/auth_service.dart';
import '../services/cache/studio_cache.dart';
import '../utils/share_utils.dart';
import '../utils/studio_share_link.dart';

class StudioQrCodeScreen extends StatefulWidget {
  const StudioQrCodeScreen({super.key});

  @override
  State<StudioQrCodeScreen> createState() => _StudioQrCodeScreenState();
}

class _StudioQrCodeScreenState extends State<StudioQrCodeScreen> {
  Studio? _studio;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = context.read<AuthService>().accessToken;
    if (token == null) return;
    final studio = await context.read<StudioCache>().getStudio(token);
    if (!mounted) return;
    setState(() {
      _studio = studio;
      _loading = false;
    });
  }

  /// Deep link для QR — открывает приложение напрямую.
  String _studioDeepLink(Studio studio) =>
      'henzo://studio/${studio.id}';

  /// HTTPS ссылка для кнопки Share (работает и как Universal Link).
  String _studioShareUrl(Studio studio) => studioShareUrl(
        id: studio.id,
        studioName: studio.name,
      );

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          locale.t('settings.studioQrCode'),
          style: TextStyle(
            fontSize: 17.sp,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, color: AppColors.textPrimary, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _studio == null
          ? Center(child: Text(locale.t('common.loadFailed'), style: const TextStyle(color: AppColors.textSecondary)))
          : _QrContent(
          studio: _studio!,
          qrDeepLink: _studioDeepLink(_studio!),
          shareUrl: _studioShareUrl(_studio!),
          locale: locale,
        ),
    );
  }
}

class _QrContent extends StatelessWidget {
  const _QrContent({
    required this.studio,
    required this.qrDeepLink,
    required this.shareUrl,
    required this.locale,
  });

  final Studio studio;
  final String qrDeepLink;
  final String shareUrl;
  final LocaleProvider locale;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: EdgeInsets.all(kScreenPaddingHorizontal),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // QR card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Text(
                    studio.name ?? '',
                    style: TextStyle(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  QrImageView(
                    data: qrDeepLink,
                    version: QrVersions.auto,
                    size: 220,
                    eyeStyle: const QrEyeStyle(
                      eyeShape: QrEyeShape.square,
                      color: AppColors.textPrimary,
                    ),
                    dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    locale.t('settings.studioQrCodeSubtitle'),
                    style: TextStyle(
                      fontSize: 13.sp,
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // URL display
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.neutral100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      shareUrl,
                      style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy_outlined, size: 18),
                    color: AppColors.primary500,
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: shareUrl));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(locale.t('common.linkCopied'))),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Share button
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => Share.share(shareUrl, subject: studio.name ?? '', sharePositionOrigin: shareOrigin(context)),
                icon: const Icon(Icons.share_outlined, size: 18),
                label: Text(locale.t('common.share')),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
