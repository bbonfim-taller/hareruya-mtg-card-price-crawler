export interface CardSet {
  name: string;
  code: string;
}

export interface CardItem {
  id: string;
  name: string;
  cardName: string;
  priceText: string;
  priceNumeric: number;
  stockText: string;
  stockNumeric: number;
  imageUrl: string;
  detailUrl: string;
  weeklySales: number;
  foil: boolean;
  language: string;
  condition: string;
  ligaPriceMin?: number;
  ligaPriceMed?: number;
  ligaPriceMax?: number;
  ligaNamePt?: string;
  ligaDetailUrl?: string;
  ligaStatus?: 'live' | 'estimated_cloudflare_block' | 'estimated_no_match';
  fourZeroOnePrice?: number;
  fourZeroOnePriceMin?: number;
  fourZeroOnePriceMax?: number;
  fourZeroOneDetailUrl?: string;
  fourZeroOneAvailable?: boolean;
  fourZeroOneStatus?: 'live' | 'not_found' | 'error';
}

export interface SearchHistoryItem {
  cardsetCode: string;
  cardsetName: string;
  timestamp: number;
  keyword: string;
}
