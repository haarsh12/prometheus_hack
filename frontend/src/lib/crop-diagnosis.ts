import type { InferenceSession, Tensor } from 'onnxruntime-web'

export const CROPS = ['Cotton', 'Wheat', 'Paddy', 'Soybean', 'Tomato'] as const
export const GROWTH_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting / grain fill', 'Maturity'] as const

export type CropName = (typeof CROPS)[number]
export type GrowthStage = (typeof GROWTH_STAGES)[number]

export type TreatmentStep = {
  title: string
  detail: string
  timing: string
  kind: 'observe' | 'bio' | 'spray' | 'field'
}

export type SymptomBox = {
  label: string
  x: number
  y: number
  width: number
  height: number
}

export type CropDiagnosis = {
  id: string
  crop: CropName
  growthStage: GrowthStage
  label: string
  confidence: number
  alternatives: Array<{ label: string; confidence: number }>
  risk: 'Low' | 'Moderate' | 'High'
  category: 'healthy' | 'fungal' | 'pest' | 'nutrient' | 'water' | 'unknown'
  summary: string
  observations: string[]
  symptomBoxes: SymptomBox[]
  treatment: TreatmentStep[]
  followUpDays: number
  caution: string
  modelName: string
  affectedLeafArea: number | null
  capturedAt: string
  saved?: boolean
}

export class CropModelUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CropModelUnavailableError'
  }
}

type RuntimeProgress = (message: string) => void

const DEFAULT_LABELS = [
  'Healthy leaf',
  'Fungal leaf spot',
  'Early blight',
  'Late blight',
  'Powdery mildew',
  'Rust',
  'Leaf miner / pest damage',
  'Nitrogen deficiency',
  'Potassium deficiency',
  'Water stress',
]

const configuredModelUrl = import.meta.env.VITE_CROP_MODEL_URL?.trim()
const configuredLabels = (import.meta.env.VITE_CROP_MODEL_LABELS as string | undefined)?.split(',').map((label: string) => label.trim()).filter(Boolean)
const configuredModelName = import.meta.env.VITE_CROP_MODEL_NAME?.trim() || 'ONNX Runtime Web classifier'

export const cropRuntimeStatus = {
  // Gemini Vision is the default live path. The optional ONNX configuration
  // remains available only for a separately validated local crop model.
  ready: true,
  modelName: 'Gemini Vision',
  localOnnxReady: Boolean(configuredModelUrl),
  localOnnxModelName: configuredModelName,
  segmentationReady: Boolean(import.meta.env.VITE_CROP_SEGMENTATION_MODEL_URL?.trim()),
}

