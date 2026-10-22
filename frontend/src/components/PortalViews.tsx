import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  CloudSun,
  CloudRain,
  Compass,
  FilePlus2,
  FileText,
  Fingerprint,
  History,
  Leaf,
  LoaderCircle,
  MessageSquareWarning,
  Mic,
  MapPinned,
  MoreHorizontal,
  Navigation,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  ThermometerSun,
  Trash2,
  Upload,
  Wind,
} from 'lucide-react'

import type { SahayakAuth } from '../hooks/useAuth'
import { getCropWeather, type CropWeatherCheck } from '../lib/api'
import { biometricErrorMessage, supportsDeviceBiometrics } from '../lib/webauthn'
import type { SahayakProfile, UserType } from '../types/api'
import type { AppRoute } from '../types/navigation'

type Navigate = (route: AppRoute) => void
type Service = { icon: typeof ScanLine; label: string; route: AppRoute; text: string }

const SERVICES: Service[] = [
  { icon: ScanLine, label: 'Crop analyzer', route: '/crop-analyzer', text: 'Take a leaf photo and screen early stress.' },
  { icon: CalendarDays, label: 'Advisory calendar', route: '/calendar', text: 'Map treatment dates and follow-up checks.' },
  { icon: CloudSun, label: 'Spray weather check', route: '/calendar', text: 'Plan around rain, heat and strong wind.' },
  { icon: Leaf, label: 'Crop support schemes', route: '/schemes', text: 'Find crop insurance and farm support.' },
  { icon: History, label: 'Health ledger', route: '/crop-analyzer', text: 'Keep diagnosis results and field notes together.' },
  { icon: MessageSquareWarning, label: 'Talk to an advisor', route: '/voice', text: 'Ask ShetiMitra in your own language.' },
]

function profileName(profile: SahayakProfile): string {
  return profile.full_name?.split(/\s+/)[0] || 'there'
}

const JIT_CAMPUS = {
  latitude: 21.247499,
  longitude: 79.050797,
  label: 'JIT Campus, Lonara, Nagpur',
  address: 'Off Koradi Road, Lonara, Nagpur 441111',
  mapUrl: 'https://www.openstreetmap.org/?mlat=21.247499&mlon=79.050797#map=16/21.247499/79.050797',
  embedUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=79.043%2C21.243%2C79.058%2C21.252&layer=mapnik&marker=21.247499%2C79.050797',
} as const

function weatherAction(weather: CropWeatherCheck | null, error: string | null): { title: string; detail: string; tone: 'safe' | 'caution' | 'avoid' | 'unknown' } {
  if (error || !weather) {
    return {
      title: 'Confirm conditions before spraying',
      detail: 'The local weather feed is unavailable. Check rain, wind and heat in the field before scheduling a foliar spray.',
      tone: 'unknown',
    }
  }
  if (weather.status === 'avoid') {
    return { title: 'Delay foliar spraying', detail: weather.summary, tone: 'avoid' }
  }
  if (weather.status === 'caution') {
    return { title: 'Use a cooler, calmer window', detail: weather.summary, tone: 'caution' }
  }
  return { title: 'Weather gate is clear for now', detail: weather.summary, tone: 'safe' }
}

