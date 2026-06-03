import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../constants/layout.dart';
import '../../l10n/locale_provider.dart';
import '../../screens/client_registration_screen.dart';
import '../../screens/login_screen.dart';
import '../../services/auth_service.dart';
import '../../services/trainer_api_service.dart';
import '../../utils/trainer_invite_pending.dart';

class TrainerInviteAcceptScreen extends StatefulWidget {
  const TrainerInviteAcceptScreen({super.key, required this.token});

  final String token;

  @override
  State<TrainerInviteAcceptScreen> createState() =>
      _TrainerInviteAcceptScreenState();
}

class _TrainerInviteAcceptScreenState
    extends State<TrainerInviteAcceptScreen> {
  Map<String, dynamic>? _info;
  bool _loading = true;
  bool _accepting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadInfo());
  }

  Future<void> _loadInfo() async {
    setState(() => _loading = true);
    try {
      final info = await TrainerApiService.getInviteInfo(widget.token);
      if (!mounted) return;
      setState(() {
        _info = info;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _accept() async {
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthService>();
    final token = auth.accessToken;
    if (token == null) {
      await _openSignIn();
      return;
    }
    setState(() => _accepting = true);
    try {
      await TrainerApiService.acceptInvite(token, widget.token);
      await TrainerInvitePending.clear();
      await auth.refreshSession();
      if (!mounted) return;
      Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (e) {
      if (!mounted) return;
      setState(() => _accepting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().contains('Conflict') ||
                    e.toString().contains('409')
                ? locale.t('trainer.acceptFailed')
                : e.toString(),
          ),
        ),
      );
    }
  }

  Future<void> _persistTokenAndNavigate(Widget screen) async {
    await TrainerInvitePending.store(widget.token);
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => screen),
    );
    if (!mounted) return;
    if (context.read<AuthService>().isTrainer) {
      Navigator.of(context).popUntil((r) => r.isFirst);
    }
  }

  Future<void> _openSignIn() => _persistTokenAndNavigate(const LoginScreen());

  Future<void> _openRegister() {
    final email = (_info?['trainerEmail'] ?? '').toString().trim();
    return _persistTokenAndNavigate(
      ClientRegistrationScreen(initialEmail: email.isEmpty ? null : email),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final auth = context.watch<AuthService>();
    final studioName = (_info?['studioName'] ?? '').toString();
    final trainerName = (_info?['trainerName'] ?? '').toString();
    final isLoggedIn = auth.isAuthenticated;

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: screenPaddingH(top: 24, bottom: 32),
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
              ? _ErrorView(error: _error!, onRetry: _loadInfo)
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Spacer(),
                    Center(
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: AppColors.primary100,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(
                          Icons.fitness_center_rounded,
                          color: AppColors.primary500,
                          size: 40,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      locale.t('trainer.inviteTitle'),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 26.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (studioName.isNotEmpty || trainerName.isNotEmpty)
                      Text(
                        studioName.isNotEmpty && trainerName.isNotEmpty
                            ? locale
                                .t('trainer.joinAs')
                                .replaceAll('{studio}', studioName)
                                .replaceAll('{name}', trainerName)
                            : studioName.isNotEmpty
                            ? locale
                                .t('trainer.joinAsTrainer')
                                .replaceAll('{studio}', studioName)
                            : locale.t('trainer.acceptInvitation'),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15.sp,
                          color: AppColors.textSecondary,
                          height: 1.4,
                        ),
                      ),
                    const Spacer(),
                    if (isLoggedIn)
                      FilledButton(
                        onPressed: _accepting ? null : _accept,
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary500,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: _accepting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                locale.t('trainer.acceptInvitation'),
                                style: TextStyle(
                                  fontSize: 16.sp,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      )
                    else ...[
                      FilledButton(
                        onPressed: _accepting ? null : _openRegister,
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary500,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          locale.t('trainer.createAccountToJoin'),
                          style: TextStyle(
                            fontSize: 16.sp,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton(
                        onPressed: _accepting ? null : _openSignIn,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          locale.t('trainer.signInToAccept'),
                          style: TextStyle(
                            fontSize: 16.sp,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      child: Text(
                        locale.t('common.cancel'),
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14.sp,
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

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.error, required this.onRetry});
  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.link_off_rounded,
              size: 48,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            Text(
              error.contains('not found') || error.contains('expired')
                  ? context
                      .read<LocaleProvider>()
                      .t('trainer.invalidExpiredLink')
                  : context
                      .read<LocaleProvider>()
                      .t('trainer.couldNotLoadInvite'),
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: onRetry,
              child: Text(context.read<LocaleProvider>().t('common.retry')),
            ),
          ],
        ),
      ),
    );
  }
}
