import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/premium_button.dart';

/// Premium landing screen for ShetiMitra AI
class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF059669), Color(0xFF10B981)],
                      ),
                      borderRadius: BorderRadius.circular(11),
                      boxShadow: AppColors.cardShadow,
                    ),
                    child: const Icon(
                      Icons.eco_rounded,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'ShetiMitra AI',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppColors.ink,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ).animate().fadeIn(duration: 400.ms).slideY(
                    begin: -0.2,
                    end: 0,
                    curve: Curves.easeOut,
                  ),

              const SizedBox(height: 52),

              // Hero Section
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Kicker
                  Text(
                    'AI-POWERED AGRICULTURE'.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF059669),
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Main headline
                  const Text(
                    'Smart Farming,\nCrop Health &\nSchemes Guide',
                    style: TextStyle(
                      fontSize: 38,
                      fontWeight: FontWeight.w800,
                      color: AppColors.ink,
                      height: 1.1,
                      letterSpacing: -1.8,
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Description
                  const Text(
                    'Spot crop stress before it spreads. Get leaf diagnosis, spray weather safety checks, advisory schedules, and 45+ farmer schemes in your language.',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w400,
                      color: AppColors.muted,
                      height: 1.6,
                      letterSpacing: -0.2,
                    ),
                  ),
                ],
              )
                  .animate()
                  .fadeIn(delay: 200.ms, duration: 600.ms)
                  .slideY(begin: 0.2, end: 0, curve: Curves.easeOut),

              const SizedBox(height: 36),

              // Action buttons
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  PremiumButton(
                    text: 'Ask ShetiMitra (Voice)',
                    icon: Icons.mic_rounded,
                    onPressed: () => context.go('/ask-shetimitra'),
                  ),
                  const SizedBox(height: 12),
                  PremiumButton(
                    text: 'Analyse a Crop Leaf',
                    style: PremiumButtonStyle.outline,
                    icon: Icons.energy_savings_leaf_outlined,
                    onPressed: () => context.go('/crop-analyzer'),
                  ),
                  const SizedBox(height: 20),
                  Center(
                    child: TextButton(
                      onPressed: () => context.go('/login'),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Already have an account?',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.muted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Sign in',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.ink,
                              fontWeight: FontWeight.w700,
                              decoration: TextDecoration.underline,
                              decorationColor: AppColors.ink,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              )
                  .animate()
                  .fadeIn(delay: 400.ms, duration: 600.ms)
                  .slideY(begin: 0.1, end: 0, curve: Curves.easeOut),

              const SizedBox(height: 40),

              // Trust indicators
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const _TrustBadge(
                    icon: Icons.verified_user_rounded,
                    label: 'On-device Vision',
                  ),
                  Container(
                    width: 4,
                    height: 4,
                    margin: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: const BoxDecoration(
                      color: Color(0xFFB7B7B7),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const _TrustBadge(
                    icon: Icons.language_rounded,
                    label: '10 Languages',
                  ),
                  Container(
                    width: 4,
                    height: 4,
                    margin: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: const BoxDecoration(
                      color: Color(0xFFB7B7B7),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const _TrustBadge(
                    icon: Icons.agriculture_rounded,
                    label: 'Farm Guidance',
                  ),
                ],
              )
                  .animate()
                  .fadeIn(delay: 600.ms, duration: 600.ms)
                  .slideY(begin: 0.1, end: 0),

              const SizedBox(height: 36),

              // Features preview
              const _FeatureCard(
                icon: Icons.energy_savings_leaf_rounded,
                title: 'Crop Analyzer',
                description:
                    'Snap a photo of any crop leaf to identify fungal, pest, or nutrient stress.',
              ).animate().fadeIn(delay: 700.ms).slideX(begin: -0.1, end: 0),

              const SizedBox(height: 14),

              const _FeatureCard(
                icon: Icons.calendar_month_rounded,
                title: 'Advisory Calendar',
                description:
                    'Spray weather gates and tailored farm schedules to plan field applications.',
              ).animate().fadeIn(delay: 800.ms).slideX(begin: -0.1, end: 0),

              const SizedBox(height: 14),

              const _FeatureCard(
                icon: Icons.account_balance_rounded,
                title: '45+ Government Schemes',
                description:
                    'Explore direct subsidies, crop insurance, solar pumps, and PM-KISAN support.',
              ).animate().fadeIn(delay: 900.ms).slideX(begin: -0.1, end: 0),
            ],
          ),
        ),
      ),
    );
  }
}

class _TrustBadge extends StatelessWidget {
  final IconData icon;
  final String label;

  const _TrustBadge({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: const Color(0xFF059669)),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.muted,
          ),
        ),
      ],
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _FeatureCard({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 22, color: const Color(0xFF059669)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.muted,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
