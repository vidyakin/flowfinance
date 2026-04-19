import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n } from '@/i18n'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'light' | 'dark'>('light')
  const locale = ref<'ru' | 'en'>('en')
  const currency = ref<'RUB' | 'USD' | 'EUR' | 'AED' | 'GBP'>('USD')
  const settingsModalOpen = ref(false)
  const minBalance = ref<number>(0)

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

  function setMinBalance(amount: number) {
    minBalance.value = amount
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
        if (typeof data.minBalance === 'number') minBalance.value = data.minBalance
      } catch {}
    }
  }

  function _save() {
    localStorage.setItem(
      'flowfinance-settings',
      JSON.stringify({ theme: theme.value, locale: locale.value, currency: currency.value, minBalance: minBalance.value }),
    )
  }

  return {
    theme,
    locale,
    currency,
    settingsModalOpen,
    minBalance,
    setTheme,
    toggleTheme,
    setLocale,
    setCurrency,
    setMinBalance,
    init,
  }
})