function treatmentFor(label: string): Omit<CropDiagnosis, 'id' | 'crop' | 'growthStage' | 'label' | 'confidence' | 'alternatives' | 'modelName' | 'affectedLeafArea' | 'capturedAt'> {
  const key = label.toLowerCase()
  if (key.includes('healthy')) {
    return {
      risk: 'Low',
      category: 'healthy',
      summary: 'No disease pattern was detected by the configured classifier. Continue routine scouting and compare another leaf if symptoms are visible in the field.',
      observations: [],
      symptomBoxes: [],
      treatment: [
        { title: 'Scout the crop', detail: 'Inspect five plants in each field section, including the underside of leaves.', timing: 'Every 5–7 days', kind: 'observe' },
        { title: 'Keep foliage dry', detail: 'Water at the soil line in the morning and maintain crop-appropriate spacing for airflow.', timing: 'Routine', kind: 'field' },
      ],
      followUpDays: 7,
      caution: 'Compare more than one plant if you can see a symptom in the field.',
    }
  }
  if (key.includes('nitrogen') || key.includes('potassium') || key.includes('deficiency')) {
    const nutrient = key.includes('potassium') ? 'potassium' : 'nitrogen'
    return {
      risk: 'Moderate',
      category: 'nutrient',
      summary: `The leaf pattern is consistent with possible ${nutrient} stress. Confirm with a soil or tissue test before applying fertiliser, especially where drought or root damage may mimic deficiency.`,
      observations: [],
      symptomBoxes: [],
      treatment: [
        { title: 'Confirm before feeding', detail: 'Check the pattern across young and old leaves and use a local soil/tissue test where available.', timing: 'Within 2 days', kind: 'observe' },
        { title: 'Correct the root-zone cause', detail: 'Restore even soil moisture and check drainage; nutrient uptake drops sharply in waterlogged or very dry soil.', timing: 'Today', kind: 'field' },
        { title: 'Use a local recommendation', detail: 'Apply only the dose prescribed for this crop, growth stage and soil test by an extension officer or soil-health card.', timing: 'After confirmation', kind: 'spray' },
      ],
      followUpDays: 5,
      caution: 'Do not use a leaf photo alone to decide a fertiliser dose.',
    }
  }
  if (key.includes('pest') || key.includes('miner') || key.includes('insect')) {
    return {
      risk: 'Moderate',
      category: 'pest',
      summary: 'The classifier found a pest-damage pattern. Inspect live insects and the underside of affected leaves before selecting a control; leaf injury alone does not identify the pest species.',
      observations: [],
      symptomBoxes: [],
      treatment: [
        { title: 'Check the action threshold', detail: 'Count affected plants in five representative spots and photograph any insects, eggs or frass.', timing: 'Today', kind: 'observe' },
        { title: 'Start with lower-cost IPM', detail: 'Remove heavily infested leaves where practical, conserve beneficial insects and use crop-specific traps or biocontrol recommended locally.', timing: 'Today–tomorrow', kind: 'bio' },
        { title: 'Escalate only if threshold is crossed', detail: 'Select a locally registered crop-and-pest product and follow its label dose, PPE and pre-harvest interval exactly.', timing: 'After field confirmation', kind: 'spray' },
      ],
      followUpDays: 3,
      caution: 'Confirm the pest on several plants before selecting a control.',
    }
  }
  if (key.includes('water') || key.includes('wilt')) {
    return {
      risk: 'Moderate',
      category: 'water',
      summary: 'The image may show water stress. Check soil moisture at root depth and inspect for root disease before increasing irrigation.',
      observations: [],
      symptomBoxes: [],
      treatment: [
        { title: 'Measure root-zone moisture', detail: 'Check 10–15 cm below the surface at several points rather than judging only the topsoil.', timing: 'Today', kind: 'observe' },
        { title: 'Irrigate evenly', detail: 'Use a short, early-morning irrigation when soil is dry. Avoid waterlogging and avoid peak afternoon irrigation.', timing: 'If soil is dry', kind: 'field' },
        { title: 'Mulch exposed soil', detail: 'Use locally available clean organic mulch to reduce evaporation and keep moisture more stable.', timing: 'This week', kind: 'bio' },
      ],
      followUpDays: 2,
      caution: 'Do not increase irrigation until root-zone moisture is checked.',
    }
  }
  return {
    risk: 'High',
    category: 'fungal',
    summary: 'The classifier found a disease-like leaf pattern. Confirm the symptom across multiple plants before treatment and act early to limit spread.',
    observations: [],
    symptomBoxes: [],
    treatment: [
      { title: 'Isolate the hotspot', detail: 'Mark the affected area, avoid handling healthy plants after diseased plants, and clean tools between rows.', timing: 'Today', kind: 'field' },
      { title: 'Reduce leaf wetness', detail: 'Avoid overhead irrigation late in the day and improve airflow through crop-appropriate spacing and weed control.', timing: 'Today', kind: 'field' },
      { title: 'Use preventive biocontrol first', detail: 'Use only locally recommended biological treatments for the crop and disease. Follow the product label and local extension advice.', timing: 'Early morning / late afternoon', kind: 'bio' },
      { title: 'Use a registered product only if needed', detail: 'If symptoms spread after confirmation, ask an agriculture officer for a crop-specific registered option and label dose. Never mix products without advice.', timing: 'Dry weather window', kind: 'spray' },
    ],
    followUpDays: 3,
    caution: 'A classifier result is screening only; confirm severe or spreading symptoms locally.',
  }
}

