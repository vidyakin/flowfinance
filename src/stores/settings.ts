import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n } from '@/i18n'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'light' | 'dark'>('light')
  const locale = ref<'ru' | 'en'>('en')
  const currency = ref<'RUB' | 'USD' | 'EUR' | 'AED' | 'GBP'>('USD')
  const settingsModalOpen = ref(false)

  function setTheme(t: 'light' | 'dark') {
    theme.value = t
    if (t === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    _save()
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  function setLocale(l: 'ru' | 'en') {
    locale.value = l
    ;(i18n.global.locale as any).value = l
    _save()
  }

  function setCurrency(c: 'RUB' | 'USD' | 'EUR' | 'AED' | 'GBP') {
    currency.value = c
    _save()
  }

  function init() {
    const saved = localStorage.getItem('flowfinance-settings')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.theme) setTheme(data.theme)
        if (data.locale) setLocale(data.locale)
        if (data.currency) setCurrency(data.currency)
      } catch {}
    }
  }

  function _save() {
    localStorage.setItem(
      'flowfinance-settings',
      JSON.stringify({ theme: theme.value, locale: locale.value, currency: currency.value }),
    )
  }

  return {
    theme,
    locale,
    currency,
    settingsModalOpen,
    setTheme,
    toggleTheme,
    setLocale,
    setCurrency,
    init,
  }
})
