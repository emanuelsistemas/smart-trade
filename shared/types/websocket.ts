// 🔌 Tipos para comunicação WebSocket
export interface WebSocketMessage {
  type: 'MARKET_DATA' | 'ORDER_FLOW' | 'FOOTPRINT' | 'ERROR' | 'PING' | 'PONG';
  payload: any;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
}
