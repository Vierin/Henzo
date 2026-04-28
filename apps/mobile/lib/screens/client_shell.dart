import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../constants/colors.dart';
import '../l10n/locale_provider.dart';
import 'client_map_screen.dart';
import 'public_home_screen.dart';
import '../services/auth_service.dart';

class ClientShell extends StatefulWidget {
  const ClientShell({super.key});

  @override
  State<ClientShell> createState() => _ClientShellState();
}

class _ClientShellState extends State<ClientShell> {
  int _currentIndex = 0;
  bool _showMapScreen = false;

  void goToExploreTab() {
    setState(() => _currentIndex = 1);
  }

  List<Widget> get _screens => [
    PublicHomeScreen(
      onOpenMap: () => setState(() {
        _showMapScreen = true;
      }),
    ),
    const _ClientSearchScreen(),
    const _ClientFavoritesScreen(),
    const _ClientProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          IndexedStack(index: _currentIndex, children: _screens),
          if (_showMapScreen)
            Positioned.fill(
              child: ClientMapScreen(
                onBack: () => setState(() => _showMapScreen = false),
              ),
            ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.backgroundPrimary,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 8,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          constraints: const BoxConstraints(minHeight: 42, maxHeight: 56),
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
          child: Row(
            children: [
              Expanded(
                child: _ClientNavItem(
                  icon: Icons.home_outlined,
                  activeIcon: Icons.home,
                  label: 'Home',
                  isSelected: _currentIndex == 0,
                  onTap: () => setState(() => _currentIndex = 0),
                ),
              ),
              Expanded(
                child: _ClientNavItem(
                  icon: Icons.search_outlined,
                  activeIcon: Icons.search,
                  label: 'Explore',
                  isSelected: _currentIndex == 1,
                  onTap: () => setState(() => _currentIndex = 1),
                ),
              ),
              Expanded(
                child: _ClientNavItem(
                  icon: Icons.favorite_border,
                  activeIcon: Icons.favorite,
                  label: 'Favorites',
                  isSelected: _currentIndex == 2,
                  onTap: () => setState(() => _currentIndex = 2),
                ),
              ),
              Expanded(
                child: _ClientNavItem(
                  icon: Icons.person_outline,
                  activeIcon: Icons.person,
                  label: 'Profile',
                  isSelected: _currentIndex == 3,
                  onTap: () => setState(() => _currentIndex = 3),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClientSearchScreen extends StatelessWidget {
  const _ClientSearchScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: Center(
        child: Text(
          'Explore',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}

class _ClientFavoritesScreen extends StatelessWidget {
  const _ClientFavoritesScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'Пора найти ваше любимое место',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Соберите студии в избранное, чтобы бронировать быстрее.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () {
                  final shellState =
                      context.findAncestorStateOfType<_ClientShellState>();
                  shellState?.goToExploreTab();
                },
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary500,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Explore'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClientProfileScreen extends StatelessWidget {
  const _ClientProfileScreen();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.user;
    final displayName = user?.name?.trim().isNotEmpty == true
        ? user!.name!.trim()
        : 'Client';
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: DefaultTabController(
          length: 2,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            displayName,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            '0 classes visited',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Profile settings',
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const _ClientProfileSettingsScreen(),
                          ),
                        );
                      },
                      icon: const Icon(
                        Icons.settings_outlined,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: TabBar(
                  labelColor: AppColors.primary500,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary500,
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: AppColors.borderPrimary,
                  tabs: [
                    Tab(text: 'Schedule'),
                    Tab(text: 'Passes'),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              const Expanded(
                child: TabBarView(
                  children: [
                    _ClientScheduleTab(),
                    _ClientPassesTab(),
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

class _ClientScheduleTab extends StatelessWidget {
  const _ClientScheduleTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        _ClientPlaceholderCard(
          title: 'No classes scheduled yet',
          subtitle: 'Your upcoming bookings will appear here.',
        ),
      ],
    );
  }
}

class _ClientPassesTab extends StatelessWidget {
  const _ClientPassesTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        _ClientPlaceholderCard(
          title: 'No active passes',
          subtitle: 'Purchased passes will appear here.',
        ),
      ],
    );
  }
}

class _ClientPlaceholderCard extends StatelessWidget {
  const _ClientPlaceholderCard({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundPrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderPrimary),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ClientProfileSettingsScreen extends StatelessWidget {
  const _ClientProfileSettingsScreen();

  Future<void> _logout(BuildContext context) async {
    await context.read<AuthService>().logout();
    if (!context.mounted) return;
    Navigator.of(context, rootNavigator: true).popUntil((route) => route.isFirst);
  }

  Future<void> _openWebPage(
    BuildContext context,
    String localeTag,
    String path,
  ) async {
    final uri = Uri.parse('${AppConfig.webUrl}/$localeTag$path');
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to open link')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: const Text('Profile settings'),
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _SettingsItemTile(
                icon: Icons.person_outline,
                title: 'Edit profile',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const _ClientEditProfileScreen(),
                    ),
                  );
                },
              ),
              const SizedBox(height: 10),
              _SettingsItemTile(
                icon: Icons.description_outlined,
                title: 'Terms of use',
                onTap: () => _openWebPage(
                  context,
                  context.read<LocaleProvider>().languageTag,
                  '/terms-of-service',
                ),
              ),
              const SizedBox(height: 10),
              _SettingsItemTile(
                icon: Icons.privacy_tip_outlined,
                title: 'Privacy policy',
                onTap: () => _openWebPage(
                  context,
                  context.read<LocaleProvider>().languageTag,
                  '/privacy-policy',
                ),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: () => _logout(context),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.error500,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsItemTile extends StatelessWidget {
  const _SettingsItemTile({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundPrimary,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderPrimary),
          ),
          child: Row(
            children: [
              Icon(icon, color: AppColors.primary500),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClientEditProfileScreen extends StatefulWidget {
  const _ClientEditProfileScreen();

  @override
  State<_ClientEditProfileScreen> createState() => _ClientEditProfileScreenState();
}

class _ClientEditProfileScreenState extends State<_ClientEditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _saving = false;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthService>().user;
    final fullName = (user?.name ?? '').trim();
    final parts = fullName.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isNotEmpty) {
      _firstNameController.text = parts.first;
      if (parts.length > 1) {
        _lastNameController.text = parts.sublist(1).join(' ');
      }
    }
    _emailController.text = user?.email ?? '';
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthService>();
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final fullName = [firstName, lastName].where((s) => s.isNotEmpty).join(' ');
    final newEmail = _emailController.text.trim();
    final newPassword = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (newPassword.isNotEmpty && newPassword != confirmPassword) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match')),
      );
      return;
    }

    setState(() => _saving = true);
    final profileRes = await auth.updateProfile(name: fullName, phone: auth.user?.phone ?? '');
    if (!mounted) return;

    if (!profileRes.success) {
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(profileRes.errorRaw ?? 'Failed to update profile')),
      );
      return;
    }

    if (newEmail.isNotEmpty && newEmail != (auth.user?.email ?? '')) {
      final emailRes = await auth.updateEmail(newEmail);
      if (!mounted) return;
      if (!emailRes.success) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(emailRes.errorRaw ?? 'Failed to update email')),
        );
        return;
      }
    }

    if (newPassword.isNotEmpty) {
      final pwdRes = await auth.updatePassword(newPassword);
      if (!mounted) return;
      if (!pwdRes.success) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(pwdRes.errorRaw ?? 'Failed to update password'),
          ),
        );
        return;
      }
    }

    setState(() => _saving = false);
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Profile updated')));
    Navigator.of(context).pop();
  }

