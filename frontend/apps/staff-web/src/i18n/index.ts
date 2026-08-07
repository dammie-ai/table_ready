import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import pt from './locales/pt.json'
import it from './locales/it.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import ar from './locales/ar.json'
import hi from './locales/hi.json'
import ru from './locales/ru.json'
import tr from './locales/tr.json'
import vi from './locales/vi.json'
import pl from './locales/pl.json'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'pl', label: 'Polski' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']
const RTL_LANGUAGES = new Set(['ar'])
const STORAGE_KEY = 'tableready_language'

function applyDocumentDirection(code: string) {
  if (typeof document === 'undefined') return
  document.documentElement.dir = RTL_LANGUAGES.has(code) ? 'rtl' : 'ltr'
  document.documentElement.lang = code
}

const storedLanguage = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
const initialLanguage = storedLanguage && LANGUAGES.some((l) => l.code === storedLanguage) ? storedLanguage : 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    pt: { translation: pt },
    it: { translation: it },
    zh: { translation: zh },
    ja: { translation: ja },
    ko: { translation: ko },
    ar: { translation: ar },
    hi: { translation: hi },
    ru: { translation: ru },
    tr: { translation: tr },
    vi: { translation: vi },
    pl: { translation: pl },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

applyDocumentDirection(initialLanguage)

// Each staff member picks their own display language — stored locally on
// their device (localStorage), not in restaurant settings, so a manager
// switching to Spanish doesn't change what a waiter on another device sees.
export function setLanguage(code: LanguageCode) {
  localStorage.setItem(STORAGE_KEY, code)
  i18n.changeLanguage(code)
  applyDocumentDirection(code)
}

export default i18n
