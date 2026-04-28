import 'package:flutter/material.dart';

import '../constants/colors.dart';
import 'business_registration_screen.dart';
import 'client_registration_screen.dart';

class RegistrationRoleScreen extends StatelessWidget {
  const RegistrationRoleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Choose Your Path'),
        centerTitle: true,
      ),
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _RoleCard(
                title: 'Client',
                icon: Icons.self_improvement_rounded,
                accentImage: const _CardAccent(
                  startColor: Color(0xFFF7F7F7),
                  endColor: Color(0xFFEFEFEF),
                  icon: Icons.spa_rounded,
                ),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ClientRegistrationScreen()),
                  );
                },
              ),
              const SizedBox(height: 14),
              _RoleCard(
                title: 'Business',
                icon: Icons.storefront_rounded,
                accentImage: const _CardAccent(
                  startColor: Color(0xFFF8F1F1),
                  endColor: Color(0xFFEDE3E3),
                  icon: Icons.domain_rounded,
                ),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const BusinessRegistrationScreen()),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.title,
    required this.icon,
    required this.accentImage,
    required this.onTap,
  });

  final String title;
  final IconData icon;
  final Widget accentImage;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          height: 132,
          padding: const EdgeInsets.fromLTRB(18, 14, 14, 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderPrimary),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, color: AppColors.primary500, size: 34),
                    const SizedBox(height: 8),
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 36,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary500,
                        height: 0.95,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: accentImage,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CardAccent extends StatelessWidget {
  const _CardAccent({
    required this.startColor,
    required this.endColor,
    required this.icon,
  });

  final Color startColor;
  final Color endColor;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 108,
      height: 100,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [startColor, endColor],
        ),
      ),
      child: Center(
        child: Icon(
          icon,
          size: 54,
          color: AppColors.primary500.withValues(alpha: 0.25),
        ),
      ),
    );
  }
}
