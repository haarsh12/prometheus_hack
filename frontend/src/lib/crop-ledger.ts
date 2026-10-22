import type { CropDiagnosis } from './crop-diagnosis'

export type CalendarEntry = {
  id: string
  date: string
  title: string
  detail: string
  kind: 'treatment' | 'check' | 'weather'
  crop: string
}

const DIAGNOSIS_KEY = 'shetimitra.crop-diagnoses.v1'
const CALENDAR_KEY = 'shetimitra.advisory-calendar.v1'
const CALENDAR_EVENT = 'shetimitra:calendar-updated'

function safeRead<T>(key: string): T[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(value) ? value as T[] : []
  } catch {
    return []
  }
}

export function readDiagnoses(): CropDiagnosis[] {
  return safeRead<CropDiagnosis>(DIAGNOSIS_KEY)
}

export function saveDiagnosis(diagnosis: CropDiagnosis): void {
  const current = readDiagnoses().filter((item) => item.id !== diagnosis.id)
  localStorage.setItem(DIAGNOSIS_KEY, JSON.stringify([diagnosis, ...current].slice(0, 30)))
}

export function readCalendarEntries(): CalendarEntry[] {
  return safeRead<CalendarEntry>(CALENDAR_KEY)
}

export function scheduleDiagnosisPlan(diagnosis: CropDiagnosis): CalendarEntry[] {
  const today = new Date()
  const entries: CalendarEntry[] = diagnosis.treatment.map((step, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + (index === 0 ? 0 : Math.min(index, 2)))
    return {
      id: `${diagnosis.id}-${index}`,
      date: date.toISOString().slice(0, 10),
      title: step.title,
      detail: `${diagnosis.crop}: ${step.detail}`,
      kind: step.kind === 'observe' ? 'check' : 'treatment',
      crop: diagnosis.crop,
    }
  })
  const followUp = new Date(today)
  followUp.setDate(today.getDate() + diagnosis.followUpDays)
  entries.push({
    id: `${diagnosis.id}-follow-up`,
    date: followUp.toISOString().slice(0, 10),
    title: 'Follow-up leaf check',
    detail: `${diagnosis.crop}: compare new photos and confirm whether symptoms are spreading.`,
    kind: 'check',
    crop: diagnosis.crop,
  })
  const existing = readCalendarEntries().filter((entry) => !entry.id.startsWith(diagnosis.id))
  localStorage.setItem(CALENDAR_KEY, JSON.stringify([...existing, ...entries]))
  window.dispatchEvent(new Event(CALENDAR_EVENT))
  return entries
}

export function calendarUpdateEvent(): string {
  return CALENDAR_EVENT
}
