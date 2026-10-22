import { Languages } from 'lucide-react'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'

type WebsiteLanguage = 'en' | 'hi'

type WebsiteLanguageContextValue = {
  language: WebsiteLanguage
  setLanguage: (language: WebsiteLanguage) => void
}

const WebsiteLanguageContext = createContext<WebsiteLanguageContextValue | null>(null)
const WEBSITE_LANGUAGE_STORAGE_KEY = 'shetimitra-website-language'

const WEBSITE_LANGUAGES = [
  { value: 'en', label: 'English', enabled: true },
  { value: 'hi', label: 'हिन्दी', enabled: true },
  { value: 'mr', label: 'मराठी', enabled: false },
  { value: 'ta', label: 'தமிழ்', enabled: false },
  { value: 'te', label: 'తెలుగు', enabled: false },
  { value: 'ml', label: 'മലയാളം', enabled: false },
  { value: 'pa', label: 'ਪੰਜਾਬੀ', enabled: false },
  { value: 'kn', label: 'ಕನ್ನಡ', enabled: false },
  { value: 'bn', label: 'বাংলা', enabled: false },
  { value: 'gu', label: 'ગુજરાતી', enabled: false },
] as const

// These are interface labels, not farmer-entered notes or model results. The
// voice workspace keeps its independent spoken-language selector, so changing
// this setting never changes a user's voice language.
const HINDI_TEXT: Record<string, string> = {
  'Home': 'होम',
  'Crop Analyzer': 'फसल विश्लेषक',
  'Ask ShetiMitra': 'शेतीमित्र से पूछें',
  'Schemes': 'योजनाएँ',
  'Advisory Calendar': 'सलाह कैलेंडर',
  'My Farm': 'मेरा खेत',
  'Sign in': 'साइन इन',
  'Profile': 'प्रोफ़ाइल',
  'Log out': 'लॉग आउट',
  'Open notifications': 'सूचनाएँ खोलें',
  'Open menu': 'मेनू खोलें',
  'Close menu': 'मेनू बंद करें',
  'Website language': 'वेबसाइट भाषा',
  'Precision crop health': 'सटीक फसल स्वास्थ्य',
  'See the stress. Act at the right time.': 'तनाव पहचानें। सही समय पर कदम उठाएँ।',
  'Take a leaf photo': 'पत्ते की फोटो लें',
  'CropVision reads the leaf': 'क्रॉपविज़न पत्ते को पढ़ता है',
  'Analyse leaf with ShetiMitra': 'शेतीमित्र से पत्ते का विश्लेषण करें',
  'Open camera': 'कैमरा खोलें',
  'Upload photo': 'फोटो अपलोड करें',
  'Photo ready': 'फोटो तैयार है',
  'Drop a leaf photo here': 'पत्ते की फोटो यहाँ रखें',
  'Remove selected photo': 'चुनी हुई फोटो हटाएँ',
  'Spray-window check': 'छिड़काव समय जाँच',
  'Connect weather to activate': 'सक्रिय करने के लिए मौसम जोड़ें',
  'Use my field location': 'मेरे खेत का स्थान उपयोग करें',
  'Refresh field weather': 'खेत का मौसम फिर जाँचें',
  'Checking your field…': 'आपके खेत की जाँच हो रही है…',
  'ShetiMitra CropVision is ready for live photo screening.': 'शेतीमित्र क्रॉपविज़न लाइव फोटो जाँच के लिए तैयार है।',
  '1 · Capture': '1 · फोटो लें',
  '2 · Analyse': '2 · विश्लेषण',
  'Diagnosis report': 'निदान रिपोर्ट',
  'Visual focus areas': 'दृश्य फोकस क्षेत्र',
  'Confidence': 'विश्वास स्तर',
  'Severity': 'गंभीरता',
  'Affected leaf area': 'प्रभावित पत्ता क्षेत्र',
  'Recommended steps': 'सुझाए गए कदम',
  'Safety note': 'सुरक्षा सूचना',
  'Follow up': 'पुनः जाँच',
  'Add to calendar': 'कैलेंडर में जोड़ें',
  'Your choice': 'आपकी पसंद',
  'Add this treatment plan to your calendar?': 'इस उपचार योजना को अपने कैलेंडर में जोड़ें?',
  'Not now': 'अभी नहीं',
  'Today': 'आज',
  'Tomorrow': 'कल',
  'Calendar': 'कैलेंडर',
  'Add event': 'कार्यक्रम जोड़ें',
  'Add personal event': 'निजी कार्यक्रम जोड़ें',
  'Save event': 'कार्यक्रम सहेजें',
  'Cancel': 'रद्द करें',
  'Previous month': 'पिछला महीना',
  'Next month': 'अगला महीना',
  'Action list': 'कार्य सूची',
  'No planned action': 'कोई नियोजित कार्य नहीं',
  'Treatment': 'उपचार',
  'Personal': 'निजी',
  'Weather': 'मौसम',
  'Check': 'जाँच',
  'Conversation': 'वार्तालाप',
  'Live transcript': 'लाइव प्रतिलेख',
  'Realtime voice assistant': 'रियलटाइम वॉइस सहायक',
  'Disconnected': 'डिस्कनेक्टेड',
  'Connect when you are ready.': 'जब आप तैयार हों तब कनेक्ट करें।',
  'Start conversation': 'बातचीत शुरू करें',
  'Your microphone': 'आपका माइक्रोफ़ोन',
  'Microphone is off': 'माइक्रोफ़ोन बंद है',
  'Type a message or ask about an attached document…': 'संदेश लिखें या संलग्न दस्तावेज़ के बारे में पूछें…',
  'Search schemes': 'योजनाएँ खोजें',
  'Farmer schemes': 'किसान योजनाएँ',
  'Find support for your farm': 'अपने खेत के लिए सहायता खोजें',
  'Eligibility': 'पात्रता',
  'Benefits': 'लाभ',
  'How to apply': 'आवेदन कैसे करें',
  'Official source': 'आधिकारिक स्रोत',
  'Loading…': 'लोड हो रहा है…',
  'Available in 10 Indian languages.': '10 भारतीय भाषाओं में उपलब्ध।',
  'Crop-health guidance supports, not replaces, local expert diagnosis.': 'फसल स्वास्थ्य सलाह स्थानीय विशेषज्ञ के निदान का समर्थन करती है, उसका विकल्प नहीं है।',
}

