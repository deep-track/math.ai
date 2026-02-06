import { useEffect, useState } from 'react'
import { getLanguage } from '../utils/translations'

export type AppLanguage = 'en' | 'fr'

export function useLanguage(): AppLanguage {
  const [language, setLanguage] = useState<AppLanguage>(getLanguage())

  useEffect(() => {
    if (!localStorage.getItem('app-language')) {
      localStorage.setItem('app-language', language)
    }
  }, [language])

  useEffect(() => {
    const handleLanguageChanged = (e: Event) => {
      const ev = e as CustomEvent
      const next = (ev.detail as AppLanguage) || getLanguage()
      setLanguage(next)
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app-language') {
        setLanguage(getLanguage())
      }
    }

    window.addEventListener('languageChanged', handleLanguageChanged)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChanged)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return language
}