  Future<void> _deleteAccount() async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete account'),
        content: const Text(
          'This action is permanent. Are you sure you want to delete your account?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error500),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (shouldDelete != true || !mounted) return;

    setState(() => _deleting = true);
    final result = await context.read<AuthService>().deleteAccount();
    if (!mounted) return;
    setState(() => _deleting = false);

    if (!result.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.errorRaw ?? 'Failed to delete account')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: const Text('Edit profile'),
        backgroundColor: AppColors.backgroundPrimary,
        foregroundColor: AppColors.textPrimary,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _firstNameController,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'First name',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'First name is required'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _lastNameController,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Last name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'New password',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _confirmPasswordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Confirm password',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _saving ? null : _save,
                      child: Text(_saving ? 'Saving...' : 'Save'),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _deleting ? null : _deleteAccount,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.error500,
                        side: const BorderSide(color: AppColors.error500),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      icon: _deleting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.error500,
                              ),
                            )
                          : const Icon(Icons.delete_forever_outlined),
                      label: Text(_deleting ? 'Deleting...' : 'Delete account'),
                    ),
                  ),
                ],
              ),
            ),
          ],
          ),
        ),
    );
  }
}

class _ClientNavItem extends StatelessWidget {
  const _ClientNavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = isSelected ? AppColors.primary500 : AppColors.textSecondary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isSelected ? activeIcon : icon, size: 20, color: color),
            const SizedBox(height: 1),
            Text(
              label,
              style: TextStyle(
                fontSize: 9,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
