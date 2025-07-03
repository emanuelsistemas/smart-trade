// 🔴 Gerenciador Redis para Smart-Trade
import Redis from 'ioredis';
import { createLogger } from '../utils/logger';

const logger = createLogger('RedisManager');

export interface CacheConfig {
  ttl: number; // Time to live em segundos
  maxSize?: number; // Tamanho máximo da lista/set
}

export interface QuoteCacheData {
  symbol: string;
  timestamp: number;
  lastPrice?: number;
  bidPrice?: number;
  askPrice?: number;
  volume?: number;
  change?: number;
}

export interface BookCacheData {
  symbol: string;
  timestamp: number;
  bids: Array<{ price: number; volume: number; position: number }>;
  asks: Array<{ price: number; volume: number; position: number }>;
}

export interface TradeCacheData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  side: 'BUY' | 'SELL';
  tradeId: string;
}

export class TradingRedisManager {
  private redis: Redis;
  private isConnected: boolean = false;
  
  // Configurações de cache por tipo
  private readonly cacheConfigs = {
    quote: { ttl: 1 }, // 1 segundo
    book: { ttl: 0.5 }, // 500ms
    trades: { ttl: 300, maxSize: 1000 }, // 5 minutos, máximo 1000 trades
    orderFlow: { ttl: 300 }, // 5 minutos
    footprint: { ttl: 600 }, // 10 minutos
    vap: { ttl: 1800 } // 30 minutos
  };

