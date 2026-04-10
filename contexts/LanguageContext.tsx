'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { translations, type Lang, type Translations } from '@/lib/i18n'

const STORAGE_KEY = 'vamosurfar_lang'

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translations
  dateLocale: string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'pt',
  setLang: () => {},
  t: translations.pt,
  dateLocale: 'pt-BR',
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('pt')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'pt') {
      setLangState(stored)
    }
  }, [])

  function setLang(next: Lang) {
    setLangState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const dateLocale = lang === 'en' ? 'en-US' : 'pt-BR'

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang], dateLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
