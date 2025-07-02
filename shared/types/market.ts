// 📊 Tipos para dados de mercado
export interface MarketData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
}

export interface OrderFlowData {
  symbol: string;
  timestamp: number;
  buyVolume: number;
  sellVolume: number;
  imbalanceRatio: number;
  intensity: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';
  bigPlayersDetected: boolean;
}

export interface FootprintData {
  symbol: string;
  timestamp: number;
  priceLevel: number;
  bidVolume: number;
  askVolume: number;
  delta: number;
  trades: number;
}