async function preprocessImage(image: File): Promise<Float32Array> {
  const bitmap = await createImageBitmap(image)
  const canvas = document.createElement('canvas')
  canvas.width = 224
  canvas.height = 224
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new CropModelUnavailableError('This browser cannot prepare an image for the crop model.')
  context.drawImage(bitmap, 0, 0, 224, 224)
  bitmap.close()
  const pixels = context.getImageData(0, 0, 224, 224).data
  const tensor = new Float32Array(3 * 224 * 224)
  const plane = 224 * 224
  for (let index = 0; index < plane; index += 1) {
    const pixel = index * 4
    tensor[index] = (pixels[pixel] / 255 - 0.485) / 0.229
    tensor[plane + index] = (pixels[pixel + 1] / 255 - 0.456) / 0.224
    tensor[plane * 2 + index] = (pixels[pixel + 2] / 255 - 0.406) / 0.225
  }
  return tensor
}

function softmax(values: number[]): number[] {
  const max = Math.max(...values)
  const exponentials = values.map((value) => Math.exp(value - max))
  const total = exponentials.reduce((sum, value) => sum + value, 0)
  return exponentials.map((value) => value / total)
}

function asScores(tensor: Tensor): number[] {
  const values = Array.from(tensor.data as Float32Array | Float64Array | Int32Array)
  if (values.length < 2) throw new CropModelUnavailableError('The crop model returned an invalid classification result.')
  return softmax(values)
}

async function createSession(): Promise<InferenceSession> {
  if (!configuredModelUrl) {
    throw new CropModelUnavailableError('No trained crop model is configured yet. Add VITE_CROP_MODEL_URL and VITE_CROP_MODEL_LABELS to enable real on-device diagnosis.')
  }
  const ort = await import('onnxruntime-web')
  ort.env.wasm.numThreads = Math.min(2, navigator.hardwareConcurrency || 1)
  return ort.InferenceSession.create(configuredModelUrl, { executionProviders: ['wasm'] })
}

export async function diagnoseLeaf(
  image: File,
  crop: CropName,
  growthStage: GrowthStage,
  onProgress?: RuntimeProgress,
): Promise<CropDiagnosis> {
  onProgress?.('Loading crop-health model…')
  const session = await createSession()
  if (session.inputNames.length !== 1) throw new CropModelUnavailableError('The crop model must expose one image input for browser inference.')

  onProgress?.('Preparing leaf image…')
  const imageTensor = await preprocessImage(image)
  const ort = await import('onnxruntime-web')
  const input = new ort.Tensor('float32', imageTensor, [1, 3, 224, 224])
  onProgress?.('Running on-device diagnosis…')
  const outputs = await session.run({ [session.inputNames[0]]: input })
  const outputName = session.outputNames[0]
  const output = outputs[outputName]
  if (!output) throw new CropModelUnavailableError('The crop model did not return a prediction.')
  const scores = asScores(output)
  const labels = configuredLabels?.length ? configuredLabels : DEFAULT_LABELS
  if (labels.length !== scores.length) {
    throw new CropModelUnavailableError(`Model output has ${scores.length} classes but VITE_CROP_MODEL_LABELS has ${labels.length}. Update the label order to match the exported model.`)
  }
  const ordered = scores.map((confidence, index) => ({ label: labels[index], confidence })).sort((a, b) => b.confidence - a.confidence)
  const primary = ordered[0]
  const plan = treatmentFor(primary.label)
  onProgress?.('Building a field-safe care plan…')

  return {
    id: crypto.randomUUID(),
    crop,
    growthStage,
    label: primary.label,
    confidence: primary.confidence,
    alternatives: ordered.slice(1, 3),
    ...plan,
    modelName: configuredModelName,
    // A classifier cannot honestly calculate affected area. This value is
    // populated only when a separately validated lesion-segmentation model is
    // connected; the UI explains that requirement instead of inventing a %.
    affectedLeafArea: null,
    capturedAt: new Date().toISOString(),
  }
}
