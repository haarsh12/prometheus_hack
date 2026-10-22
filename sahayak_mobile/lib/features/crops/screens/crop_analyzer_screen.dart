import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/premium_button.dart';
import '../../../shared/widgets/premium_card.dart';
import '../providers/crop_provider.dart';
import '../models/crop_diagnosis_model.dart';
import '../models/spray_weather_model.dart';

class CropAnalyzerScreen extends StatefulWidget {
  const CropAnalyzerScreen({super.key});

  @override
  State<CropAnalyzerScreen> createState() => _CropAnalyzerScreenState();
}

class _CropAnalyzerScreenState extends State<CropAnalyzerScreen> {
  final ImagePicker _picker = ImagePicker();
  bool _isScheduling = false;
  String? _scheduleSuccessMessage;

  Future<void> _pickImage(ImageSource source) async {
    final provider = context.read<CropProvider>();
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );
      if (image != null) {
        setState(() => _scheduleSuccessMessage = null);
        await provider.setImage(image);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to select image: $e')),
      );
    }
  }

  Color _severityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'high':
        return Colors.red.shade700;
      case 'moderate':
        return Colors.orange.shade800;
      case 'low':
      default:
        return const Color(0xFF10B981);
    }
  }

  Color _stepKindColor(String kind) {
    switch (kind.toLowerCase()) {
      case 'spray':
        return Colors.blue.shade700;
      case 'bio':
        return const Color(0xFF059669);
      case 'field':
        return Colors.amber.shade800;
      case 'observe':
      default:
        return Colors.purple.shade700;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CropProvider>();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.eco_rounded, color: Color(0xFF059669), size: 20),
            ),
            const SizedBox(width: 10),
            const Text(
              'Crop Analyzer',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 19),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline_rounded),
            tooltip: 'How to take a photo',
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Taking Leaf Photos'),
                  content: const Text(
                    '1. Hold the camera steady in good daylight.\n'
                    '2. Focus on a single leaf showing symptoms.\n'
                    '3. Avoid heavy shadows or blurry angles.\n'
                    '4. Select crop type and stage for highest accuracy.',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Got it'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Kicker Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.psychology_outlined, color: Color(0xFF166534), size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'ShetiMitra CropVision: On-device & AI leaf disease screening',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.green.shade900,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Image Selection Card
            _buildImageCard(provider),
            const SizedBox(height: 16),

            // Crop Context Selectors
            _buildContextSelectors(provider),
            const SizedBox(height: 16),

            // Analyze Action Button
            if (provider.selectedFile != null && provider.currentDiagnosis == null)
              PremiumButton(
                text: 'Analyse Crop Leaf',
                icon: Icons.search_rounded,
                isLoading: provider.isAnalyzing,
                onPressed: provider.isAnalyzing ? null : () => provider.analyzeCrop(),
              ),

            // Error display
            if (provider.errorMessage != null)
              Container(
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        provider.errorMessage!,
                        style: TextStyle(color: Colors.red.shade800, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),

            // Diagnosis Result Section
            if (provider.currentDiagnosis != null) ...[
              const SizedBox(height: 20),
              _buildDiagnosisCard(provider.currentDiagnosis!),
              const SizedBox(height: 16),
              _buildTreatmentCard(provider),
              const SizedBox(height: 16),
              _buildWeatherCard(provider),
            ],

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildImageCard(CropProvider provider) {
    if (provider.imageBytes != null) {
      return Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            Image.memory(
              provider.imageBytes!,
              height: 240,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: CircleAvatar(
                backgroundColor: Colors.black54,
                radius: 18,
                child: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 18),
                  padding: EdgeInsets.zero,
                  onPressed: () => provider.clearImage(),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1.5),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(
              Icons.add_a_photo_outlined,
              size: 36,
              color: Color(0xFF059669),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Upload a Leaf Photo',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          const Text(
            'Take a clear picture of an affected crop leaf to detect disease and pests early.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppColors.muted),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_outlined, size: 18),
                  label: const Text('Camera'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _pickImage(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library_outlined, size: 18),
                  label: const Text('Gallery'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildContextSelectors(CropProvider provider) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Field Context (Optional)',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: provider.selectedCrop,
                  decoration: InputDecoration(
                    labelText: 'Crop',
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: CropProvider.supportedCrops.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                  onChanged: (val) => provider.setSelectedCrop(val),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: provider.selectedGrowthStage,
                  decoration: InputDecoration(
                    labelText: 'Stage',
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: CropProvider.growthStages.map((s) => DropdownMenuItem(value: s, child: Text(s, overflow: TextOverflow.ellipsis))).toList(),
                  onChanged: (val) => provider.setSelectedGrowthStage(val),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDiagnosisCard(CropDiagnosisModel diagnosis) {
    final sevColor = _severityColor(diagnosis.severity);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: sevColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${diagnosis.severity} Severity',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: sevColor,
                  ),
                ),
              ),
              Text(
                '${(diagnosis.confidence * 100).toStringAsFixed(0)}% Confidence',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.muted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            diagnosis.label,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: AppColors.ink,
              letterSpacing: -0.5,
            ),
          ),
          if (diagnosis.crop.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                '${diagnosis.crop} • ${diagnosis.growthStage}',
                style: const TextStyle(fontSize: 13, color: AppColors.muted),
              ),
            ),
          const SizedBox(height: 12),
          Text(
            diagnosis.summary,
            style: const TextStyle(fontSize: 14, color: AppColors.textPrimary, height: 1.45),
          ),
          if (diagnosis.observations.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Divider(color: AppColors.line),
            const SizedBox(height: 8),
            const Text(
              'Key Observations:',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            ...diagnosis.observations.map(
              (obs) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                    Expanded(
                      child: Text(obs, style: const TextStyle(fontSize: 13, color: AppColors.muted)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTreatmentCard(CropProvider provider) {
    final diagnosis = provider.currentDiagnosis!;
    if (diagnosis.treatment.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.healing_rounded, color: Color(0xFF059669), size: 20),
              const SizedBox(width: 8),
              const Text(
                'Recommended Treatment Path',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...diagnosis.treatment.map((step) {
            final kindColor = _stepKindColor(step.kind);
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: kindColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          step.kind.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: kindColor,
                          ),
                        ),
                      ),
                      if (step.timing.isNotEmpty)
                        Text(
                          step.timing,
                          style: const TextStyle(fontSize: 11, color: AppColors.muted),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    step.title,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    step.detail,
                    style: const TextStyle(fontSize: 13, color: AppColors.muted, height: 1.4),
                  ),
                ],
              ),
            );
          }),

          const SizedBox(height: 12),
          // Action to schedule
          if (_scheduleSuccessMessage != null)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Colors.green, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _scheduleSuccessMessage!,
                      style: TextStyle(color: Colors.green.shade900, fontSize: 13),
                    ),
                  ),
                ],
              ),
            )
          else
            ElevatedButton.icon(
              onPressed: _isScheduling
                  ? null
                  : () async {
                      setState(() => _isScheduling = true);
                      final success = await provider.scheduleTreatments();
                      setState(() {
                        _isScheduling = false;
                        _scheduleSuccessMessage = success
                            ? 'Treatments added to your Advisory Calendar!'
                            : 'Follow-ups scheduled on this device.';
                      });
                    },
              icon: _isScheduling
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.calendar_month_outlined, size: 18),
              label: Text(_isScheduling ? 'Scheduling...' : 'Add Steps to Advisory Calendar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.ink,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildWeatherCard(CropProvider provider) {
    final weather = provider.sprayWeather;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.cloud_sync_outlined, color: Colors.blueAccent, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Spray Weather Safety Gate',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (provider.isLoadingWeather)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            )
          else if (weather != null) ...[
            Container(
              margin: const EdgeInsets.symmetric(vertical: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: weather.isSafe
                    ? Colors.green.shade50
                    : (weather.isCaution ? Colors.amber.shade50 : Colors.red.shade50),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: weather.isSafe
                      ? Colors.green.shade200
                      : (weather.isCaution ? Colors.amber.shade200 : Colors.red.shade200),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    weather.isSafe
                        ? Icons.check_circle_rounded
                        : (weather.isCaution ? Icons.warning_amber_rounded : Icons.cancel_rounded),
                    color: weather.isSafe
                        ? Colors.green.shade700
                        : (weather.isCaution ? Colors.amber.shade900 : Colors.red.shade700),
                    size: 24,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Spray Status: ${weather.status.toUpperCase()}',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                            color: weather.isSafe
                                ? Colors.green.shade900
                                : (weather.isCaution ? Colors.amber.shade900 : Colors.red.shade900),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          weather.summary,
                          style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Row(
              children: [
                if (weather.temperatureC != null)
                  Expanded(
                    child: _metricBox('Temp', '${weather.temperatureC!.toStringAsFixed(1)}°C', Icons.thermostat),
                  ),
                const SizedBox(width: 8),
                if (weather.windMps != null)
                  Expanded(
                    child: _metricBox('Wind', '${weather.windMps!.toStringAsFixed(1)} m/s', Icons.air),
                  ),
                const SizedBox(width: 8),
                Expanded(
                  child: _metricBox(
                    'Rain',
                    weather.rainExpected ? 'Expected' : 'None',
                    weather.rainExpected ? Icons.water_drop : Icons.wb_sunny_outlined,
                  ),
                ),
              ],
            ),
          ] else
            Text(
              provider.weatherError ?? 'Weather safety status available when GPS is accessible.',
              style: const TextStyle(fontSize: 12, color: AppColors.muted),
            ),
        ],
      ),
    );
  }

  Widget _metricBox(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Icon(icon, size: 16, color: AppColors.muted),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.muted)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
