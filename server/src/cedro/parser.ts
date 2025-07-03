// 🔍 Parser de mensagens da Cedro API
import { createLogger } from '../utils/logger';

const logger = createLogger('CedroParser');

export interface CedroMessage {
  type: 'T' | 'B' | 'V' | 'Z' | 'O' | 'G' | 'E';
  symbol: string;
  timestamp: string;
  data: any;
  raw: string;
}

export interface QuoteData {
  symbol: string;
  timestamp: string;
  lastPrice?: number;
  bidPrice?: number;
  askPrice?: number;
  lastTradeTime?: string;
  currentVolume?: number;
  lastVolume?: number;
  totalTrades?: number;
  accumulatedVolume?: number;
  financialVolume?: number;
  highPrice?: number;
  lowPrice?: number;
  previousClose?: number;
  openPrice?: number;
  bidTime?: string;
  askTime?: string;
  bidVolume?: number;
  askVolume?: number;
  variation?: number;
  marketCode?: number;
  assetType?: number;
  standardLot?: number;
  description?: string;
  status?: number;
}

export interface BookData {
  symbol: string;
  operation: 'A' | 'U' | 'D' | 'E'; // Add, Update, Delete, Error
  position?: number;
  side?: 'A' | 'V'; // Ask (Venda) | Bid (Compra)
  price?: number;
  volume?: number;
  broker?: number;
  datetime?: string;
  orderId?: string;
  orderType?: 'L' | 'O'; // Limitada | Abertura
}

export interface TradeData {
  symbol: string;
  operation: string;
  time: string;
  price: number;
  buyerBroker: number;
  sellerBroker: number;
  volume: number;
  tradeId: string;
  condition?: string;
  aggressor?: string;
}

export class CedroMessageParser {
  
  parseMessage(rawMessage: string): CedroMessage | null {
    try {
      if (!rawMessage || rawMessage.length < 3) {
        return null;
      }

      const type = rawMessage.charAt(0) as CedroMessage['type'];
      
      logger.debug('🔍 Parseando mensagem', { type, length: rawMessage.length });
      
      switch (type) {
        case 'T': // Quote (SQT)
          return this.parseQuoteMessage(rawMessage);
        case 'B': // Book (BQT)
          return this.parseBookMessage(rawMessage);
        case 'V': // Trade (GQT)
          return this.parseTradeMessage(rawMessage);
        case 'Z': // Aggregated Book (SAB)
          return this.parseAggregatedBookMessage(rawMessage);
        case 'E': // Error
          return this.parseErrorMessage(rawMessage);
        default:
          logger.warn('⚠️ Tipo de mensagem desconhecido:', { type, message: rawMessage.substring(0, 100) });
          return null;
      }
    } catch (error) {
      logger.error('❌ Erro ao parsear mensagem:', { error, message: rawMessage.substring(0, 100) });
      return null;
    }
  }

  private parseQuoteMessage(message: string): CedroMessage {
    // Formato: T:SYMBOL:TIME:INDEX:VALUE:INDEX:VALUE:...!
    const parts = message.split(':');
    
    if (parts.length < 3) {
      throw new Error('Formato de mensagem Quote inválido');
    }
    
    const symbol = parts[1];
    const timestamp = parts[2];
    
    const data: QuoteData = {
      symbol,
      timestamp
    };
    
    // Processar pares índice:valor
    for (let i = 3; i < parts.length - 1; i += 2) {
      if (i + 1 >= parts.length) break;
      
      const index = parseInt(parts[i]);
      const value = parts[i + 1];
      
      // Mapear índices conforme documentação Cedro
      this.mapQuoteIndex(data, index, value);
    }

    return {
      type: 'T',
      symbol,
      timestamp,
      data,
      raw: message
    };
  }

