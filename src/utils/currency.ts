export type CurrencyType = 'JPY' | 'BRL' | 'USD' | 'EUR' | 'CAD';

export const DEFAULT_RATES: Record<CurrencyType, number> = {
  JPY: 1.0,
  BRL: 0.035,  // 1 JPY ≈ 0.035 BRL
  USD: 0.0063, // 1 JPY ≈ 0.0063 USD
  EUR: 0.0059, // 1 JPY ≈ 0.0059 EUR
  CAD: 0.0087  // 1 JPY ≈ 0.0087 CAD
};

export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  JPY: '¥',
  BRL: 'R$',
  USD: '$',
  EUR: '€',
  CAD: 'CA$'
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
    case 'CAD':
      return `CA$ ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default:
      return `¥${Math.round(converted).toLocaleString('ja-JP')}`;
  }
}

export function convertBrlPrice(brlAmount: number, targetCurrency: CurrencyType, rates: Record<CurrencyType, number>): number {
  if (!brlAmount) return 0;
  if (targetCurrency === 'BRL') return brlAmount;

  const brlRate = rates['BRL'] || DEFAULT_RATES['BRL'] || 0.035;
  const targetRate = rates[targetCurrency] || DEFAULT_RATES[targetCurrency] || 1;

  // Direct cross-rate conversion from BRL to target currency
  const brlToTargetRate = targetRate / brlRate;
  return brlAmount * brlToTargetRate;
}

export function formatBrlPrice(brlAmount: number, currency: CurrencyType, rates: Record<CurrencyType, number>): string {
  if (!brlAmount) return 'No Price';
  const converted = convertBrlPrice(brlAmount, currency, rates);
  switch (currency) {
    case 'JPY':
      return `¥${Math.round(converted).toLocaleString('ja-JP')}`;
    case 'BRL':
      return `R$ ${brlAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'USD':
      return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'EUR':
      return `€${converted.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'CAD':
      return `CA$ ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default:
      return `R$ ${brlAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function convertCadPrice(cadAmount: number, targetCurrency: CurrencyType, rates: Record<CurrencyType, number>): number {
  if (!cadAmount) return 0;
  if (targetCurrency === 'CAD') return cadAmount;

  const cadRate = rates['CAD'] || DEFAULT_RATES['CAD'] || 0.0087;
  const targetRate = rates[targetCurrency] || DEFAULT_RATES[targetCurrency] || 1;

  // Direct cross-rate conversion from CAD to target currency
  const cadToTargetRate = targetRate / cadRate;
  return cadAmount * cadToTargetRate;
}

export function formatCadPrice(cadAmount: number, currency: CurrencyType, rates: Record<CurrencyType, number>): string {
  if (!cadAmount) return 'No Price';
  const converted = convertCadPrice(cadAmount, currency, rates);
  switch (currency) {
    case 'JPY':
      return `¥${Math.round(converted).toLocaleString('ja-JP')}`;
    case 'CAD':
      return `CA$ ${cadAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'BRL':
      return `R$ ${converted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'USD':
      return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'EUR':
      return `€${converted.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default:
      return `CA$ ${cadAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
