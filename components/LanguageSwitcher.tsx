'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-[0_4px_16px_rgba(15,23,42,0.10)] backdrop-blur">
      <button
        type="button"
        onClick={() => setLang('pt')}
        title="Português (Brasil)"
        aria-label="Português (Brasil)"
        className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all ${
          lang === 'pt'
            ? 'bg-slate-900 shadow-sm'
            : 'opacity-50 hover:opacity-80'
        }`}
      >
        🇧🇷
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        title="English (US)"
        aria-label="English (US)"
        className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all ${
          lang === 'en'
            ? 'bg-slate-900 shadow-sm'
            : 'opacity-50 hover:opacity-80'
        }`}
      >
        🇺🇸
      </button>
    </div>
  )
}
