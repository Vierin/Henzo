import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../services/api_client.dart';
import '../../l10n/locale_provider.dart';
import '../../services/auth_service.dart';
import '../../utils/load_error_message.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

const _maxCommentLength = 500;

/// Extra space above the keyboard so the submit button stays visible.
const double _keyboardBottomExtra = 10;

/// Bottom sheet: star rating + optional comment for a studio visit.
Future<bool?> showClientLeaveReviewSheet(
  BuildContext context, {
  required String studioId,
  required String studioName,
  String? enrollmentId,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: false,
    backgroundColor: AppColors.backgroundPrimary,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _ClientLeaveReviewSheetBody(
      studioId: studioId,
      enrollmentId: enrollmentId,
    ),
  );
}

class _ClientLeaveReviewSheetBody extends StatefulWidget {
  const _ClientLeaveReviewSheetBody({
    required this.studioId,
    this.enrollmentId,
  });

  final String studioId;
  final String? enrollmentId;

  @override
  State<_ClientLeaveReviewSheetBody> createState() =>
      _ClientLeaveReviewSheetBodyState();
}

class _ClientLeaveReviewSheetBodyState extends State<_ClientLeaveReviewSheetBody> {
  int _rating = 0;
  final _commentController = TextEditingController();
  bool _submitting = false;
  String? _error;

  static final _titleStyle = TextStyle(
    fontSize: 17.sp,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: -0.2,
  );

  static final _badgeStyle = TextStyle(
    fontSize: 13.sp,
    fontWeight: FontWeight.w500,
    color: AppColors.textTertiary,
  );

  @override
  void initState() {
    super.initState();
    _commentController.addListener(_onCommentChanged);
  }

  void _onCommentChanged() => setState(() {});

  @override
  void dispose() {
    _commentController.removeListener(_onCommentChanged);
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating < 1) {
      setState(() => _error = 'Please select a rating');
      return;
    }
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ApiClient.post(
        '/studios/${widget.studioId}/reviews',
        token,
        body: {
          'rating': _rating,
          if (_commentController.text.trim().isNotEmpty)
            'comment': _commentController.text.trim(),
          if (widget.enrollmentId != null &&
              widget.enrollmentId!.isNotEmpty)
            'enrollmentId': widget.enrollmentId,
        },
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = loadErrorMessage(context.read<LocaleProvider>(), e);
      });
    }
  }

  Widget _sectionHeader(String title, String badge) {
    return Row(
      children: [
        Text(title, style: _titleStyle),
        const Spacer(),
        Text(badge, style: _badgeStyle),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final commentLen = _commentController.text.length;
    final viewBottom = MediaQuery.viewInsetsOf(context).bottom;
    final bottomPad = 20.0 + viewBottom +
        (viewBottom > 0 ? _keyboardBottomExtra : 0);

    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(20, 10, 20, bottomPad),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderPrimary,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            _sectionHeader('Rate your class', 'Required'),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) {
                final star = i + 1;
                final selected = star <= _rating;
                return GestureDetector(
                  onTap: _submitting
                      ? null
                      : () => setState(() => _rating = star),
                  behavior: HitTestBehavior.opaque,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 7),
                    child: Icon(
                      selected
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      color: AppColors.primary500,
                      size: 38,
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 10),
            Text(
              'Tap a star to rate',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.sp,
                color: AppColors.textTertiary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 28),
            _sectionHeader('Share your experience', 'Optional'),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderPrimary),
              ),
              child: Stack(
                children: [
                  TextField(
                    controller: _commentController,
                    enabled: !_submitting,
                    maxLines: 5,
                    minLines: 5,
                    maxLength: _maxCommentLength,
                    buildCounter: (
                      _, {
                      required currentLength,
                      required isFocused,
                      required maxLength,
                    }) =>
                        null,
                    textCapitalization: TextCapitalization.sentences,
                    style: TextStyle(
                      fontSize: 15.sp,
                      color: AppColors.textPrimary,
                      height: 1.4,
                    ),
                    decoration: InputDecoration(
                      hintText:
                          'What did you enjoy most? Any suggestions?',
                      hintStyle: TextStyle(
                        fontSize: 15.sp,
                        color: AppColors.textTertiary,
                        height: 1.4,
                      ),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.fromLTRB(14, 12, 14, 32),
                    ),
                  ),
                  Positioned(
                    right: 12,
                    bottom: 10,
                    child: Text(
                      '$commentLen/$_maxCommentLength',
                      style: TextStyle(
                        fontSize: 12.sp,
                        color: AppColors.textTertiary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              SelectableText.rich(
                TextSpan(
                  text: _error,
                  style: TextStyle(color: AppColors.error500),
                ),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary500,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: _submitting
                  ? SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      'Submit review',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