function FarmLocationPanel({ onNavigate }: { onNavigate: Navigate }) {
  const [weather, setWeather] = useState<CropWeatherCheck | null>(null)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [isLoadingWeather, setIsLoadingWeather] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  async function refreshWeather(): Promise<void> {
    setIsLoadingWeather(true)
    setWeatherError(null)
    try {
      const result = await getCropWeather(JIT_CAMPUS.latitude, JIT_CAMPUS.longitude)
      setWeather(result)
      setUpdatedAt(new Date())
    } catch (error) {
      setWeather(null)
      setWeatherError(error instanceof Error ? error.message : 'The local weather feed is unavailable.')
    } finally {
      setIsLoadingWeather(false)
    }
  }

  useEffect(() => { void refreshWeather() }, [])
  const action = weatherAction(weather, weatherError)
  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(updatedAt)
    : 'Not checked yet'

  return (
    <section className="farm-location-panel" aria-labelledby="farm-location-heading">
      <div className="farm-location-panel__heading">
        <div>
          <p className="section-kicker">Your field location</p>
          <h2 id="farm-location-heading">JIT Campus field view</h2>
          <p>Use this reference point to check local weather before crop scouting, irrigation or spraying.</p>
        </div>
        <span className="farm-location-panel__status"><MapPinned size={15} /> Location set</span>
      </div>
      <div className="farm-location-panel__map">
        <div className="farm-map-card">
          <iframe
            aria-label="Map centred on JIT Campus, Lonara, Nagpur"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={JIT_CAMPUS.embedUrl}
            title="JIT Campus field location"
          />
          <div className="farm-map-card__caption"><span><Navigation size={16} /> <b>{JIT_CAMPUS.label}</b><small>{JIT_CAMPUS.address}</small></span><a href={JIT_CAMPUS.mapUrl} rel="noreferrer" target="_blank">Open map <Compass size={14} /></a></div>
        </div>
      </div>
      <div className="farm-location-panel__content">
        <article className="farm-location-details">
          <p className="section-kicker">Field reference</p>
          <h3>Campus location</h3>
          <dl>
            <div><dt>Place</dt><dd>JIT Campus, Lonara</dd></div>
            <div><dt>District</dt><dd>Nagpur, Maharashtra</dd></div>
            <div><dt>Coordinates</dt><dd>21.2475° N, 79.0508° E</dd></div>
            <div><dt>Use for</dt><dd>Weather, scouting &amp; reminders</dd></div>
          </dl>
          <p className="farm-location-details__note"><Navigation size={16} /> This location is used only as the field reference for the map and local advisory checks.</p>
        </article>
        <div className="farm-weather-card">
          <div className="farm-weather-card__top"><div><p className="section-kicker">Local weather gate</p><h3>{isLoadingWeather ? 'Checking conditions…' : weather ? `${weather.status[0].toUpperCase()}${weather.status.slice(1)} spray window` : 'Weather check needed'}</h3></div><button aria-label="Refresh JIT Campus weather" className="header-icon-button" disabled={isLoadingWeather} onClick={() => void refreshWeather()} type="button"><RefreshCw className={isLoadingWeather ? 'spin' : ''} size={17} /></button></div>
          <div className="farm-weather-card__metrics">
            <span><ThermometerSun size={17} /><small>Temperature</small><b>{weather?.temperature_c == null ? '—' : `${Math.round(weather.temperature_c)}°C`}</b></span>
            <span><Wind size={17} /><small>Wind</small><b>{weather?.wind_mps == null ? '—' : `${weather.wind_mps.toFixed(1)} m/s`}</b></span>
            <span><CloudRain size={17} /><small>Rain</small><b>{weather ? (weather.rain_expected ? 'Expected' : 'No flag') : 'Check'}</b></span>
          </div>
          <div className={`farm-weather-card__action farm-weather-card__action--${action.tone}`}><ShieldCheck size={20} /><div><strong>{action.title}</strong><p>{action.detail}</p></div></div>
          <div className="farm-weather-card__footer"><small>{weather ? `${weather.provider} · checked ${updatedLabel}` : weatherError ? 'Weather source is not connected yet' : updatedLabel}</small><div><button onClick={() => onNavigate('/crop-analyzer')} type="button">Analyse a leaf</button><button onClick={() => onNavigate('/calendar')} type="button">Plan follow-up</button></div></div>
        </div>
      </div>
    </section>
  )
}

