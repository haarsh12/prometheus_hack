class SprayWeatherModel {
  final String status; // 'safe' | 'caution' | 'avoid'
  final String summary;
  final double? temperatureC;
  final double? windMps;
  final bool rainExpected;
  final DateTime? forecastAt;
  final String provider;

  const SprayWeatherModel({
    required this.status,
    required this.summary,
    this.temperatureC,
    this.windMps,
    required this.rainExpected,
    this.forecastAt,
    this.provider = 'OpenWeatherMap',
  });

  factory SprayWeatherModel.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic val) {
      if (val is String) return DateTime.tryParse(val);
      return null;
    }

    return SprayWeatherModel(
      status: json['status']?.toString() ?? 'caution',
      summary: json['summary']?.toString() ?? 'Check local conditions before spraying.',
      temperatureC: (json['temperature_c'] as num?)?.toDouble(),
      windMps: (json['wind_mps'] as num?)?.toDouble(),
      rainExpected: json['rain_expected'] == true,
      forecastAt: parseDate(json['forecast_at']),
      provider: json['provider']?.toString() ?? 'OpenWeatherMap',
    );
  }

  Map<String, dynamic> toJson() => {
    'status': status,
    'summary': summary,
    'temperature_c': temperatureC,
    'wind_mps': windMps,
    'rain_expected': rainExpected,
    'forecast_at': forecastAt?.toIso8601String(),
    'provider': provider,
  };

  bool get isSafe => status == 'safe';
  bool get isCaution => status == 'caution';
  bool get isAvoid => status == 'avoid';
}
