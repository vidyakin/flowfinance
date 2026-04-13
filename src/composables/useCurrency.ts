import { useSettingsStore } from '@/stores/settings'

const CURRENCY_CONFIG = {
  RUB: { locale: 'ru-RU', currency: 'RUB' },
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
  AED: { locale: 'ar-AE', currency: 'AED' },
  GBP: { locale: 'en-GB', currency: 'GBP' },
}

export function useCurrency() {
  const settings = useSettingsStore()

  function format(amount: number): string {
    const config = CURRENCY_CONFIG[settings.currency]
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return { format }
}
