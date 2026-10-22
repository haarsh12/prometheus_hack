import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CloudSun, Droplets, Leaf, Sprout, Wind } from 'lucide-react'

import { calendarUpdateEvent, readCalendarEntries, type CalendarEntry } from '../lib/crop-ledger'

const DAY = 24 * 60 * 60 * 1000

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function plusDays(days: number): Date {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`))
}

function defaultEntries(): CalendarEntry[] {
  return [
    { id: 'routine-scout', date: isoDate(plusDays(0)), title: 'Five-spot crop scouting', detail: 'Check five representative field spots and photograph any new symptom pattern.', kind: 'check', crop: 'All crops' },
    { id: 'weather-check', date: isoDate(plusDays(1)), title: 'Check spray window', detail: 'Confirm rain, wind and heat conditions before scheduling any foliar treatment.', kind: 'weather', crop: 'All crops' },
    { id: 'irrigation-check', date: isoDate(plusDays(3)), title: 'Root-zone moisture check', detail: 'Check soil moisture below the surface before changing irrigation frequency.', kind: 'check', crop: 'All crops' },
  ]
}

function iconFor(kind: CalendarEntry['kind']) {
  if (kind === 'treatment') return <Sprout size={16} />
  if (kind === 'weather') return <CloudSun size={16} />
  return <Leaf size={16} />
}

export function AdvisoryCalendar() {
  const [anchor, setAnchor] = useState(() => plusDays(0))
  const [entries, setEntries] = useState<CalendarEntry[]>(() => readCalendarEntries())

  useEffect(() => {
    const refresh = () => setEntries(readCalendarEntries())
    window.addEventListener(calendarUpdateEvent(), refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(calendarUpdateEvent(), refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const day = new Date(anchor)
    day.setDate(anchor.getDate() + index)
    return day
  }), [anchor])
  const allEntries = [...defaultEntries(), ...entries]
  const entriesByDate = useMemo(() => new Map(days.map((day) => {
    const key = isoDate(day)
    return [key, allEntries.filter((entry) => entry.date === key)]
  })), [days, entries])
  const upcoming = [...allEntries].filter((entry) => entry.date >= isoDate(new Date())).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)

  return (
    <main className="advisory-calendar-page">
      <section className="calendar-hero">
        <div><p className="section-kicker">Farm care timeline</p><h1>One calendar for every crop-health decision.</h1><p>Diagnosis plans, photo follow-ups and weather gates stay dated here so treatments happen at the safest useful time—not just the fastest time.</p></div>
        <aside><CalendarDays size={26} /><div><strong>{entries.length ? `${entries.length} plan items saved` : 'Your plan starts with a diagnosis'}</strong><span>Leaf analyses add their treatment steps here.</span></div></aside>
      </section>
      <section className="calendar-safety-strip"><Wind size={19} /><p><strong>Before any spray:</strong> confirm no imminent rain, strong wind or high heat. Weather integration is deliberately required to mark a spray window as safe.</p><Droplets size={19} /><p>Check root-zone moisture before treating a possible nutrient problem.</p></section>
      <section className="calendar-board">
        <header><div><p className="section-kicker">Next 14 days</p><h2>{new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(anchor)}</h2></div><div className="calendar-navigation"><button aria-label="Previous 14 days" onClick={() => setAnchor((current) => new Date(current.getTime() - DAY * 14))} type="button"><ChevronLeft size={18} /></button><button onClick={() => setAnchor(plusDays(0))} type="button">Today</button><button aria-label="Next 14 days" onClick={() => setAnchor((current) => new Date(current.getTime() + DAY * 14))} type="button"><ChevronRight size={18} /></button></div></header>
        <div className="calendar-grid">{days.map((day) => {
          const key = isoDate(day)
          const dateEntries = entriesByDate.get(key) ?? []
          const isToday = key === isoDate(new Date())
          return <article className={`calendar-day ${isToday ? 'calendar-day--today' : ''}`} key={key}><time dateTime={key}><span>{new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(day)}</span><b>{day.getDate()}</b></time><div>{dateEntries.length ? dateEntries.map((entry) => <span className={`calendar-event calendar-event--${entry.kind}`} key={entry.id}>{iconFor(entry.kind)}{entry.title}</span>) : <small>No planned action</small>}</div></article>
        })}</div>
      </section>
      <section className="calendar-upcoming"><div className="calendar-upcoming__heading"><div><p className="section-kicker">Action list</p><h2>Upcoming field work</h2></div><span>{upcoming.length} items</span></div><div className="calendar-task-list">{upcoming.map((entry) => <article key={entry.id}><span className={`calendar-task-list__icon calendar-task-list__icon--${entry.kind}`}>{iconFor(entry.kind)}</span><time>{formatDate(entry.date)}</time><div><h3>{entry.title}</h3><p>{entry.detail}</p><small>{entry.crop}</small></div><CheckCircle2 size={19} aria-label="Planned" /></article>)}</div></section>
    </main>
  )
}
