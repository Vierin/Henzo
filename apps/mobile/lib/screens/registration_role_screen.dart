import 'package:flutter/material.dart';

import '../constants/colors.dart';
import 'business_registration_screen.dart';
import 'client_registration_screen.dart';

class RegistrationRoleScreen extends StatelessWidget {
  const RegistrationRoleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Choose your path',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 18),
                _RoleCard(
                  title: 'Client',
                  icon: Icons.self_improvement_rounded,
                  imageAssetPath: 'assets/public/client.png',
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
                  imageAssetPath: 'assets/public/business.png',
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
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.title,
    required this.icon,
    required this.imageAssetPath,
    required this.onTap,
  });

  final String title;
  final IconData icon;
  final String imageAssetPath;
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
          height: 156,
          padding: const EdgeInsets.fromLTRB(18, 14, 0, 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderPrimary),
          ),
          child: Row(
            children: [
              Expanded(
                child: Align(
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(icon, color: AppColors.primary500, size: 34),
                      const SizedBox(height: 8),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary500,
                          height: 0.95,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(
                width: 148,
                child: _CardPhoto(imageAssetPath: imageAssetPath),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CardPhoto extends StatelessWidget {
  const _CardPhoto({required this.imageAssetPath});

  final String imageAssetPath;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.only(
        topRight: Radius.circular(14),
        bottomRight: Radius.circular(14),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            imageAssetPath,
            fit: BoxFit.cover,
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  Colors.white,
                  Color(0xF0FFFFFF),
                  Color(0xA6FFFFFF),
                  Color(0x42FFFFFF),
                  Color(0x00FFFFFF),
                ],
                stops: [0, 0.33, 0.58, 0.78, 1],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
