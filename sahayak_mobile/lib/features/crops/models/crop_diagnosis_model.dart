class TreatmentStepModel {
  final String title;
  final String detail;
  final String timing;
  final String kind; // 'observe' | 'bio' | 'spray' | 'field'

  const TreatmentStepModel({
    required this.title,
    required this.detail,
    required this.timing,
    required this.kind,
  });

  factory TreatmentStepModel.fromJson(Map<String, dynamic> json) {
    return TreatmentStepModel(
      title: json['title']?.toString() ?? '',
      detail: json['detail']?.toString() ?? '',
      timing: json['timing']?.toString() ?? '',
      kind: json['kind']?.toString() ?? 'observe',
    );
  }

  Map<String, dynamic> toJson() => {
    'title': title,
    'detail': detail,
    'timing': timing,
    'kind': kind,
  };
}

class SymptomBoxModel {
  final String label;
  final double x;
  final double y;
  final double width;
  final double height;

  const SymptomBoxModel({
    required this.label,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
  });

  factory SymptomBoxModel.fromJson(Map<String, dynamic> json) {
    return SymptomBoxModel(
      label: json['label']?.toString() ?? '',
      x: (json['x'] as num?)?.toDouble() ?? 0.0,
      y: (json['y'] as num?)?.toDouble() ?? 0.0,
      width: (json['width'] as num?)?.toDouble() ?? 0.0,
      height: (json['height'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'label': label,
    'x': x,
    'y': y,
    'width': width,
    'height': height,
  };
}

class CropDiagnosisModel {
  final String id;
  final String crop;
  final String growthStage;
  final String label;
  final double confidence;
  final String severity; // Low, Moderate, High
  final String category; // healthy, fungal, pest, nutrient, water, unknown
  final String summary;
  final List<String> observations;
  final List<SymptomBoxModel> boxes;
  final List<TreatmentStepModel> treatment;
  final int followupDays;
  final String caution;
  final String modelName;
  final double? affectedLeafAreaPercent;
  final DateTime capturedAt;
  final bool saved;

  const CropDiagnosisModel({
    required this.id,
    required this.crop,
    required this.growthStage,
    required this.label,
    required this.confidence,
    required this.severity,
    required this.category,
    required this.summary,
    required this.observations,
    required this.boxes,
    required this.treatment,
    required this.followupDays,
    required this.caution,
    required this.modelName,
    this.affectedLeafAreaPercent,
    required this.capturedAt,
    this.saved = false,
  });

  factory CropDiagnosisModel.fromJson(Map<String, dynamic> json) {
    List<String> parseList(dynamic val) {
      if (val is List) return val.map((e) => e.toString()).toList();
      return [];
    }

    List<TreatmentStepModel> parseTreatment(dynamic val) {
      if (val is List) {
        return val
            .whereType<Map>()
            .map((e) => TreatmentStepModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      return [];
    }

    List<SymptomBoxModel> parseBoxes(dynamic val) {
      if (val is List) {
        return val
            .whereType<Map>()
            .map((e) => SymptomBoxModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      return [];
    }

    DateTime parseDate(dynamic val) {
      if (val is String) {
        return DateTime.tryParse(val) ?? DateTime.now();
      }
      return DateTime.now();
    }

    return CropDiagnosisModel(
      id: json['id']?.toString() ?? '',
      crop: json['crop']?.toString() ?? json['identified_crop']?.toString() ?? 'Crop',
      growthStage: json['growth_stage']?.toString() ?? json['identified_growth_stage']?.toString() ?? '',
      label: json['label']?.toString() ?? 'Unknown condition',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      severity: json['severity']?.toString() ?? 'Moderate',
      category: json['category']?.toString() ?? 'unknown',
      summary: json['summary']?.toString() ?? '',
      observations: parseList(json['observations']),
      boxes: parseBoxes(json['boxes'] ?? json['symptom_boxes']),
      treatment: parseTreatment(json['treatment']),
      followupDays: (json['followup_days'] as num?)?.toInt() ?? 5,
      caution: json['caution']?.toString() ?? '',
      modelName: json['model_name']?.toString() ?? 'ShetiMitra CropVision',
      affectedLeafAreaPercent: (json['affected_leaf_area_percent'] as num?)?.toDouble(),
      capturedAt: parseDate(json['captured_at']),
      saved: json['saved'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'crop': crop,
    'growth_stage': growthStage,
    'label': label,
    'confidence': confidence,
    'severity': severity,
    'category': category,
    'summary': summary,
    'observations': observations,
    'boxes': boxes.map((e) => e.toJson()).toList(),
    'treatment': treatment.map((e) => e.toJson()).toList(),
    'followup_days': followupDays,
    'caution': caution,
    'model_name': modelName,
    'affected_leaf_area_percent': affectedLeafAreaPercent,
    'captured_at': capturedAt.toIso8601String(),
    'saved': saved,
  };
}
