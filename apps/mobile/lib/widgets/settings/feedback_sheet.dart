import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../services/feedback_service.dart';
import '../../utils/show_api_error.dart';
import '../common/henzo_modal.dart';
import '../common/sheet_action_button_style.dart';
import 'settings_form_tokens.dart';

const int _minMessageLength = 10;
const int _maxMessageLength = 1000;

Future<void> showFeedbackSheet(BuildContext context) {
  return showHenzoModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => const _FeedbackSheet(),
  );
}

class _FeedbackSheet extends StatefulWidget {
  const _FeedbackSheet();

  @override
  State<_FeedbackSheet> createState() => _FeedbackSheetState();
}

class _FeedbackSheetState extends State<_FeedbackSheet> {
  final _messageController = TextEditingController();
  final _focusNode = FocusNode();
  String? _validationError;
  bool _sending = false;

  @override
  void dispose() {
    _messageController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  String _displayName(UserModel? user) {
    final name = user?.name?.trim();
    if (name != null && name.length >= 2) return name;
    final email = user?.email.trim() ?? '';
    if (email.contains('@')) {
      final local = email.split('@').first.trim();
      if (local.length >= 2) return local;
    }
    return 'Henzo user';
  }

  String _buildMessageBody(String userText, UserModel? user) {
    final platform = Platform.isIOS ? 'iOS' : 'Android';
    final role = user?.role.trim();
    final lines = <String>[
      userText.trim(),
      '',
      '---',
      'Henzo mobile ($platform)',
      if (user != null) 'User id: ${user.id}',
      if (role != null && role.isNotEmpty) 'Role: $role',
    ];
    return lines.join('\n');
  }

  Future<void> _submit() async {
    final locale = context.read<LocaleProvider>();
    final t = locale.t;
    final text = _messageController.text.trim();

    if (text.length < _minMessageLength) {
      setState(
        () => _validationError = t('settings.feedback.messageTooShort'),
      );
      return;
    }

    final user = context.read<AuthService>().user;
    final email = user?.email.trim() ?? '';
    if (email.isEmpty) {
      setState(() => _validationError = t('settings.feedback.emailMissing'));
      return;
    }

    setState(() {
      _validationError = null;
      _sending = true;
    });

    try {
      await FeedbackService.sendFeedback(
        name: _displayName(user),
        email: email,
        message: _buildMessageBody(text, user),
        accessToken: context.read<AuthService>().accessToken,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('settings.feedback.sentSuccess'))),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      showApiError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final t = locale.t;

    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.only(top: 24),
        decoration: const BoxDecoration(
          color: AppColors.backgroundPrimary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            16,
            16,
            16 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                t('settings.feedback.sheetTitle'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                t('settings.feedback.sheetSubtitle'),
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _messageController,
                focusNode: _focusNode,
                maxLines: 5,
                minLines: 4,
                maxLength: _maxMessageLength,
                enabled: !_sending,
                textCapitalization: TextCapitalization.sentences,
                decoration: settingsInputDecoration(
                  hintText: t('settings.feedback.messageHint'),
                  maxLines: 5,
                ),
                onChanged: (_) {
                  if (_validationError != null) {
                    setState(() => _validationError = null);
                  }
                },
              ),
              if (_validationError != null) ...[
                const SizedBox(height: 8),
                SelectableText.rich(
                  TextSpan(
                    text: _validationError,
                    style: const TextStyle(
                      color: Colors.red,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton(
                  onPressed: _sending ? null : _submit,
                  style: sheetPrimaryButtonStyle(),
                  child: _sending
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(t('settings.feedback.send')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