  private mapQuoteIndex(data: QuoteData, index: number, value: string): void {
    switch (index) {
      case 0: data.timestamp = value; break; // Horário última modificação
      case 2: data.lastPrice = parseFloat(value); break; // Preço último negócio
      case 3: data.bidPrice = parseFloat(value); break; // Melhor oferta compra
      case 4: data.askPrice = parseFloat(value); break; // Melhor oferta venda
      case 5: data.lastTradeTime = value; break; // Horário último negócio
      case 6: data.currentVolume = parseInt(value); break; // Quantidade negócio atual
      case 7: data.lastVolume = parseInt(value); break; // Quantidade último negócio
      case 8: data.totalTrades = parseInt(value); break; // Quantidade de negócios
      case 9: data.accumulatedVolume = parseInt(value); break; // Volume acumulado
      case 10: data.financialVolume = parseFloat(value); break; // Volume financeiro
      case 11: data.highPrice = parseFloat(value); break; // Maior preço do dia
      case 12: data.lowPrice = parseFloat(value); break; // Menor preço do dia
      case 13: data.previousClose = parseFloat(value); break; // Fechamento anterior
      case 14: data.openPrice = parseFloat(value); break; // Preço de abertura
      case 15: data.bidTime = value; break; // Horário melhor oferta compra
      case 16: data.askTime = value; break; // Horário melhor oferta venda
      case 19: data.bidVolume = parseInt(value); break; // Volume melhor oferta compra
      case 20: data.askVolume = parseInt(value); break; // Volume melhor oferta venda
      case 21: data.variation = parseFloat(value); break; // Variação
      case 44: data.marketCode = parseInt(value); break; // Código do mercado
      case 45: data.assetType = parseInt(value); break; // Tipo do ativo
      case 46: data.standardLot = parseInt(value); break; // Lote padrão
      case 47: data.description = value; break; // Descrição do ativo
      case 67: data.status = parseInt(value); break; // Status do instrumento
      default:
        logger.debug('🔍 Índice Quote não mapeado:', { index, value });
    }
  }

  private parseBookMessage(message: string): CedroMessage {
    // Formato: B:SYMBOL:OPERATION:...
    const parts = message.split(':');
    
    if (parts.length < 3) {
      throw new Error('Formato de mensagem Book inválido');
    }
    
    const symbol = parts[1];
    const operation = parts[2] as BookData['operation'];
    
    const data: BookData = { symbol, operation };
    
    switch (operation) {
      case 'A': // Add
        if (parts.length >= 11) {
          data.position = parseInt(parts[3]);
          data.side = parts[4] as 'A' | 'V';
          data.price = parseFloat(parts[5]);
          data.volume = parseInt(parts[6]);
          data.broker = parseInt(parts[7]);
          data.datetime = parts[8];
          data.orderId = parts[9];
          data.orderType = parts[10] as 'L' | 'O';
        }
        break;
        
      case 'U': // Update
        if (parts.length >= 12) {
          data.position = parseInt(parts[4]); // Nova posição
          data.side = parts[5] as 'A' | 'V';
          data.price = parseFloat(parts[6]);
          data.volume = parseInt(parts[7]);
          data.broker = parseInt(parts[8]);
          data.datetime = parts[9];
          data.orderId = parts[10];
          data.orderType = parts[11] as 'L' | 'O';
        }
        break;
        
      case 'D': // Delete
        if (parts.length >= 6) {
          data.side = parts[4] as 'A' | 'V';
          data.position = parseInt(parts[5]);
        }
        break;
    }

    return {
      type: 'B',
      symbol,
      timestamp: new Date().toISOString(),
      data,
      raw: message
    };
  }

  private parseTradeMessage(message: string): CedroMessage {
    // Formato: V:SYMBOL:OPERATION:TIME:PRICE:BUYER:SELLER:VOLUME:TRADEID:...
    const parts = message.split(':');
    
    if (parts.length < 9) {
      throw new Error('Formato de mensagem Trade inválido');
    }
    
    const symbol = parts[1];
    
    const data: TradeData = {
      symbol,
      operation: parts[2],
      time: parts[3],
      price: parseFloat(parts[4]),
      buyerBroker: parseInt(parts[5]),
      sellerBroker: parseInt(parts[6]),
      volume: parseInt(parts[7]),
      tradeId: parts[8],
      condition: parts[9] || '',
      aggressor: parts[10] || ''
    };

    return {
      type: 'V',
      symbol,
      timestamp: new Date().toISOString(),
      data,
      raw: message
    };
  }

  private parseAggregatedBookMessage(message: string): CedroMessage {
    // Similar ao parseBookMessage mas para livro agregado
    return this.parseBookMessage(message);
  }

  private parseErrorMessage(message: string): CedroMessage {
    const parts = message.split(':');
    const errorCode = parts[1] || 'UNKNOWN';
    const errorMessage = parts.slice(2).join(':') || 'Erro desconhecido';
    
    return {
      type: 'E',
      symbol: '',
      timestamp: new Date().toISOString(),
      data: {
        code: errorCode,
        message: errorMessage
      },
      raw: message
    };
  }
}