export function Dashboard({ profile, onNavigate, onOpenAuth }: { profile?: SahayakProfile | null; onNavigate: Navigate; onOpenAuth: () => void }) {
  const isGuest = !profile
  return (
    <main className="portal-page">
      <section className="dashboard-welcome">
        <div><p className="section-kicker">{isGuest ? 'Crop-health workspace' : 'Your farm workspace'}</p><h1>{profile ? `Welcome back, ${profileName(profile)}.` : 'Start with your crop health.'}</h1><p>{isGuest ? 'Screen a leaf, plan a field check and save the next step. Sign in when you want a private farm record.' : 'What would you like to check in your field today?'}</p></div>
        <button className="primary-action" onClick={() => onNavigate('/crop-analyzer')} type="button"><ScanLine size={18} /> Analyse a leaf</button>
      </section>
      {isGuest && <p className="source-notice"><BookOpenCheck size={18} /> Crop scanning and the advisory calendar are available to explore. Sign in to keep a personal crop-health history.</p>}
      <section className="voice-callout">
        <div className="voice-callout__orb"><Mic size={27} /></div>
        <div><span className="status-dot" /> Farm advisor ready<h2>Ask naturally. Receive crop guidance in your chosen language.</h2><p>Use voice for field observations, crop-care questions and treatment reminders.</p></div>
        <button className="secondary-action" onClick={() => onNavigate('/voice')} type="button">Talk to ShetiMitra <ChevronRight size={16} /></button>
      </section>
      <FarmLocationPanel onNavigate={onNavigate} />
      <section className="section-block"><div className="section-heading"><div><p className="section-kicker">Farm tools</p><h2>Choose your next field action.</h2></div></div>
        <div className="service-grid">{SERVICES.map(({ icon: Icon, label, route, text }) => <button className="service-card" key={label} onClick={() => onNavigate(route)} type="button"><span><Icon size={21} /></span><h3>{label}</h3><p>{text}</p><ChevronRight size={17} /></button>)}</div>
      </section>
      <section className="dashboard-lower">
        <div className="preview-card"><div><History size={20} /><span className="preview-badge">Crop health ledger</span></div><h3>{isGuest ? 'Build your first crop-health record.' : 'Your latest crop-health record.'}</h3><p>Each completed leaf diagnosis can save its result, treatment path and follow-up date on this device.</p><button onClick={() => onNavigate('/crop-analyzer')} type="button">Open analyzer <ChevronRight size={16} /></button></div>
        <div className="preview-card"><div><CalendarDays size={20} /><span className="preview-badge">Advisory calendar</span></div><h3>Keep treatment timing visible.</h3><p>See suggested treatment days, repeat checks and spray weather gates in one timeline.</p><button onClick={() => onNavigate('/calendar')} type="button">Open calendar <ChevronRight size={16} /></button></div>
      </section>
      {isGuest && <p className="inline-notice">Sign in to save documents, receive notifications, and use a profile-based scheme shortlist. <button className="link-action" onClick={onOpenAuth} type="button">Sign in</button></p>}
    </main>
  )
}

type LocalDocument = { id: string; file: File; addedAt: string }