function translateText(value: string): string {
  const leading = value.match(/^\s*/)?.[0] ?? ''
  const trailing = value.match(/\s*$/)?.[0] ?? ''
  const core = value.slice(leading.length, value.length - trailing.length)
  return `${leading}${HINDI_TEXT[core] ?? core}${trailing}`
}

function shouldSkipText(node: Text): boolean {
  const parent = node.parentElement
  if (!parent) return true
  return Boolean(parent.closest('[data-no-web-translation], input, textarea, select, option, script, style, code, pre'))
}

function applyLanguageToDocument(language: WebsiteLanguage, originals: WeakMap<Text, string>): void {
  const textNodes: Text[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let current: Node | null
  while ((current = walker.nextNode())) textNodes.push(current as Text)

  for (const node of textNodes) {
    if (shouldSkipText(node) || !node.data.trim()) continue
    const existing = originals.get(node)
    if (existing === undefined) {
      originals.set(node, node.data)
    } else {
      const hindi = translateText(existing)
      // React may replace a node's content after a render. Preserve that new
      // English source instead of translating stale text from a prior render.
      if (node.data !== existing && node.data !== hindi) originals.set(node, node.data)
    }
    const source = originals.get(node) ?? node.data
    const desired = language === 'hi' ? translateText(source) : source
    if (node.data !== desired) node.data = desired
  }
}

export function WebLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<WebsiteLanguage>(() => {
    return window.localStorage.getItem(WEBSITE_LANGUAGE_STORAGE_KEY) === 'hi' ? 'hi' : 'en'
  })
  const originals = useRef(new WeakMap<Text, string>())
  const value = useMemo(() => ({ language, setLanguage }), [language])

  useEffect(() => {
    window.localStorage.setItem(WEBSITE_LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
    applyLanguageToDocument(language, originals.current)
    const observer = new MutationObserver(() => applyLanguageToDocument(language, originals.current))
    observer.observe(document.body, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }, [language])

  return <WebsiteLanguageContext.Provider value={value}>{children}</WebsiteLanguageContext.Provider>
}

export function WebsiteLanguageSelector() {
  const context = useContext(WebsiteLanguageContext)
  if (!context) throw new Error('WebsiteLanguageSelector must be used within WebLanguageProvider.')

  return (
    <label className="website-language-selector" data-no-web-translation>
      <Languages aria-hidden="true" size={16} />
      <span className="sr-only">Website language</span>
      <select aria-label="Website language" onChange={(event) => context.setLanguage(event.target.value as WebsiteLanguage)} value={context.language}>
        {WEBSITE_LANGUAGES.map((option) => (
          <option disabled={!option.enabled} key={option.value} value={option.value}>{option.label}{option.enabled ? '' : ' — soon'}</option>
        ))}
      </select>
    </label>
  )
}
