import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, CloudSun, Droplets, Leaf, LoaderCircle, Sprout, Wind, X } from 'lucide-react'

import { createFarmCalendarEvent, getFarmCalendarEvents, type FarmCalendarEvent } from '../lib/api'
import { addLocalCalendarEntry, calendarUpdateEvent, readCalendarEntries, type CalendarEntry } from '../lib/crop-ledger'

type EventKind = CalendarEntry['kind']

function atNoon(date: Date): Date {
  const result = new Date(date)
  result.setHours(12, 0, 0, 0)
  return result
}

function isoDate(date: Date): string {
  const local = atNoon(date)
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
}

function fromIso(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

function firstOfMonth(date: Date): Date {
  const result = atNoon(date)
  result.setDate(1)
  return result
}

function addMonths(date: Date, months: number): Date {
  const result = firstOfMonth(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function monthDays(anchor: Date): Date[] {
  const first = firstOfMonth(anchor)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return atNoon(day)
  })
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(fromIso(value))
}

function iconFor(kind: EventKind) {
  if (kind === 'treatment') return <Sprout size={16} />
  if (kind === 'weather') return <CloudSun size={16} />
  if (kind === 'personal') return <CalendarDays size={16} />
  return <Leaf size={16} />
}

function toCalendarEntry(event: FarmCalendarEvent): CalendarEntry {
  return {
    id: `server-${event.id}`,
    date: event.date,
    title: event.title,
    detail: event.detail ?? '',
    kind: event.kind,
    crop: event.crop,
  }
}

export function AdvisoryCalendar() {
  const today = useMemo(() => atNoon(new Date()), [])
  const [anchor, setAnchor] = useState(() => firstOfMonth(today))
  const [localEntries, setLocalEntries] = useState<CalendarEntry[]>(() => readCalendarEntries())
  const [remoteEntries, setRemoteEntries] = useState<CalendarEntry[]>([])
  const [remoteNotice, setRemoteNotice] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({ title: '', date: isoDate(today), detail: '', kind: 'personal' as EventKind, crop: '' })

  useEffect(() => {
    const refresh = () => setLocalEntries(readCalendarEntries())
    window.addEventListener(calendarUpdateEvent(), refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(calendarUpdateEvent(), refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    let current = true
    const start = isoDate(monthDays(anchor)[0])
    const end = isoDate(monthDays(anchor).at(-1) ?? anchor)
    void getFarmCalendarEvents(start, end)
      .then((events) => {
        if (!current) return
        setRemoteEntries(events.map(toCalendarEntry))
        setRemoteNotice(null)
      })
      .catch((error: unknown) => {
        if (!current) return
        setRemoteEntries([])
        setRemoteNotice(error instanceof Error && error.message.includes('sign in') ? 'Sign in to keep calendar events with your farm account. This device can still keep local plans.' : null)
      })
    return () => { current = false }
  }, [anchor])

  const days = useMemo(() => monthDays(anchor), [anchor])
  const allEntries = useMemo(() => [...localEntries, ...remoteEntries], [localEntries, remoteEntries])
  const entriesByDate = useMemo(() => new Map(days.map((day) => {
    const key = isoDate(day)
    return [key, allEntries.filter((entry) => entry.date === key)]
  })), [days, allEntries])
  const upcoming = useMemo(() => allEntries.filter((entry) => entry.date >= isoDate(today)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8), [allEntries, today])
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(anchor)

  function openForm(): void {
    setForm({ title: '', date: isoDate(today), detail: '', kind: 'personal', crop: '' })
    setIsFormOpen(true)
  }

  async function saveManualEvent(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return
    setIsSaving(true)
    const candidate: CalendarEntry = {
      id: crypto.randomUUID(), date: form.date, title, detail: form.detail.trim(), kind: form.kind, crop: form.crop.trim() || null,
    }
    try {
      const saved = await createFarmCalendarEvent({
        event_date: candidate.date, title: candidate.title, detail: candidate.detail || undefined, kind: candidate.kind, crop: candidate.crop ?? undefined,
      })
      setRemoteEntries((entries) => [...entries, toCalendarEntry(saved)])
      setRemoteNotice('Event saved to your farm calendar.')
    } catch {
      addLocalCalendarEntry(candidate)
      setRemoteNotice('Event saved only on this device. Sign in to save it to your farm account.')
    } finally {
      setIsSaving(false)
      setIsFormOpen(false)
    }
  }

  return (
    <main className="advisory-calendar-page">
      <section className="calendar-hero">
        <div><p className="section-kicker">Farm care timeline</p><h1>One calendar for every farm decision.</h1><p>Keep diagnosis plans, photo follow-ups, weather gates and personal reminders together—so actions happen at the safest useful time, not just the fastest time.</p></div>
        <aside><CalendarDays size={26} /><div><strong>{allEntries.length ? `${allEntries.length} scheduled items` : 'Your plan starts when you add an event'}</strong><span>Personal reminders and crop-health work share one calendar.</span></div></aside>
      </section>
      <section className="calendar-safety-strip"><Wind size={19} /><p><strong>Before any spray:</strong> confirm no imminent rain, strong wind or high heat. A calendar date is a reminder, not a verified spray window.</p><Droplets size={19} /><p>Check root-zone moisture before treating a possible nutrient problem.</p></section>
      {remoteNotice && <p className="calendar-notice" role="status">{remoteNotice}</p>}
      <section className="calendar-board">
        <header><div><p className="section-kicker">Monthly planner</p><h2>{monthLabel}</h2></div><div className="calendar-navigation"><button aria-label="Previous month" onClick={() => setAnchor((current) => addMonths(current, -1))} type="button"><ChevronLeft size={18} /></button><button onClick={() => setAnchor(firstOfMonth(today))} type="button">Today</button><button aria-label="Next month" onClick={() => setAnchor((current) => addMonths(current, 1))} type="button"><ChevronRight size={18} /></button><button className="calendar-add-event" onClick={openForm} type="button"><CalendarPlus size={16} /> Add event</button></div></header>
        <div className="calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid calendar-grid--month">{days.map((day) => {
          const key = isoDate(day)
          const dateEntries = entriesByDate.get(key) ?? []
          const isToday = key === isoDate(today)
          const inMonth = day.getMonth() === anchor.getMonth()
          return <article className={`calendar-day ${isToday ? 'calendar-day--today' : ''} ${inMonth ? '' : 'calendar-day--outside'}`} key={key}><time dateTime={key}><b>{day.getDate()}</b></time><div>{dateEntries.slice(0, 3).map((entry) => <span className={`calendar-event calendar-event--${entry.kind}`} key={entry.id} title={entry.detail}>{iconFor(entry.kind)}{entry.title}</span>)}{dateEntries.length > 3 && <small className="calendar-more">+{dateEntries.length - 3} more</small>}</div></article>
        })}</div>
      </section>
      <section className="calendar-upcoming"><div className="calendar-upcoming__heading"><div><p className="section-kicker">Action list</p><h2>Upcoming field work and reminders</h2></div><span>{upcoming.length} items</span></div>{upcoming.length ? <div className="calendar-task-list">{upcoming.map((entry) => <article key={entry.id}><span className={`calendar-task-list__icon calendar-task-list__icon--${entry.kind}`}>{iconFor(entry.kind)}</span><time>{formatDate(entry.date)}</time><div><h3>{entry.title}</h3>{entry.detail && <p>{entry.detail}</p>}{entry.crop && <small>{entry.crop}</small>}</div><CheckCircle2 size={19} aria-label="Planned" /></article>)}</div> : <p className="calendar-empty">No events yet. Add a personal reminder, or analyse a leaf and choose to add its follow-up plan.</p>}</section>
      {isFormOpen && <ManualEventForm form={form} isSaving={isSaving} onCancel={() => setIsFormOpen(false)} onChange={setForm} onSubmit={saveManualEvent} />}
    </main>
  )
}

function ManualEventForm({ form, isSaving, onCancel, onChange, onSubmit }: { form: { title: string; date: string; detail: string; kind: EventKind; crop: string }; isSaving: boolean; onCancel: () => void; onChange: (value: { title: string; date: string; detail: string; kind: EventKind; crop: string }) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div aria-labelledby="manual-event-title" className="schedule-confirmation" role="dialog" aria-modal="true"><form className="manual-event-form" onSubmit={onSubmit}><button aria-label="Close" className="schedule-confirmation__close" disabled={isSaving} onClick={onCancel} type="button"><X size={18} /></button><CalendarPlus size={25} /><p className="section-kicker">Personal or farm reminder</p><h2 id="manual-event-title">Add an event</h2><label>Title<input autoFocus maxLength={160} onChange={(event) => onChange({ ...form, title: event.target.value })} placeholder="e.g. Market day or check tomato plot" required value={form.title} /></label><div className="manual-event-form__split"><label>Date<input onChange={(event) => onChange({ ...form, date: event.target.value })} required type="date" value={form.date} /></label><label>Type<select onChange={(event) => onChange({ ...form, kind: event.target.value as EventKind })} value={form.kind}><option value="personal">Personal</option><option value="check">Field check</option><option value="treatment">Treatment</option><option value="weather">Weather check</option></select></label></div><label>Crop (optional)<input maxLength={80} onChange={(event) => onChange({ ...form, crop: event.target.value })} placeholder="e.g. Tomato" value={form.crop} /></label><label>Notes (optional)<textarea maxLength={1000} onChange={(event) => onChange({ ...form, detail: event.target.value })} placeholder="What should you remember?" rows={3} value={form.detail} /></label><div><button className="secondary-action" disabled={isSaving} onClick={onCancel} type="button">Cancel</button><button className="primary-action" disabled={isSaving} type="submit">{isSaving ? <LoaderCircle className="spin" size={16} /> : <CalendarPlus size={16} />} Save event</button></div></form></div>
}
