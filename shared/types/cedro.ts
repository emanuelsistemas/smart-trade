// 📡 Tipos para integração com Cedro API
export interface CedroConfig {
  host: string;
  port: number;
  softwareKey?: string;
  username: string;
  password: string;
  timeout: number;
  maxReconnectAttempts: number;
}

export interface CedroMessage {
  type: 'T' | 'B' | 'V' | 'Z' | 'O' | 'G' | 'E';
  symbol: string;
  timestamp: string;
  data: any;
}

export interface TickData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  side: 'BUY' | 'SELL';
  aggressor: boolean;
  tradeId: string;
}

export interface BookData {
  symbol: string;
  timestamp: number;
  bids: BookLevel[];
  asks: BookLevel[];
}

export interface BookLevel {
  position: number;
  price: number;
  volume: number;
  orders: number;
  broker?: number;
}
