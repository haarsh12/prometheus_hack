import { ArrowRight, CalendarDays, Camera, CloudSun, Leaf, LockKeyhole, ScanLine, Sprout } from 'lucide-react'

type SahayakLandingProps = {
  onAnalyze: () => void
  onOpenAuth: () => void
  onViewServices: () => void
}

const TOPICS = [
  { icon: Camera, title: 'Leaf diagnosis', text: 'Capture a leaf to screen for disease, pests, nutrient stress or water stress.' },
  { icon: Leaf, title: 'Crop health ledger', text: 'Keep every diagnosis, field note and follow-up in one farm history.' },
  { icon: CloudSun, title: 'Spray weather gate', text: 'Plan treatments around rain, high heat and wind before you spray.' },
  { icon: CalendarDays, title: 'Advisory calendar', text: 'Map treatment dates, re-checks and local farm reminders.' },
  { icon: Sprout, title: 'Low-cost treatment paths', text: 'Start with crop-safe field practices and biological options.' },
]

export function SahayakLanding({ onAnalyze, onOpenAuth, onViewServices }: SahayakLandingProps) {
  return (
    <main className="discover-page">
      <section className="discover-hero">
        <div className="discover-hero__content">
          <p className="section-kicker">AI-powered crop health</p>
          <h1>Spot crop stress before it spreads.</h1>
          <p>Take a clear leaf photo for on-device screening, then get a practical treatment path, spray-safety check and dated follow-up plan in the language you prefer.</p>
          <div className="hero-actions">
            <button className="primary-action" onClick={onAnalyze} type="button"><ScanLine size={18} /> Analyse a leaf</button>
            <button className="secondary-action" onClick={onOpenAuth} type="button">Sign in</button>
          </div>
          <p className="hero-disclaimer">ShetiMitra helps you act early. Confirm severe or uncertain symptoms with a local agriculture expert before chemical treatment.</p>
        </div>
        <aside className="voice-preview" aria-label="Voice assistant preview">
          <div className="voice-preview__orbit voice-preview__orbit--outer" />
          <div className="voice-preview__orbit voice-preview__orbit--inner" />
          <div className="voice-preview__core"><Leaf size={30} /></div>
          <div className="voice-preview__caption"><span className="status-dot" /> Ready to scan</div>
          <button onClick={onAnalyze} type="button">Open crop analyzer <ArrowRight size={16} /></button>
        </aside>
      </section>

      <section className="trust-strip" aria-label="ShetiMitra AI benefits">
        <span>On-device vision runtime</span><i /><span>10 Indian languages</span><i /><span>Field-safe treatment support</span>
      </section>

      <section className="topic-section" aria-labelledby="topics-heading">
        <div className="section-heading">
          <div><p className="section-kicker">Explore support</p><h2 id="topics-heading">Start with what matters today.</h2></div>
          <button className="link-action" onClick={onAnalyze} type="button">Start a scan <ArrowRight size={16} /></button>
        </div>
        <div className="topic-grid">
          {TOPICS.map(({ icon: Icon, title, text }) => (
            <button className="topic-card" key={title} onClick={onAnalyze} type="button">
              <span className="topic-card__icon"><Icon size={22} /></span><h3>{title}</h3><p>{text}</p><span>Explore crop care <ArrowRight size={15} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="account-prompt">
        <div><p className="section-kicker">Your farm record</p><h2>Keep crop care decisions in one place.</h2><p>Sign in to save photo diagnoses, crop-health history and your personalised advisory calendar.</p></div>
        <div className="locked-service-list">
          <span><LockKeyhole size={15} /> Crop health ledger</span><span><LockKeyhole size={15} /> Treatment calendar</span><span><LockKeyhole size={15} /> Farm profile</span>
        </div>
        <button className="secondary-action" onClick={onViewServices} type="button"><Leaf size={17} /> View my farm</button>
      </section>
    </main>
  )
}
