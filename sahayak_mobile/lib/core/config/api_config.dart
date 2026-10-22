import 'package:flutter/foundation.dart';

/// Central API configuration for ShetiMitra AI mobile application
///
/// Override at build time using:
/// flutter run --dart-define=API_BASE_URL=http://your-server:8000
class ApiConfig {
  const ApiConfig._();

  static String? _overrideUrl;

  /// Allow setting custom backend URL at runtime (e.g. from developer/settings screen)
  static void setBaseUrl(String url) {
    _overrideUrl = url.trim().replaceFirst(RegExp(r'/+$'), '');
  }

  static const String _envUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  /// Base URL for all HTTP API calls
  static String get baseUrl {
    if (_overrideUrl != null && _overrideUrl!.isNotEmpty) {
      return _overrideUrl!;
    }
    if (_envUrl.isNotEmpty) {
      return _envUrl.replaceFirst(RegExp(r'/+$'), '');
    }
    // Default to active local server IP for physical device & network testing
    return 'http://10.50.10.137:8000';
  }

  /// Stable device declaration sent with every backend request
  static const String clientDevice = 'mobile-app';

  /// WebSocket URL derived from base URL
  static String get wsUrl {
    final base = baseUrl;
    if (base.startsWith('https://')) {
      return base.replaceFirst('https://', 'wss://');
    }
    if (base.startsWith('http://')) {
      return base.replaceFirst('http://', 'ws://');
    }
    return 'ws://$base';
  }

  // API Endpoints
  static const String auth = '/api/auth';
  static const String authLogin = '$auth/otp/request';
  static const String authVerify = '$auth/otp/verify';
  static const String authRefresh = '$auth/refresh';
  static const String authProfile = '$auth/profile';

  static const String voice = '/voice';
  static const String voiceToken = '/api/token';

  static const String services = '/api/services';
  static const String schemes = '/api/schemes';
  static const String grievances = '/api/grievances';
  static const String knowledge = '/api/knowledge';

  // Crop Health & Advisory Endpoints
  static const String cropDiagnoses = '/api/crop-diagnoses';
  static const String cropWeather = '/api/crop-weather';
  static const String farmCalendar = '/api/farm-calendar';

  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 45);

  /// CropVision may need up to 50 seconds for a high-resolution leaf photo.
  /// Keep a small network buffer so the app does not abandon a valid result
  /// before FastAPI can return it.
  static const Duration cropDiagnosisTimeout = Duration(seconds: 70);
}