export function DocumentsView({ onTalk }: { onTalk: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<LocalDocument[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  function addDocument(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setNotice('Choose a file that is 5 MB or smaller.'); return }
    setDocuments((items) => [{ id: crypto.randomUUID(), file, addedAt: new Date().toLocaleDateString() }, ...items])
    setNotice('Added for this browser session. Persistent document storage will be connected in a later phase.')
    event.target.value = ''
  }
  return (
    <main className="portal-page">
      <PageTitle eyebrow="Private documents" title="Your document centre." text="Use this space to organise documents and ask ShetiMitra about them." />
      <section className="document-upload-card"><div><span className="document-upload-card__icon"><Upload size={22} /></span><h2>Add a document</h2><p>PDF, DOCX, text and image files up to 5 MB. Files added here are session previews only until private storage is connected.</p></div><input accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png" hidden onChange={addDocument} ref={inputRef} type="file" /><button className="primary-action" onClick={() => inputRef.current?.click()} type="button"><FilePlus2 size={17} /> Select document</button></section>
      {notice && <p className="inline-notice">{notice}</p>}
      <section className="section-block"><div className="section-heading"><div><p className="section-kicker">Session preview</p><h2>{documents.length ? 'Recent documents' : 'No documents yet.'}</h2></div><span className="preview-badge">Not saved</span></div>
        {documents.length ? <ul className="document-list">{documents.map((document) => <li key={document.id}><span className="document-list__icon"><FileText size={19} /></span><div><h3>{document.file.name}</h3><p>{Math.ceil(document.file.size / 1024)} KB · Added {document.addedAt}</p></div><button onClick={onTalk} type="button">Ask ShetiMitra</button><button aria-label={'Remove ' + document.file.name} className="header-icon-button" onClick={() => setDocuments((items) => items.filter((item) => item.id !== document.id))} type="button"><Trash2 size={17} /></button></li>)}</ul> : <EmptyState icon={FileText} text="Add a document when you are ready. You can also discuss a document directly with ShetiMitra AI." actionLabel="Ask ShetiMitra about a document" onAction={onTalk} />}
      </section>
    </main>
  )
}

const NOTIFICATIONS = [
  { title: 'Welcome to ShetiMitra AI', text: 'Your notification space is ready. Personalised crop-health alerts will appear when connected to verified services.', date: 'Now', kind: 'Account' },
  { title: 'Scheme updates will be source-verified', text: 'We will not send unverified scheme information, legal changes or deadlines.', date: 'Preview', kind: 'Safety' },
]

export function NotificationsView() {
  return (
    <main className="portal-page"><PageTitle eyebrow="Notifications" title="Important updates, in one place." text="These are preview notifications. Live alerts will be added with the approved notification service." />
      <section className="notification-panel">{NOTIFICATIONS.map((item) => <article className="notification-item" key={item.title}><span className="notification-item__icon"><Bell size={18} /></span><div><p><b>{item.kind}</b><time>{item.date}</time></p><h2>{item.title}</h2><p>{item.text}</p></div><button aria-label={'More options for ' + item.title} className="header-icon-button" type="button"><MoreHorizontal size={18} /></button></article>)}</section>
    </main>
  )
}

export function GrievancesView() {
  const [notice, setNotice] = useState<string | null>(null)
  function submit(event: FormEvent<HTMLFormElement>): void { event.preventDefault(); setNotice('Your grievance draft is ready in this browser. Keep the facts and documents together here while ShetiMitra helps you improve it.') }
  return (
    <main className="portal-page"><PageTitle eyebrow="Grievance support" title="Prepare a clear request for help." text="Build a factual grievance draft, organise evidence and ask ShetiMitra to make the next step clear." />
      <div className="grievance-layout"><section className="grievance-form-card"><h2>Draft a grievance</h2><form onSubmit={submit}><label>Category<select required defaultValue=""><option disabled value="">Choose a category</option><option>Cooperative service</option><option>PACS service</option><option>Document support</option><option>Other</option></select></label><label>Describe what happened<textarea maxLength={1500} placeholder="Share the facts, relevant dates and the help you need." required rows={6} /></label><label>Supporting document <span className="field-optional">Preview only</span><input type="file" /></label><button className="primary-action" type="submit">Save draft</button></form>{notice && <p className="inline-notice">{notice}</p>}</section><aside className="grievance-side-note"><MessageSquareWarning size={22} /><h2>Make your case clear</h2><p>Keep dates, receipts, acknowledgements and previous messages together. Ask ShetiMitra AI to turn them into a concise description of the issue and the resolution you need.</p></aside></div>
    </main>
  )
}

export function ProfileView({ auth, profile }: { auth: SahayakAuth; profile: SahayakProfile }) {
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState({ full_name: profile.full_name ?? '', state: profile.state ?? '', district: profile.district ?? '', village_or_town: profile.village_or_town ?? '', address: profile.address ?? '', cooperative_role: profile.cooperative_role ?? '', user_type: profile.user_type ?? 'other' as UserType })
  const [notice, setNotice] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingFaceId, setIsUpdatingFaceId] = useState(false)
  const [faceIdNotice, setFaceIdNotice] = useState<string | null>(null)
  const deviceBiometricsAvailable = supportsDeviceBiometrics()

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> { event.preventDefault(); setIsSaving(true); setNotice(null); try { await auth.saveProfile(values); setNotice('Profile updated.'); setIsEditing(false) } catch (error) { setNotice(error instanceof Error ? error.message : 'We could not update your profile.') } finally { setIsSaving(false) } }

  async function updateFaceId(): Promise<void> {
    setFaceIdNotice(null)
    setIsUpdatingFaceId(true)
    try {
      if (profile.face_id_enabled) {
        await auth.removeFaceId()
        setFaceIdNotice('Face ID has been removed from this ShetiMitra account.')
      } else {
        await auth.registerFaceId()
        setFaceIdNotice('Face ID is ready for your next sign-in on this device.')
      }
    } catch (error) {
      setFaceIdNotice(biometricErrorMessage(error, 'We could not update Face ID. Please try again.'))
    } finally {
      setIsUpdatingFaceId(false)
    }
  }

  return (
    <main className="portal-page"><PageTitle eyebrow="Your profile" title="Your ShetiMitra details." text="Your verified mobile number is your account identity and cannot be edited here." />
      <section className="profile-card"><div className="profile-card__identity"><span>{profileName(profile).slice(0, 1).toUpperCase()}</span><div><h2>{profile.full_name || 'Complete your profile'}</h2><p>+91 {profile.phone_number.replace('+91', '')}</p></div><button className="secondary-action" onClick={() => setIsEditing((editing) => !editing)} type="button">{isEditing ? 'Cancel' : 'Edit profile'}</button></div>
        {isEditing ? <form className="profile-form" onSubmit={(event) => void save(event)}><div className="form-grid"><label>Name<input onChange={(event) => setValues({ ...values, full_name: event.target.value })} value={values.full_name} /></label><label>State<input onChange={(event) => setValues({ ...values, state: event.target.value })} value={values.state} /></label><label>District / city<input onChange={(event) => setValues({ ...values, district: event.target.value })} value={values.district} /></label><label>Town / village<input onChange={(event) => setValues({ ...values, village_or_town: event.target.value })} value={values.village_or_town} /></label></div><label>Address <span className="field-optional">Optional</span><textarea onChange={(event) => setValues({ ...values, address: event.target.value })} rows={3} value={values.address} /></label><div className="form-grid"><label>Your role<select onChange={(event) => setValues({ ...values, user_type: event.target.value as UserType })} value={values.user_type}><option value="cooperative_member">Cooperative member</option><option value="farmer">Farmer</option><option value="pacs_member">PACS member</option><option value="cooperative_official">Cooperative official</option><option value="rural_stakeholder">Rural stakeholder</option><option value="other">Other</option></select></label><label>Cooperative role <span className="field-optional">Optional</span><input onChange={(event) => setValues({ ...values, cooperative_role: event.target.value })} value={values.cooperative_role} /></label></div><button className="primary-action" disabled={isSaving} type="submit">{isSaving ? <LoaderCircle className="spin" size={17} /> : null}{isSaving ? 'Saving…' : 'Save changes'}</button></form> : <dl className="profile-details"><div><dt>State</dt><dd>{profile.state || '—'}</dd></div><div><dt>District / city</dt><dd>{profile.district || '—'}</dd></div><div><dt>Town / village</dt><dd>{profile.village_or_town || '—'}</dd></div><div><dt>Role</dt><dd>{profile.user_type?.replaceAll('_', ' ') || '—'}</dd></div><div><dt>Cooperative role</dt><dd>{profile.cooperative_role || '—'}</dd></div><div><dt>Address</dt><dd>{profile.address || '—'}</dd></div></dl>}
        {notice && <p className="inline-notice">{notice}</p>}
      </section>
      <section className="profile-security-card" aria-labelledby="face-id-heading">
        <span className="profile-security-card__icon"><Fingerprint size={23} /></span>
        <div>
          <p className="section-kicker">Sign-in security</p>
          <h2 id="face-id-heading">Face ID and device sign-in</h2>
          <p>{profile.face_id_enabled ? 'Face ID is enabled for this ShetiMitra account on a registered device.' : 'Set up Face ID, Touch ID, or your device screen lock for faster sign-in.'}</p>
          {!profile.face_id_enabled && <small>Your face data and private key remain on your device. ShetiMitra stores only a public credential.</small>}
          {!profile.face_id_enabled && !deviceBiometricsAvailable && <small className="profile-security-card__warning">Use a supported device over HTTPS to set up Face ID.</small>}
          {faceIdNotice && <p className="profile-security-card__feedback" role="status">{faceIdNotice}</p>}
        </div>
        {profile.face_id_enabled ? (
          <button className="secondary-action" disabled={isUpdatingFaceId} onClick={() => void updateFaceId()} type="button">{isUpdatingFaceId ? <LoaderCircle className="spin" size={16} /> : null}{isUpdatingFaceId ? 'Removing…' : 'Remove Face ID'}</button>
        ) : (
          <button className="primary-action" disabled={isUpdatingFaceId || !deviceBiometricsAvailable} onClick={() => void updateFaceId()} type="button">{isUpdatingFaceId ? <LoaderCircle className="spin" size={16} /> : <Fingerprint size={16} />}{isUpdatingFaceId ? 'Setting up…' : 'Set up Face ID'}</button>
        )}
      </section>
    </main>
  )
}

function PageTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <header className="page-title"><p className="section-kicker">{eyebrow}</p><h1>{title}</h1><p>{text}</p></header> }
function EmptyState({ icon: Icon, text, actionLabel, onAction }: { icon: typeof FileText; text: string; actionLabel: string; onAction: () => void }) { return <div className="empty-state"><Icon size={28} /><p>{text}</p><button className="secondary-action" onClick={onAction} type="button">{actionLabel}</button></div> }
