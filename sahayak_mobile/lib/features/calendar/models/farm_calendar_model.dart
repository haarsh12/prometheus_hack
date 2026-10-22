class FarmCalendarModel {
  final String id;
  final DateTime eventDate;
  final String title;
  final String? detail;
  final String kind; // 'personal' | 'treatment' | 'check' | 'weather'
  final String? crop;
  final String origin; // 'manual' | 'diagnosis'
  final DateTime createdAt;

  const FarmCalendarModel({
    required this.id,
    required this.eventDate,
    required this.title,
    this.detail,
    required this.kind,
    this.crop,
    required this.origin,
    required this.createdAt,
  });

  factory FarmCalendarModel.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic val) {
      if (val is String) {
        return DateTime.tryParse(val) ?? DateTime.now();
      }
      return DateTime.now();
    }

    return FarmCalendarModel(
      id: json['id']?.toString() ?? '',
      eventDate: parseDate(json['event_date'] ?? json['date']),
      title: json['title']?.toString() ?? '',
      detail: json['detail']?.toString(),
      kind: json['kind']?.toString() ?? 'treatment',
      crop: json['crop']?.toString(),
      origin: json['origin']?.toString() ?? 'manual',
      createdAt: parseDate(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'event_date': "${eventDate.year.toString().padLeft(4, '0')}-${eventDate.month.toString().padLeft(2, '0')}-${eventDate.day.toString().padLeft(2, '0')}",
    'title': title,
    'detail': detail,
    'kind': kind,
    'crop': crop,
    'origin': origin,
    'created_at': createdAt.toIso8601String(),
  };
}
