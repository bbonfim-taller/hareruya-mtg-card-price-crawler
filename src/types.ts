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
}

export interface SearchHistoryItem {
  cardsetCode: string;
  cardsetName: string;
  timestamp: number;
  keyword: string;
}
