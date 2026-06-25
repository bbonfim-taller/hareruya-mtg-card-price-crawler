export type CurrencyType = 'JPY' | 'BRL' | 'USD' | 'EUR';

export const DEFAULT_RATES: Record<CurrencyType, number> = {
  JPY: 1.0,
  BRL: 0.035,  // 1 JPY ≈ 0.035 BRL
  USD: 0.0063, // 1 JPY ≈ 0.0063 USD
  EUR: 0.0059  // 1 JPY ≈ 0.0059 EUR
};

export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  JPY: '¥',
  BRL: 'R$',
  USD: '$',
  EUR: '€'
};

export function formatPrice(jpyAmount: number, currency: CurrencyType, rates: Record<CurrencyType, number>): string {
  if (jpyAmount === 0) return 'Out of Stock / No Price';
  const rate = rates[currency] || DEFAULT_RATES[currency] || 1;
  const converted = jpyAmount * rate;

  switch (currency) {
    case 'JPY':
      return `¥${Math.round(converted).toLocaleString('ja-JP')}`;
    case 'BRL':
      return `R$ ${converted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'USD':
      return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'EUR':
      return `€${converted.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default:
      return `¥${Math.round(converted).toLocaleString('ja-JP')}`;
  }
}
