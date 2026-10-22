import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/language_provider.dart';
import '../providers/auth_provider.dart';

/// Splash screen with app logo and initialization for ShetiMitra AI
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    final authProvider = context.read<AuthProvider>();
    final languageProvider = context.read<LanguageProvider>();

    // Wait for minimum splash duration
    await Future.delayed(const Duration(seconds: 2));

    // Initialize auth state
    await authProvider.initialize();

    if (!mounted) return;

    // Check language selection
    final isLanguageSelected = await languageProvider.isLanguageSelected();

    if (!mounted) return;

    if (!isLanguageSelected) {
      // First time - show language selection
      context.go('/language-selection');
    } else if (authProvider.isAuthenticated) {
      // Already logged in - go to home
      context.go('/ask-shetimitra');
    } else {
      // Not logged in - go directly to app in guest mode
      await authProvider.continueAsGuest();
      if (!mounted) return;
      context.go('/ask-shetimitra');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF059669), Color(0xFF10B981)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF10B981).withValues(alpha: 0.35),
                    blurRadius: 24,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: const Icon(
                Icons.eco_rounded,
                size: 64,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            
            // App name
            const Text(
              'ShetiMitra AI',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 8),
            
            // Tagline
            const Text(
              'Your Smart Crop & Farm Companion',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 48),
            
            // Loading indicator
            const SizedBox(
              width: 36,
              height: 36,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: Color(0xFF059669),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
