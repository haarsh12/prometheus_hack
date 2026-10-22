import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../features/home/screens/landing_screen.dart';
import '../features/auth/screens/splash_screen.dart';
import '../features/auth/screens/language_selection_screen.dart';
import '../features/auth/screens/premium_login_screen.dart';
import '../features/auth/screens/otp_verification_screen.dart';
import '../features/home/screens/home_shell.dart';
import '../features/voice/screens/premium_voice_screen_v2.dart';
import '../features/crops/screens/crop_analyzer_screen.dart';
import '../features/calendar/screens/advisory_calendar_screen.dart';
import '../features/schemes/screens/schemes_screen.dart';
import '../features/schemes/screens/scheme_detail_screen.dart';
import '../features/grievances/screens/grievances_screen.dart';
import '../features/grievances/screens/create_grievance_screen.dart';
import '../features/grievances/screens/grievance_detail_screen.dart';
import '../features/knowledge/screens/knowledge_base_screen.dart';
import '../features/profile/screens/premium_profile_screen.dart';
import '../features/profile/screens/edit_profile_screen.dart';
import '../features/profile/screens/settings_screen.dart';

/// ShetiMitra AI application router
class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/splash',
    routes: [
      // Splash and Onboarding
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),
      
      GoRoute(
        path: '/landing',
        name: 'landing',
        builder: (context, state) => const LandingScreen(),
      ),
      
      GoRoute(
        path: '/language-selection',
        name: 'language-selection',
        builder: (context, state) => const LanguageSelectionScreen(),
      ),
      
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const PremiumLoginScreen(),
      ),

      GoRoute(
        path: '/register',
        name: 'register',
        builder: (context, state) => const PremiumLoginScreen(isRegistering: true),
      ),
      
      GoRoute(
        path: '/otp-verification',
        name: 'otp-verification',
        builder: (context, state) {
          final extra = state.extra;
          String phone = '';
          bool isRegistering = false;
          
          if (extra is String) {
            phone = extra;
          } else if (extra is Map<String, dynamic>) {
            phone = extra['phone'] as String? ?? '';
            isRegistering = extra['isRegistering'] as bool? ?? false;
          }
          
          return OtpVerificationScreen(
            phoneNumber: phone,
            isRegistering: isRegistering,
          );
        },
      ),

      // Main App Shell with 5 Bottom Navigation items:
      // 1. Ask ShetiMitra
      // 2. Crop Analyzer
      // 3. Advisory Calender
      // 4. Schemes
      // 5. Profile
      ShellRoute(
        builder: (context, state, child) {
          return HomeShell(child: child);
        },
        routes: [
          GoRoute(
            path: '/home',
            name: 'home',
            redirect: (context, state) => '/ask-shetimitra',
          ),
          
          // Backward-compatibility redirect
          GoRoute(
            path: '/ask-sahayak',
            redirect: (context, state) => '/ask-shetimitra',
          ),

          // 1. Ask ShetiMitra (Voice Assistant)
          GoRoute(
            path: '/ask-shetimitra',
            name: 'ask-shetimitra',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: PremiumVoiceScreenV2(),
            ),
          ),

          // 2. Crop Analyzer (Leaf Diagnosis)
          GoRoute(
            path: '/crop-analyzer',
            name: 'crop-analyzer',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: CropAnalyzerScreen(),
            ),
          ),

          // 3. Advisory Calendar
          GoRoute(
            path: '/calendar',
            name: 'calendar',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: AdvisoryCalendarScreen(),
            ),
          ),
          
          // 4. Schemes
          GoRoute(
            path: '/schemes',
            name: 'schemes',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SchemesScreen(),
            ),
          ),

          // 5. Profile
          GoRoute(
            path: '/profile',
            name: 'profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: PremiumProfileScreen(),
            ),
          ),

          // Additional Accessible Shell Routes
          GoRoute(
            path: '/grievances',
            name: 'grievances',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: GrievancesScreen(),
            ),
          ),
          
          GoRoute(
            path: '/knowledge',
            name: 'knowledge',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: KnowledgeBaseScreen(),
            ),
          ),
        ],
      ),

      // Scheme Details
      GoRoute(
        path: '/scheme/:id',
        name: 'scheme-detail',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return SchemeDetailScreen(schemeId: id);
        },
      ),

      // Create Grievance
      GoRoute(
        path: '/grievances/create',
        name: 'create-grievance',
        builder: (context, state) => const CreateGrievanceScreen(),
      ),
      
      // Grievance Detail
      GoRoute(
        path: '/grievances/:id',
        name: 'grievance-detail',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return GrievanceDetailScreen(grievanceId: id);
        },
      ),

      // Profile & Settings
      GoRoute(
        path: '/profile/edit',
        name: 'edit-profile',
        builder: (context, state) => const EditProfileScreen(),
      ),
      
      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
    
    // Error handling
    errorBuilder: (context, state) => Scaffold(
      backgroundColor: AppColors.canvas,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              size: 64,
              color: AppColors.error,
            ),
            const SizedBox(height: 24),
            const Text(
              'Page not found',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              state.uri.path,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.muted,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => context.go('/ask-shetimitra'),
              icon: const Icon(Icons.home_rounded),
              label: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
}
