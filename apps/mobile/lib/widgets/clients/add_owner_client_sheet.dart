import 'dart:async';

import 'package:flutter/material.dart';
import '../common/henzo_modal.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../../constants/colors.dart';
import '../../l10n/locale_provider.dart';
import '../../models/owner_studio_client.dart';
import '../../services/auth_service.dart';
import '../../services/dashboard_api_service.dart';
import '../../utils/synthetic_guest.dart';
import '../app_search_prefix_icon.dart';
import '../common/henzo_header_back_button.dart';
import '../common/sheet_action_button_style.dart';

enum AddOwnerClientMode { directoryOnly, enrollInSession }

String _emailLocale(LocaleProvider loc) {
  final c = loc.localeCode;
  if (c == 'vi' || c == 'en' || c == 'ru') return c;
  return 'en';
}

bool _isValidEmail(String raw) {
  final s = raw.trim();
  return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(s);
}

/// Picked client from roster / search (same shape for list + enroll).
class _ClientPick {
  const _ClientPick({
    required this.userId,
    required this.displayName,
    this.email,
    this.phone,
    required this.isGuest,
    required this.isSyntheticSpot,
  });

  final String userId;
  final String displayName;
  final String? email;
  final String? phone;
  final bool isGuest;

  /// Anonymous roster slot (@henzo.local / legacy "Walk-in" name).
  final bool isSyntheticSpot;

  factory _ClientPick.fromRow(OwnerStudioClientRow r) {
    final synthetic =
        isSyntheticGuestEmail(r.email) ||
        (r.name ?? '').trim().toLowerCase() == 'walk-in';
    final name = synthetic
        ? '—'
        : (r.name?.trim().isNotEmpty ?? false)
        ? r.name!.trim()
        : (r.email ?? r.phone ?? '—');
    return _ClientPick(
      userId: r.userId,
      displayName: name,
      email: r.email,
      phone: r.phone,
      isGuest: r.isGuest,
      isSyntheticSpot: synthetic,
    );
  }

  factory _ClientPick.fromHit(OwnerStudioClientSearchHit h) {
    final synthetic =
        isSyntheticGuestEmail(h.email) ||
        (h.name ?? '').trim().toLowerCase() == 'walk-in';
    final name = synthetic
        ? '—'
        : (h.name?.trim().isNotEmpty ?? false)
        ? h.name!.trim()
        : (h.email ?? h.phone ?? '—');
    return _ClientPick(
      userId: h.userId,
      displayName: name,
      email: h.email,
      phone: h.phone,
      isGuest: h.isGuest,
      isSyntheticSpot: synthetic,
    );
  }
}

enum _EnrollStep {
  /// Anonymous spot vs roster vs new client.
  chooseSource,

  /// Reserve capacity only (synthetic guest).
  anonymousSpot,

  /// Search + recent + select client.
  pickFromList,

  /// New client: name + email required, phone optional.
  newWalkIn,
}

Future<void> showAddOwnerClientSheet(
  BuildContext context, {
  required AddOwnerClientMode mode,
  String? sessionId,
  VoidCallback? onSuccess,
}) async {
  await showHenzoModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) {
      if (mode == AddOwnerClientMode.enrollInSession) {
        final sid = sessionId?.trim();
        if (sid == null || sid.isEmpty) {
          return const SizedBox.shrink();
        }
        return _EnrollParticipantSheet(sessionId: sid, onSuccess: onSuccess);
      }
      return _DirectoryAddSheet(onSuccess: onSuccess);
    },
  );
}

/// Add client to CRM only (no session).
class _DirectoryAddSheet extends StatefulWidget {
  const _DirectoryAddSheet({this.onSuccess});

  final VoidCallback? onSuccess;

  @override
  State<_DirectoryAddSheet> createState() => _DirectoryAddSheetState();
}

