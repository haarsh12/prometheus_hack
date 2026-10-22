import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/config/api_config.dart';
import '../../../core/services/api_client.dart';
import '../models/crop_diagnosis_model.dart';
import '../models/spray_weather_model.dart';

class CropProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  XFile? _selectedFile;
  Uint8List? _imageBytes;

  bool _isAnalyzing = false;
  String? _errorMessage;
  CropDiagnosisModel? _currentDiagnosis;
  final List<CropDiagnosisModel> _history = [];

  // Spray weather check
  SprayWeatherModel? _sprayWeather;
  bool _isLoadingWeather = false;
  String? _weatherError;

  // Getters
  XFile? get selectedFile => _selectedFile;
  Uint8List? get imageBytes => _imageBytes;
  bool get isAnalyzing => _isAnalyzing;
  String? get errorMessage => _errorMessage;
  CropDiagnosisModel? get currentDiagnosis => _currentDiagnosis;
  List<CropDiagnosisModel> get history => _history;
  SprayWeatherModel? get sprayWeather => _sprayWeather;
  bool get isLoadingWeather => _isLoadingWeather;
  String? get weatherError => _weatherError;

  Future<void> setImage(XFile? file) async {
    _selectedFile = file;
    _currentDiagnosis = null;
    _errorMessage = null;
    if (file != null) {
      _imageBytes = await file.readAsBytes();
    } else {
      _imageBytes = null;
    }
    notifyListeners();
  }

  void clearImage() {
    _selectedFile = null;
    _imageBytes = null;
    _currentDiagnosis = null;
    _errorMessage = null;
    notifyListeners();
  }

  /// Send leaf image to ShetiMitra CropVision backend API
  Future<void> analyzeCrop() async {
    if (_imageBytes == null || _selectedFile == null) {
      _errorMessage = 'Please take or choose a leaf photo first.';
      notifyListeners();
      return;
    }

    _isAnalyzing = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final filename = _selectedFile!.name.isNotEmpty
          ? _selectedFile!.name
          : 'leaf.jpg';
      final response = await _api.postMultipart(
        ApiConfig.cropDiagnoses,
        fileBytes: _imageBytes!,
        filename: filename,
        fieldName: 'image',
        timeout: ApiConfig.cropDiagnosisTimeout,
      );

      final diagnosis = CropDiagnosisModel.fromJson(response);
      _currentDiagnosis = diagnosis;
      _history.insert(0, diagnosis);
      _isAnalyzing = false;
      notifyListeners();

      // Check spray weather check in background
      checkSprayWeather();
    } catch (e) {
      _isAnalyzing = false;
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
    }
  }

  /// Check conservative spray weather window for farmer's location
  Future<void> checkSprayWeather({
    double latitude = 19.0760,
    double longitude = 72.8777,
  }) async {
    _isLoadingWeather = true;
    _weatherError = null;
    notifyListeners();

    try {
      final response = await _api.get(
        '/api/crop-weather',
        queryParams: {
          'latitude': latitude.toString(),
          'longitude': longitude.toString(),
        },
      );
      _sprayWeather = SprayWeatherModel.fromJson(response);
      _isLoadingWeather = false;
      notifyListeners();
    } catch (e) {
      _isLoadingWeather = false;
      _weatherError = 'Weather forecast unavailable';
      notifyListeners();
    }
  }

  /// Add recommended treatments to the farm advisory calendar
  Future<bool> scheduleTreatments() async {
    if (_currentDiagnosis == null) return false;

    try {
      final now = DateTime.now();
      for (int i = 0; i < _currentDiagnosis!.treatment.length; i++) {
        final step = _currentDiagnosis!.treatment[i];
        final eventDate = now.add(Duration(days: (i + 1) * 2));
        final dateString =
            "${eventDate.year.toString().padLeft(4, '0')}-${eventDate.month.toString().padLeft(2, '0')}-${eventDate.day.toString().padLeft(2, '0')}";

        await _api.post('/api/farm-calendar', {
          'event_date': dateString,
          'title': step.title,
          'detail': step.detail,
          'kind': step.kind == 'spray' ? 'treatment' : 'check',
          'crop': _currentDiagnosis!.crop,
          'origin': 'diagnosis',
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  }
}
