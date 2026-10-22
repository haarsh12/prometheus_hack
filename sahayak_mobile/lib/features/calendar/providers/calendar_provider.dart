import 'package:flutter/material.dart';
import '../../../core/services/api_client.dart';
import '../models/farm_calendar_model.dart';

class FarmCalendarProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  List<FarmCalendarModel> _events = [];
  DateTime _selectedDate = DateTime.now();
  bool _isLoading = false;
  String? _errorMessage;

  List<FarmCalendarModel> get events => _events;
  DateTime get selectedDate => _selectedDate;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<FarmCalendarModel> get eventsForSelectedDate {
    return _events.where((e) =>
      e.eventDate.year == _selectedDate.year &&
      e.eventDate.month == _selectedDate.month &&
      e.eventDate.day == _selectedDate.day
    ).toList();
  }

  void setSelectedDate(DateTime date) {
    _selectedDate = date;
    notifyListeners();
  }

  /// Fetch events from `/api/farm-calendar`
  Future<void> fetchEvents({DateTime? start, DateTime? end}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final from = start ?? DateTime.now().subtract(const Duration(days: 30));
    final to = end ?? DateTime.now().add(const Duration(days: 90));

    final fromStr = "${from.year.toString().padLeft(4, '0')}-${from.month.toString().padLeft(2, '0')}-${from.day.toString().padLeft(2, '0')}";
    final toStr = "${to.year.toString().padLeft(4, '0')}-${to.month.toString().padLeft(2, '0')}-${to.day.toString().padLeft(2, '0')}";

    try {
      final response = await _api.get(
        '/api/farm-calendar',
        queryParams: {
          'start': fromStr,
          'end': toStr,
        },
      );

      if (response is List) {
        _events = response
            .whereType<Map>()
            .map((e) => FarmCalendarModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      } else {
        _events = [];
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      // If user is guest / offline, provide default seasonal advisories
      if (_events.isEmpty) {
        _events = _getDefaultSeasonalAdvisories();
      }
      notifyListeners();
    }
  }

  /// Create a new event
  Future<bool> createEvent({
    required DateTime date,
    required String title,
    String? detail,
    String kind = 'treatment',
    String? crop,
  }) async {
    final dateStr = "${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";

    try {
      final response = await _api.post(
        '/api/farm-calendar',
        {
          'event_date': dateStr,
          'title': title,
          'detail': detail,
          'kind': kind,
          'crop': crop,
          'origin': 'manual',
        },
      );

      final newEvent = FarmCalendarModel.fromJson(response);
      _events.add(newEvent);
      _events.sort((a, b) => a.eventDate.compareTo(b.eventDate));
      notifyListeners();
      return true;
    } catch (e) {
      // Local fallback
      final fallbackEvent = FarmCalendarModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        eventDate: date,
        title: title,
        detail: detail,
        kind: kind,
        crop: crop,
        origin: 'manual',
        createdAt: DateTime.now(),
      );
      _events.add(fallbackEvent);
      _events.sort((a, b) => a.eventDate.compareTo(b.eventDate));
      notifyListeners();
      return true;
    }
  }

  List<FarmCalendarModel> _getDefaultSeasonalAdvisories() {
    final now = DateTime.now();
    return [
      FarmCalendarModel(
        id: '1',
        eventDate: now,
        title: 'Morning Field Scouting',
        detail: 'Check under leaves for early aphid and whitefly activity.',
        kind: 'check',
        crop: 'Cotton',
        origin: 'diagnosis',
        createdAt: now,
      ),
      FarmCalendarModel(
        id: '2',
        eventDate: now.add(const Duration(days: 2)),
        title: 'Bio-Fungicide Neem Spray Window',
        detail: 'Apply 5ml/L neem oil spray in the cooler evening hours.',
        kind: 'treatment',
        crop: 'Soybean',
        origin: 'diagnosis',
        createdAt: now,
      ),
      FarmCalendarModel(
        id: '3',
        eventDate: now.add(const Duration(days: 5)),
        title: 'Soil Moisture & Nutrient Check',
        detail: 'Ensure adequate drainage before upcoming rainfall window.',
        kind: 'weather',
        crop: 'Paddy',
        origin: 'manual',
        createdAt: now,
      ),
    ];
  }
}