class _DirectoryAddSheetState extends State<_DirectoryAddSheet> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _notes = TextEditingController();
  var _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tr = context.read<LocaleProvider>().t;
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + bottom),
        child: _SheetChrome(
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tr('ownerClient.addToDirectory'), style: _sheetTitleStyle),
                const SizedBox(height: 8),
                Text(
                  tr('ownerClient.directoryFormHint'),
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _name,
                  enabled: !_saving,
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration(
                    labelText: tr('ownerSession.name'),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _email,
                  enabled: !_saving,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: tr('ownerSession.email'),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _phone,
                  enabled: !_saving,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: tr('ownerSession.phone'),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _notes,
                  enabled: !_saving,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: tr('ownerClient.notesOptional'),
                  ),
                ),
                const SizedBox(height: 14),
                _SheetActions(
                  saving: _saving,
                  onCancel: () => Navigator.of(context).pop(),
                  onPrimary: () {
                    _submit();
                  },
                  primaryLabel: tr('ownerSession.add'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final t = context.read<LocaleProvider>().t;
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (_name.text.trim().isEmpty || !_isValidEmail(_email.text)) {
      messenger?.showSnackBar(
        SnackBar(content: Text(t('ownerClient.missingNameEmail'))),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await DashboardApiService.createOwnerStudioDirectoryClient(
        token,
        name: _name.text.trim(),
        email: _email.text.trim(),
        phone: _phone.text.trim(),
        notes: _notes.text.trim(),
      );
      widget.onSuccess?.call();
      messenger?.showSnackBar(
        SnackBar(content: Text(t('ownerClient.addedToDirectory'))),
      );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      messenger?.showSnackBar(
        SnackBar(content: Text('$e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

/// First screen: anonymous spot | roster | new client → detail step.
class _EnrollParticipantSheet extends StatefulWidget {
  const _EnrollParticipantSheet({required this.sessionId, this.onSuccess});

  final String sessionId;
  final VoidCallback? onSuccess;

  @override
  State<_EnrollParticipantSheet> createState() =>
      _EnrollParticipantSheetState();
}

class _EnrollParticipantSheetState extends State<_EnrollParticipantSheet> {
  _EnrollStep _step = _EnrollStep.chooseSource;

  final _search = TextEditingController();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  Timer? _debounce;

  List<_ClientPick> _recent = [];
  List<_ClientPick> _searchHits = [];
  _ClientPick? _selected;
  var _loadingRecent = false;
  var _loadingSearch = false;
  var _saving = false;
  var _sendConfirmation = false;

  @override
  void initState() {
    super.initState();
    _search.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.removeListener(_onSearchChanged);
    _search.dispose();
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      _runSearch(_search.text.trim());
    });
  }

  Future<void> _loadRecentIfNeeded() async {
    if (_recent.isNotEmpty || _loadingRecent) return;
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    setState(() => _loadingRecent = true);
    try {
      final rows = await DashboardApiService.getOwnerStudioClients(token);
      if (!mounted) return;
      setState(() {
        _recent = rows
            .map(_ClientPick.fromRow)
            .where((p) => !p.isSyntheticSpot)
            .toList();
      });
    } finally {
      if (mounted) setState(() => _loadingRecent = false);
    }
  }

  Future<void> _runSearch(String q) async {
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    if (q.length < 2) {
      setState(() {
        _searchHits = [];
        _loadingSearch = false;
      });
      return;
    }
    setState(() => _loadingSearch = true);
    try {
      final hits = await DashboardApiService.searchOwnerStudioClients(token, q);
      if (!mounted) return;
      setState(() {
        _searchHits = hits
            .map(_ClientPick.fromHit)
            .where((p) => !p.isSyntheticSpot)
            .toList();
      });
    } catch (_) {
      if (mounted) {
        setState(() => _searchHits = []);
      }
    } finally {
      if (mounted) setState(() => _loadingSearch = false);
    }
  }

  List<_ClientPick> get _visiblePicks {
    final q = _search.text.trim();
    if (q.length >= 2) return _searchHits;
    return _recent;
  }

  Future<void> _enrollWithUserId() async {
    final sel = _selected;
    if (sel == null) return;
    final t = context.read<LocaleProvider>().t;
    final addedMsg = t('ownerSession.participantAdded');
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    final loc = context.read<LocaleProvider>();
    setState(() => _saving = true);
    try {
      await DashboardApiService.addOwnerSessionEnrollment(
        token,
        widget.sessionId,
        userId: sel.userId,
        sendConfirmationEmail: _sendConfirmation,
        locale: _emailLocale(loc),
      );
      widget.onSuccess?.call();
      messenger?.showSnackBar(SnackBar(content: Text(addedMsg)));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      messenger?.showSnackBar(
        SnackBar(content: Text('$e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _enrollWalkIn() async {
    final t = context.read<LocaleProvider>().t;
    final addedMsg = t('ownerSession.participantAdded');
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    final loc = context.read<LocaleProvider>();
    if (_name.text.trim().isEmpty || !_isValidEmail(_email.text)) {
      messenger?.showSnackBar(
        SnackBar(content: Text(t('ownerClient.missingNameEmail'))),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await DashboardApiService.addOwnerSessionEnrollment(
        token,
        widget.sessionId,
        name: _name.text.trim(),
        email: _email.text.trim(),
        phone: _phone.text.trim(),
        sendConfirmationEmail: _sendConfirmation,
        locale: _emailLocale(loc),
      );
      widget.onSuccess?.call();
      messenger?.showSnackBar(SnackBar(content: Text(addedMsg)));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      messenger?.showSnackBar(
        SnackBar(content: Text('$e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _enrollAnonymous() async {
    final addedMsg = context.read<LocaleProvider>().t(
      'ownerSession.participantAdded',
    );
    final token = context.read<AuthService>().accessToken;
    if (token == null || token.isEmpty) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    setState(() => _saving = true);
    try {
      await DashboardApiService.addOwnerSessionEnrollment(
        token,
        widget.sessionId,
        anonymousSpot: true,
      );
      widget.onSuccess?.call();
      messenger?.showSnackBar(SnackBar(content: Text(addedMsg)));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      messenger?.showSnackBar(
        SnackBar(content: Text('$e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tr = context.read<LocaleProvider>().t;
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final maxH = MediaQuery.sizeOf(context).height * 0.88;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + bottom),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxH),
          child: _SheetChrome(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(context, tr),
                Flexible(
                  child: SingleChildScrollView(
                    child: _buildStepBody(context, tr),
                  ),
                ),
                if (_step == _EnrollStep.anonymousSpot) ...[
                  const Divider(height: 20),
                  _SheetActions(
                    saving: _saving,
                    onCancel: () => Navigator.of(context).pop(),
                    onPrimary: _enrollAnonymous,
                    primaryLabel: tr('ownerSession.add'),
                    showCancel: false,
                  ),
                ],
                if (_step == _EnrollStep.pickFromList ||
                    _step == _EnrollStep.newWalkIn) ...[
                  const Divider(height: 20),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(tr('ownerClient.sendConfirmationEmail')),
                    value: _sendConfirmation,
                    onChanged: _saving
                        ? null
                        : (v) => setState(() => _sendConfirmation = v),
                  ),
                  const SizedBox(height: 8),
                  _SheetActions(
                    saving: _saving,
                    onCancel: () => Navigator.of(context).pop(),
                    onPrimary: () {
                      if (_step == _EnrollStep.pickFromList) {
                        _enrollWithUserId();
                      } else {
                        _enrollWalkIn();
                      }
                    },
                    primaryLabel: tr('ownerSession.add'),
                    primaryEnabled: _step == _EnrollStep.newWalkIn
                        ? _name.text.trim().isNotEmpty &&
                              _isValidEmail(_email.text)
                        : _selected != null,
                    showCancel: false,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, String Function(String) tr) {
    Widget closeBtn() => IconButton(
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
      onPressed: _saving ? null : () => Navigator.of(context).pop(),
      icon: const Icon(Icons.close, color: AppColors.textPrimary),
    );
    if (_step == _EnrollStep.chooseSource) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tr('ownerSession.addParticipant').toUpperCase(),
                  style: _sheetTitleStyle.copyWith(
                    fontSize: 16,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  tr('ownerClient.addParticipantHow'),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          _ParticipantSheetCloseButton(
            onPressed: _saving ? null : () => Navigator.of(context).pop(),
          ),
        ],
      );
    }
    return Row(
      children: [
        IgnorePointer(
          ignoring: _saving,
          child: HenzoHeaderBackButton(
            onPressed: () {
              setState(() {
                _step = _EnrollStep.chooseSource;
                _selected = null;
              });
            },
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            _step == _EnrollStep.pickFromList
                ? tr('ownerClient.pickFromRosterTitle')
                : _step == _EnrollStep.anonymousSpot
                ? tr('ownerClient.anonymousSpotTitle')
                : tr('ownerClient.newWalkInClient'),
            style: _sheetTitleStyle,
          ),
        ),
        closeBtn(),
      ],
    );
  }

  Widget _buildStepBody(BuildContext context, String Function(String) tr) {
    switch (_step) {
      case _EnrollStep.chooseSource:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 8),
            _SourceCard(
              iconAsset: 'assets/icons/icon-people.svg',
              title: tr('ownerClient.pickFromRoster'),
              subtitle: tr('ownerClient.pickFromRosterSubtitle'),
              onTap: _saving
                  ? null
                  : () {
                      setState(() => _step = _EnrollStep.pickFromList);
                      _loadRecentIfNeeded();
                    },
            ),
            const SizedBox(height: 10),
            _SourceCard(
              iconAsset: 'assets/icons/icon-add-people.svg',
              title: tr('ownerClient.newWalkInClient'),
              subtitle: tr('ownerClient.newWalkInClientSubtitle'),
              onTap: _saving
                  ? null
                  : () => setState(() => _step = _EnrollStep.newWalkIn),
            ),
            const SizedBox(height: 10),
            _SourceCard(
              iconAsset: 'assets/icons/icon-profile-large.svg',
              title: tr('ownerClient.anonymousSpotTitle'),
              subtitle: tr('ownerClient.anonymousSpotSubtitle'),
              onTap: _saving
                  ? null
                  : () => setState(() => _step = _EnrollStep.anonymousSpot),
            ),
          ],
        );
      case _EnrollStep.anonymousSpot:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              tr('ownerClient.anonymousSpotSubtitle'),
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
          ],
        );
      case _EnrollStep.pickFromList:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _search,
              enabled: !_saving,
              decoration: InputDecoration(
                labelText: tr('ownerClient.searchClientsPlaceholder'),
                prefixIcon: const AppSearchPrefixIcon(),
                prefixIconConstraints: AppSearchPrefixIcon.prefixConstraints(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              _search.text.trim().length >= 2
                  ? tr('ownerClient.searchResults')
                  : tr('ownerClient.recentClients'),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(height: 240, child: _buildPickList(context, tr)),
          ],
        );
      case _EnrollStep.newWalkIn:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              tr('ownerClient.walkInFormHint'),
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _name,
              enabled: !_saving,
              textCapitalization: TextCapitalization.words,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(labelText: tr('ownerSession.name')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _email,
              enabled: !_saving,
              keyboardType: TextInputType.emailAddress,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(labelText: tr('ownerSession.email')),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _phone,
              enabled: !_saving,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: tr('ownerSession.phone')),
            ),
          ],
        );
    }
  }

  Widget _buildPickList(BuildContext context, String Function(String) tr) {
    if (_loadingRecent && _search.text.trim().length < 2 && _recent.isEmpty) {
      return const Center(
        child: SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }
    if (_loadingSearch && _search.text.trim().length >= 2) {
      return const Center(
        child: SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }
    final list = _visiblePicks;
    if (list.isEmpty) {
      return Center(
        child: Text(
          _search.text.trim().length >= 2
              ? tr('ownerClient.noSearchResults')
              : tr('ownerClient.noClientsInRoster'),
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textSecondary),
        ),
      );
    }
    return ListView.builder(
      itemCount: list.length,
      itemBuilder: (ctx, i) {
        final p = list[i];
        final sel = _selected?.userId == p.userId;
        final title = p.isSyntheticSpot
            ? tr('ownerClient.anonymousRosterTitle')
            : p.displayName;
        final sub = [if (!p.isSyntheticSpot) p.email, p.phone]
            .whereType<String>()
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .join(' · ');
        return Card(
          margin: const EdgeInsets.only(bottom: 6),
          color: sel ? AppColors.primary50 : AppColors.backgroundPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(
              color: sel ? AppColors.primary500 : AppColors.borderPrimary,
            ),
          ),
          child: InkWell(
            onTap: _saving ? null : () => setState(() => _selected = p),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Icon(
                    sel ? Icons.check_circle : Icons.circle_outlined,
                    color: sel ? AppColors.primary500 : AppColors.textTertiary,
                    size: 22,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        if (sub.isNotEmpty)
                          Text(
                            sub,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (p.isGuest && !p.isSyntheticSpot)
                    Text(
                      tr('ownerClient.guestTag'),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textTertiary,
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ParticipantSheetCloseButton extends StatelessWidget {
  const _ParticipantSheetCloseButton({this.onPressed});

  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primary500,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onPressed,
        customBorder: const CircleBorder(),
        child: const SizedBox(
          width: 32,
          height: 32,
          child: Icon(Icons.close, size: 18, color: AppColors.textInverse),
        ),
      ),
    );
  }
}

class _SourceCard extends StatelessWidget {
  const _SourceCard({
    required this.iconAsset,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final String iconAsset;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundBrand,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 16, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SvgPicture.asset(iconAsset, width: 24, height: 20),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        height: 1.35,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SheetChrome extends StatelessWidget {
  const _SheetChrome({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.borderPrimary),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      child: child,
    );
  }
}

class _SheetActions extends StatelessWidget {
  const _SheetActions({
    required this.saving,
    required this.onCancel,
    required this.onPrimary,
    required this.primaryLabel,
    this.primaryEnabled = true,
    this.showCancel = true,
  });

  final bool saving;
  final VoidCallback onCancel;
  final VoidCallback onPrimary;
  final String primaryLabel;
  final bool primaryEnabled;
  final bool showCancel;

  @override
  Widget build(BuildContext context) {
    final tr = context.read<LocaleProvider>().t;
    final primary = FilledButton(
      onPressed: (saving || !primaryEnabled) ? null : onPrimary,
      style: sheetPrimaryButtonStyle(),
      child: saving
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : Text(primaryLabel),
    );
    if (!showCancel) {
      return SizedBox(width: double.infinity, child: primary);
    }
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: saving ? null : onCancel,
            style: sheetCancelButtonStyle(),
            child: Text(tr('common.cancel')),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(child: primary),
      ],
    );
  }
}

const TextStyle _sheetTitleStyle = TextStyle(
  fontSize: 18,
  fontWeight: FontWeight.w800,
  color: AppColors.textPrimary,
);