  constructor(redisUrl?: string) {
    logger.info('🔴 Inicializando Redis Manager...');
    
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    } else {
      // Configuração padrão para desenvolvimento
      this.redis = new Redis({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: false
      });
    }
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('🔴 Conectando ao Redis...');
    });

    this.redis.on('ready', () => {
      logger.info('✅ Redis conectado e pronto');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      logger.error('❌ Erro Redis:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      logger.warn('❌ Conexão Redis fechada');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      logger.info('🔄 Reconectando ao Redis...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      logger.info('✅ Redis Manager inicializado');
    } catch (error) {
      logger.warn('⚠️ Redis não disponível, funcionando sem cache:', error);
      // Não falhar se Redis não estiver disponível
    }
  }

  // === COTAÇÕES (QUOTES) ===
  
  async setCurrentQuote(symbol: string, data: QuoteCacheData): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const key = `quote:${symbol}`;
      const value = JSON.stringify(data);
      
      await this.redis.setex(key, this.cacheConfigs.quote.ttl, value);
      logger.debug(`📊 Quote cached: ${symbol}`);
      
    } catch (error) {
      logger.error('❌ Erro ao cachear quote:', error);
    }
  }

  async getCurrentQuote(symbol: string): Promise<QuoteCacheData | null> {
    if (!this.isConnected) return null;
    
    try {
      const key = `quote:${symbol}`;
      const value = await this.redis.get(key);
      
      if (value) {
        return JSON.parse(value);
      }
      
      return null;
      
    } catch (error) {
      logger.error('❌ Erro ao buscar quote:', error);
      return null;
    }
  }

  // === BOOK DE OFERTAS ===
  
  async setOrderBook(symbol: string, book: BookCacheData): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const key = `book:${symbol}`;
      const value = JSON.stringify(book);
      
      await this.redis.setex(key, this.cacheConfigs.book.ttl, value);
      logger.debug(`📖 Book cached: ${symbol}`);
      
    } catch (error) {
      logger.error('❌ Erro ao cachear book:', error);
    }
  }

  async getOrderBook(symbol: string): Promise<BookCacheData | null> {
    if (!this.isConnected) return null;
    
    try {
      const key = `book:${symbol}`;
      const value = await this.redis.get(key);
      
      if (value) {
        return JSON.parse(value);
      }
      
      return null;
      
    } catch (error) {
      logger.error('❌ Erro ao buscar book:', error);
      return null;
    }
  }

  // === TRADES (BUFFER CIRCULAR) ===
  
  async addTrade(symbol: string, trade: TradeCacheData): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const key = `trades:${symbol}`;
      const value = JSON.stringify(trade);
      
      // Adicionar no início da lista
      await this.redis.lpush(key, value);
      
      // Manter apenas os últimos N trades
      const maxSize = this.cacheConfigs.trades.maxSize || 1000;
      await this.redis.ltrim(key, 0, maxSize - 1);
      
      // Definir TTL
      await this.redis.expire(key, this.cacheConfigs.trades.ttl);
      
      logger.debug(`💰 Trade cached: ${symbol}`);
      
    } catch (error) {
      logger.error('❌ Erro ao cachear trade:', error);
    }
  }

  async getRecentTrades(symbol: string, limit: number = 100): Promise<TradeCacheData[]> {
    if (!this.isConnected) return [];
    
    try {
      const key = `trades:${symbol}`;
      const values = await this.redis.lrange(key, 0, limit - 1);
      
      return values.map(value => JSON.parse(value));
      
    } catch (error) {
      logger.error('❌ Erro ao buscar trades:', error);
      return [];
    }
  }

  // === ORDER FLOW ANALYSIS ===
  
  async setOrderFlow(symbol: string, analysis: any): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const key = `orderflow:${symbol}`;
      const value = JSON.stringify(analysis);
      
      await this.redis.setex(key, this.cacheConfigs.orderFlow.ttl, value);
      logger.debug(`📊 Order Flow cached: ${symbol}`);
      
    } catch (error) {
      logger.error('❌ Erro ao cachear order flow:', error);
    }
  }

  async getOrderFlow(symbol: string): Promise<any | null> {
    if (!this.isConnected) return null;
    
    try {
      const key = `orderflow:${symbol}`;
      const value = await this.redis.get(key);
      
      if (value) {
        return JSON.parse(value);
      }
      
      return null;
      
    } catch (error) {
      logger.error('❌ Erro ao buscar order flow:', error);
      return null;
    }
  }

  // === FOOTPRINT DATA ===
  
  async setFootprint(symbol: string, timeframe: string, data: any): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const key = `footprint:${symbol}:${timeframe}`;
      const value = JSON.stringify(data);
      
      await this.redis.setex(key, this.cacheConfigs.footprint.ttl, value);
      logger.debug(`🦶 Footprint cached: ${symbol}:${timeframe}`);
      
    } catch (error) {
      logger.error('❌ Erro ao cachear footprint:', error);
    }
  }

  async getFootprint(symbol: string, timeframe: string): Promise<any | null> {
    if (!this.isConnected) return null;
    
    try {
      const key = `footprint:${symbol}:${timeframe}`;
      const value = await this.redis.get(key);
      
      if (value) {
        return JSON.parse(value);
      }
      
      return null;
      
    } catch (error) {
      logger.error('❌ Erro ao buscar footprint:', error);
      return null;
    }
  }

  // === VOLUME AT PRICE (VAP) ===
  
  async setVAP(symbol: string, period: string, data: any): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const key = `vap:${symbol}:${period}`;
      const value = JSON.stringify(data);
      
      await this.redis.setex(key, this.cacheConfigs.vap.ttl, value);
      logger.debug(`📊 VAP cached: ${symbol}:${period}`);
      
    } catch (error) {
      logger.error('❌ Erro ao cachear VAP:', error);
    }
  }

  async getVAP(symbol: string, period: string): Promise<any | null> {
    if (!this.isConnected) return null;
    
    try {
      const key = `vap:${symbol}:${period}`;
      const value = await this.redis.get(key);
      
      if (value) {
        return JSON.parse(value);
      }
      
      return null;
      
    } catch (error) {
      logger.error('❌ Erro ao buscar VAP:', error);
      return null;
    }
  }

  // === UTILITÁRIOS ===
  
  // Limpar cache de um símbolo
  async clearSymbolCache(symbol: string): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const patterns = [
        `quote:${symbol}`,
        `book:${symbol}`,
        `trades:${symbol}`,
        `orderflow:${symbol}`,
        `footprint:${symbol}:*`,
        `vap:${symbol}:*`
      ];
      
      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          await this.redis.del(pattern);
        }
      }
      
      logger.info(`🧹 Cache limpo para símbolo: ${symbol}`);
      
    } catch (error) {
      logger.error('❌ Erro ao limpar cache:', error);
    }
  }

  // Estatísticas do cache
  async getCacheStats(): Promise<object> {
    if (!this.isConnected) {
      return { connected: false };
    }
    
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Contar chaves por tipo
      const patterns = ['quote:*', 'book:*', 'trades:*', 'orderflow:*', 'footprint:*', 'vap:*'];
      const counts: any = {};
      
      for (const pattern of patterns) {
        const type = pattern.split(':')[0];
        const keys = await this.redis.keys(pattern);
        counts[type] = keys.length;
      }
      
      return {
        connected: true,
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        keysByType: counts
      };
      
    } catch (error) {
      logger.error('❌ Erro ao buscar estatísticas:', error);
      return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Flush completo do cache (cuidado!)
  async flushAll(): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await this.redis.flushall();
      logger.warn('🧹 Cache Redis completamente limpo');
      
    } catch (error) {
      logger.error('❌ Erro ao limpar cache:', error);
    }
  }

  // Verificar se está conectado
  get connected(): boolean {
    return this.isConnected;
  }

  // Fechar conexão
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('✅ Redis desconectado');
    } catch (error) {
      logger.error('❌ Erro ao desconectar Redis:', error);
    }
  }

  // Utilitário para parsear info do Redis
  private parseRedisInfo(info: string): object {
    const result: any = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    return result;
  }
}
