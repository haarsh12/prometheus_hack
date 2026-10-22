import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarPlus,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CloudSun,
  FlaskConical,
  ImagePlus,
  Leaf,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
  Sprout,
  Upload,
  X,
} from 'lucide-react'

import { CameraCapture } from './CameraCapture'
import {
  CROPS,
  GROWTH_STAGES,
  cropRuntimeStatus,
  CropModelUnavailableError,
  diagnoseLeaf,
  type CropDiagnosis,
  type CropName,
  type GrowthStage,
} from '../lib/crop-diagnosis'
import { saveDiagnosis, scheduleDiagnosisPlan } from '../lib/crop-ledger'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function confidence(value: number): string {
  return `${Math.round(value * 100)}%`
}

function dateForDisplay(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function CropAnalyzer({ onOpenCalendar }: { onOpenCalendar: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<CropName>('Tomato')
  const [growthStage, setGrowthStage] = useState<GrowthStage>('Vegetative')
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [diagnosis, setDiagnosis] = useState<CropDiagnosis | null>(null)
  const [isPlanSaved, setIsPlanSaved] = useState(false)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  function selectImage(nextFile: File): void {
    if (!nextFile.type.startsWith('image/')) {
      setError('Choose a JPG, PNG, WebP or other image file.')
      return
    }
    if (nextFile.size > MAX_IMAGE_BYTES) {
      setError('Choose a leaf photo smaller than 10 MB.')
      return
    }
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(nextFile)
    })
    setFile(nextFile)
    setDiagnosis(null)
    setIsPlanSaved(false)
    setError(null)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextFile = event.target.files?.[0]
    if (nextFile) selectImage(nextFile)
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault()
    const nextFile = event.dataTransfer.files?.[0]
    if (nextFile) selectImage(nextFile)
  }

  async function analyze(): Promise<void> {
    if (!file) {
      setError('Take or upload a clear leaf photo first.')
      return
    }
    setError(null)
    setDiagnosis(null)
    setIsPlanSaved(false)
    setIsAnalyzing(true)
    try {
      const result = await diagnoseLeaf(file, crop, growthStage, setProgress)
      setDiagnosis(result)
      saveDiagnosis(result)
    } catch (caughtError) {
      setError(caughtError instanceof CropModelUnavailableError
        ? caughtError.message
        : 'The photo could not be analysed. Check the image and model setup, then try again.')
    } finally {
      setIsAnalyzing(false)
      setProgress('')
    }
  }

  function addPlanToCalendar(): void {
    if (!diagnosis) return
    scheduleDiagnosisPlan(diagnosis)
    setIsPlanSaved(true)
  }

  return (
    <main className="crop-analyzer-page">
      <section className="crop-analyzer-hero">
        <div>
          <p className="section-kicker">Precision crop health</p>
          <h1>See the stress. Act at the right time.</h1>
          <p>Capture one clear leaf photo to screen for disease, pest injury, nutrient stress and water stress. ShetiMitra keeps the diagnosis, next steps and follow-up together.</p>
        </div>
        <aside className="crop-analyzer-hero__weather">
          <CloudSun size={24} aria-hidden="true" />
          <div><span>Spray-window check</span><strong>Connect weather to activate</strong></div>
          <small>Rain, wind and heat checks are applied before a plan is scheduled.</small>
        </aside>
      </section>

      <section className={`runtime-notice ${cropRuntimeStatus.ready ? 'runtime-notice--ready' : ''}`}>
        <span>{cropRuntimeStatus.ready ? <ShieldCheck size={19} /> : <CircleAlert size={19} />}</span>
        <div><strong>{cropRuntimeStatus.ready ? `${cropRuntimeStatus.modelName} is ready on this device.` : 'Model setup required for live diagnosis.'}</strong><p>{cropRuntimeStatus.ready ? 'Your leaf image is processed in this browser. A segmentation result appears only when the validated YOLOv8-seg model is also configured.' : 'Add a trained ONNX crop classifier and its ordered labels with VITE_CROP_MODEL_URL and VITE_CROP_MODEL_LABELS. The interface will not make up a diagnosis without one.'}</p></div>
      </section>

      <section className="analyzer-workspace" aria-label="Leaf image diagnosis">
        <div className="analyzer-capture-card">
          <div className="analyzer-card-heading"><div><p className="section-kicker">1 · Capture</p><h2>Take a leaf photo</h2></div><span className="analyzer-step-number">01</span></div>
          <p className="analyzer-helper">Use daylight, frame one leaf against a plain background, and include both the spot and a healthy edge if possible.</p>
          <input accept="image/*" capture="environment" hidden onChange={handleFileChange} ref={inputRef} type="file" />
          {previewUrl ? (
            <div className="leaf-preview">
              <img alt="Selected leaf for analysis" src={previewUrl} />
              <button aria-label="Remove selected photo" className="leaf-preview__remove" onClick={() => { setFile(null); setDiagnosis(null); setPreviewUrl(null) }} type="button"><X size={18} /></button>
              <span><CheckCircle2 size={16} /> Photo ready</span>
            </div>
          ) : (
            <button className="leaf-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} type="button">
              <span><ImagePlus size={29} /></span><strong>Drop a leaf photo here</strong><small>JPG, PNG or WebP · up to 10 MB</small>
            </button>
          )}
          <div className="capture-actions"><button className="primary-action" onClick={() => setIsCameraOpen(true)} type="button"><Camera size={17} /> Open camera</button><button className="secondary-action" onClick={() => inputRef.current?.click()} type="button"><Upload size={16} /> Upload photo</button></div>
        </div>

        <div className="analyzer-context-card">
          <div className="analyzer-card-heading"><div><p className="section-kicker">2 · Context</p><h2>Tell us about this leaf</h2></div><span className="analyzer-step-number">02</span></div>
          <label className="analyzer-field">Crop<select onChange={(event) => setCrop(event.target.value as CropName)} value={crop}>{CROPS.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label className="analyzer-field">Growth stage<select onChange={(event) => setGrowthStage(event.target.value as GrowthStage)} value={growthStage}>{GROWTH_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
          <div className="analyzer-checklist"><span><Leaf size={16} /> Photograph more than one plant.</span><span><Sprout size={16} /> Note irrigation and recent rainfall.</span><span><FlaskConical size={16} /> Do not spray based on one uncertain photo.</span></div>
          <button className="analyze-button" disabled={!file || isAnalyzing} onClick={() => void analyze()} type="button">{isAnalyzing ? <LoaderCircle className="spin" size={19} /> : <ScanLine size={19} />}{isAnalyzing ? progress || 'Analysing…' : 'Analyse leaf with ShetiMitra'}<ChevronRight size={17} /></button>
          {error && <p className="analyzer-error" role="alert"><AlertTriangle size={17} /> {error}</p>}
        </div>
      </section>

      {diagnosis && <DiagnosisReport diagnosis={diagnosis} isPlanSaved={isPlanSaved} onAddPlan={addPlanToCalendar} onOpenCalendar={onOpenCalendar} />}
      <CameraCapture isOpen={isCameraOpen} onCapture={selectImage} onClose={() => setIsCameraOpen(false)} />
    </main>
  )
}

function DiagnosisReport({ diagnosis, isPlanSaved, onAddPlan, onOpenCalendar }: { diagnosis: CropDiagnosis; isPlanSaved: boolean; onAddPlan: () => void; onOpenCalendar: () => void }) {
  return (
    <section className="diagnosis-report" aria-live="polite">
      <header className="diagnosis-report__header"><div><p className="section-kicker">3 · Field guidance</p><h2>Your crop-health report</h2><p>Analysed {dateForDisplay(diagnosis.capturedAt)} · {diagnosis.crop} · {diagnosis.growthStage}</p></div><span className={`risk-badge risk-badge--${diagnosis.risk.toLowerCase()}`}>{diagnosis.risk} attention</span></header>
      <div className="diagnosis-metrics">
        <article><span>Likely pattern</span><strong>{diagnosis.label}</strong><small>{diagnosis.modelName}</small></article>
        <article><span>Model confidence</span><strong>{confidence(diagnosis.confidence)}</strong><small>Use as a screening signal, not a lab confirmation.</small></article>
        <article><span>Affected leaf area</span><strong>{diagnosis.affectedLeafArea === null ? '—' : `${diagnosis.affectedLeafArea}%`}</strong><small>{diagnosis.affectedLeafArea === null ? 'Connect validated lesion segmentation to calculate this.' : 'Calculated by segmentation.'}</small></article>
      </div>
      <div className="diagnosis-report__grid">
        <article className="diagnosis-summary"><h3>What to check now</h3><p>{diagnosis.summary}</p>{diagnosis.alternatives.length > 0 && <div className="alternative-predictions"><span>Also considered</span>{diagnosis.alternatives.map((item) => <b key={item.label}>{item.label} <em>{confidence(item.confidence)}</em></b>)}</div>}</article>
        <article className="weather-safety"><CloudSun size={22} /><div><h3>Weather safety gate</h3><p>Before any spray, check the next 6–12 hours for rain, high wind or heat. A weather provider must be connected to confirm the window for your field.</p></div></article>
      </div>
      <div className="treatment-plan"><div><p className="section-kicker">Suggested treatment path</p><h3>Start with the lowest-risk effective action.</h3></div><ol>{diagnosis.treatment.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{step.title}</h4><p>{step.detail}</p></div><small>{step.timing}</small></li>)}</ol></div>
      <div className="diagnosis-report__footer"><p><ShieldCheck size={17} /> This is decision support. Confirm uncertain, severe or spreading symptoms with your local agriculture officer before applying pesticides.</p><div>{isPlanSaved ? <button className="secondary-action" onClick={onOpenCalendar} type="button">View advisory calendar <ChevronRight size={16} /></button> : <button className="primary-action" onClick={onAddPlan} type="button"><CalendarPlus size={17} /> Add plan to calendar</button>}</div></div>
    </section>
  )
}
