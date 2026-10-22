import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarPlus,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CloudSun,
  Eye,
  FlaskConical,
  ImagePlus,
  Leaf,
  LoaderCircle,
  MapPin,
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
  type CropDiagnosis,
  type CropName,
  type GrowthStage,
} from '../lib/crop-diagnosis'
import { buildDiagnosisPlan, saveCalendarEntries, saveDiagnosis } from '../lib/crop-ledger'
import {
  analyzeCropImage,
  createFarmCalendarEvent,
  getCropWeather,
  type CropWeatherCheck,
} from '../lib/api'

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
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [isPlanSaved, setIsPlanSaved] = useState(false)
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null)
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [weather, setWeather] = useState<CropWeatherCheck | null>(null)
  const [weatherNotice, setWeatherNotice] = useState<string | null>(null)
  const [isWeatherLoading, setIsWeatherLoading] = useState(false)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  function selectImage(nextFile: File): void {
    if (!nextFile.type.startsWith('image/')) {
      setError('Choose a JPG, PNG or WebP leaf photo.')
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
    setScheduleNotice(null)
    setError(null)
  }

  function removePhoto(): void {
    setFile(null)
    setDiagnosis(null)
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
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
    setScheduleNotice(null)
    setIsAnalyzing(true)
    setProgress('Sending your original photo for Gemini Vision screening…')
    try {
      const result = await analyzeCropImage(file, crop, growthStage)
      setDiagnosis(result)
      saveDiagnosis(result)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The photo could not be analysed. Use a clearer leaf photo and try again.')
    } finally {
      setIsAnalyzing(false)
      setProgress('')
    }
  }

  async function confirmPlan(): Promise<void> {
    if (!diagnosis) return
    const entries = buildDiagnosisPlan(diagnosis)
    setIsSavingPlan(true)
    try {
      await Promise.all(entries.map((entry) => createFarmCalendarEvent({
        event_date: entry.date,
        title: entry.title,
        detail: entry.detail,
        kind: entry.kind,
        crop: entry.crop ?? undefined,
        origin: 'diagnosis',
      })))
      setScheduleNotice(`${entries.length} diagnosis follow-ups were added to your signed-in farm calendar.`)
    } catch {
      // A guest can still retain a plan on this device. The calendar makes the
      // scope clear and the server is retried on a later signed-in action.
      saveCalendarEntries(entries)
      setScheduleNotice(`${entries.length} follow-ups were saved on this device. Sign in to keep them with your farm account.`)
    } finally {
      setIsSavingPlan(false)
      setIsScheduleOpen(false)
      setIsPlanSaved(true)
    }
  }

  function checkWeatherForField(): void {
    if (!navigator.geolocation) {
      setWeatherNotice('This browser cannot share a field location. Check local weather before spraying.')
      return
    }
    setIsWeatherLoading(true)
    setWeatherNotice(null)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await getCropWeather(position.coords.latitude, position.coords.longitude)
          setWeather(result)
        } catch (caughtError) {
          setWeatherNotice(caughtError instanceof Error ? caughtError.message : 'The forecast could not be checked. Do not assume a safe spray window.')
        } finally {
          setIsWeatherLoading(false)
        }
      },
      () => {
        setIsWeatherLoading(false)
        setWeatherNotice('Field location was not shared. Check local weather before spraying.')
      },
      { enableHighAccuracy: false, maximumAge: 15 * 60 * 1000, timeout: 10_000 },
    )
  }

  return (
    <main className="crop-analyzer-page">
      <section className="crop-analyzer-hero">
        <div>
          <p className="section-kicker">Precision crop health</p>
          <h1>See the stress. Act at the right time.</h1>
          <p>Capture one clear leaf photo to screen for disease, pest injury, nutrient stress and water stress. ShetiMitra keeps the diagnosis, next steps and follow-up together.</p>
        </div>
        <aside className={`crop-analyzer-hero__weather ${weather ? `crop-analyzer-hero__weather--${weather.status}` : ''}`}>
          <CloudSun size={24} aria-hidden="true" />
          <div><span>Spray-window check</span><strong>{weather ? `${weather.status[0].toUpperCase()}${weather.status.slice(1)} · ${weather.provider}` : 'Connect weather to activate'}</strong></div>
          <small>{weather ? weather.summary : weatherNotice ?? 'Rain, wind and heat checks are applied before a plan is scheduled.'}</small>
          <button disabled={isWeatherLoading} onClick={checkWeatherForField} type="button"><MapPin size={14} /> {isWeatherLoading ? 'Checking your field…' : weather ? 'Refresh field weather' : 'Use my field location'}</button>
        </aside>
      </section>

      <section className="runtime-notice runtime-notice--ready">
        <span><ShieldCheck size={19} /></span>
        <div><strong>Gemini Vision is ready for live photo screening.</strong><p>Your selected photo is sent unchanged to the configured Gemini service for this diagnosis. ShetiMitra does not save the photo; only a signed-in farmer’s result summary can be kept in their crop ledger. {cropRuntimeStatus.localOnnxReady ? `${cropRuntimeStatus.localOnnxModelName} is also configured for optional on-device work.` : 'A validated ONNX lesion model can be connected later for local-only inference.'}</p></div>
      </section>

      <section className="analyzer-workspace" aria-label="Leaf image diagnosis">
        <div className="analyzer-capture-card">
          <div className="analyzer-card-heading"><div><p className="section-kicker">1 · Capture</p><h2>Take a leaf photo</h2></div><span className="analyzer-step-number">01</span></div>
          <p className="analyzer-helper">Use daylight, frame one leaf against a plain background, and include both the spot and a healthy edge if possible.</p>
          <input accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={handleFileChange} ref={inputRef} type="file" />
          {previewUrl ? (
            <div className="leaf-preview">
              <img alt="Selected leaf for analysis" src={previewUrl} />
              {diagnosis?.symptomBoxes.length ? <div aria-label="Gemini visual focus areas" className="leaf-preview__boxes">{diagnosis.symptomBoxes.map((box, index) => <span aria-label={box.label} className="leaf-preview__box" key={`${box.label}-${index}`} style={{ left: `${box.x / 10}%`, top: `${box.y / 10}%`, width: `${box.width / 10}%`, height: `${box.height / 10}%` }}><b>{box.label}</b></span>)}</div> : null}
              <button aria-label="Remove selected photo" className="leaf-preview__remove" onClick={removePhoto} type="button"><X size={18} /></button>
              <span><CheckCircle2 size={16} /> {diagnosis?.symptomBoxes.length ? `${diagnosis.symptomBoxes.length} visual focus area${diagnosis.symptomBoxes.length === 1 ? '' : 's'}` : 'Photo ready'}</span>
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

      {diagnosis && <DiagnosisReport diagnosis={diagnosis} isPlanSaved={isPlanSaved} onOpenCalendar={onOpenCalendar} onRequestPlan={() => setIsScheduleOpen(true)} scheduleNotice={scheduleNotice} weather={weather} />}
      {isScheduleOpen && diagnosis && <ScheduleConfirmation count={buildDiagnosisPlan(diagnosis).length} isSaving={isSavingPlan} onCancel={() => setIsScheduleOpen(false)} onConfirm={() => void confirmPlan()} />}
      <CameraCapture isOpen={isCameraOpen} onCapture={selectImage} onClose={() => setIsCameraOpen(false)} />
    </main>
  )
}

function ScheduleConfirmation({ count, isSaving, onCancel, onConfirm }: { count: number; isSaving: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div aria-labelledby="schedule-title" className="schedule-confirmation" role="dialog" aria-modal="true"><section><button aria-label="Close" className="schedule-confirmation__close" disabled={isSaving} onClick={onCancel} type="button"><X size={18} /></button><CalendarPlus size={25} /><p className="section-kicker">Your choice</p><h2 id="schedule-title">Add this treatment plan to your calendar?</h2><p>ShetiMitra will add {count} dated follow-ups from this diagnosis. Nothing is added until you choose “Add to calendar”.</p><div><button className="secondary-action" disabled={isSaving} onClick={onCancel} type="button">Not now</button><button className="primary-action" disabled={isSaving} onClick={onConfirm} type="button">{isSaving ? <LoaderCircle className="spin" size={16} /> : <CalendarPlus size={16} />} Add {count} events</button></div></section></div>
}

function DiagnosisReport({ diagnosis, isPlanSaved, onRequestPlan, onOpenCalendar, scheduleNotice, weather }: { diagnosis: CropDiagnosis; isPlanSaved: boolean; onRequestPlan: () => void; onOpenCalendar: () => void; scheduleNotice: string | null; weather: CropWeatherCheck | null }) {
  return (
    <section className="diagnosis-report" aria-live="polite">
      <header className="diagnosis-report__header"><div><p className="section-kicker">3 · Field guidance</p><h2>Your crop-health report</h2><p>Analysed {dateForDisplay(diagnosis.capturedAt)} · {diagnosis.crop} · {diagnosis.growthStage}</p></div><span className={`risk-badge risk-badge--${diagnosis.risk.toLowerCase()}`}>{diagnosis.risk} attention</span></header>
      <div className="diagnosis-metrics">
        <article><span>Likely pattern</span><strong>{diagnosis.label}</strong><small>{diagnosis.modelName} visual screening</small></article>
        <article><span>Visual confidence</span><strong>{confidence(diagnosis.confidence)}</strong><small>Gemini’s image assessment, not a lab-confirmed probability.</small></article>
        <article><span>Affected leaf area</span><strong>{diagnosis.affectedLeafArea === null ? '—' : `${Math.round(diagnosis.affectedLeafArea)}%`}</strong><small>{diagnosis.affectedLeafArea === null ? 'Not reliable from this one photo.' : 'Visual estimate from this photo.'}</small></article>
      </div>
      <div className="diagnosis-report__grid">
        <article className="diagnosis-summary"><h3>What to check now</h3><p>{diagnosis.summary}</p>{diagnosis.observations.length > 0 && <div className="diagnosis-observations"><span><Eye size={14} /> Visible in this photo</span><ul>{diagnosis.observations.map((item) => <li key={item}>{item}</li>)}</ul></div>}</article>
        <article className={`weather-safety ${weather ? `weather-safety--${weather.status}` : ''}`}><CloudSun size={22} /><div><h3>{weather ? `Weather gate: ${weather.status}` : 'Weather safety gate'}</h3><p>{weather ? weather.summary : 'Before any spray, check the next 6–12 hours for rain, high wind or heat. Connect a weather provider to confirm the window for your field.'}</p>{weather && <small>{weather.temperature_c === null ? '' : `${Math.round(weather.temperature_c)}°C`} {weather.wind_mps === null ? '' : `· ${weather.wind_mps.toFixed(1)} m/s wind`}</small>}</div></article>
      </div>
      <div className="treatment-plan"><div><p className="section-kicker">Suggested treatment path</p><h3>Start with the lowest-risk effective action.</h3></div><ol>{diagnosis.treatment.map((step, index) => <li key={`${step.title}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{step.title}</h4><p>{step.detail}</p></div><small>{step.timing}</small></li>)}</ol><p className="diagnosis-caution"><CircleAlert size={16} /> {diagnosis.caution}</p></div>
      <div className="diagnosis-report__footer"><p><ShieldCheck size={17} /> This is decision support. Confirm uncertain, severe or spreading symptoms with a local crop professional before applying pesticides.</p><div>{isPlanSaved ? <button className="secondary-action" onClick={onOpenCalendar} type="button">View advisory calendar <ChevronRight size={16} /></button> : <button className="primary-action" onClick={onRequestPlan} type="button"><CalendarPlus size={17} /> Review calendar plan</button>}{scheduleNotice && <small className="schedule-notice">{scheduleNotice}</small>}</div></div>
    </section>
  )
}
