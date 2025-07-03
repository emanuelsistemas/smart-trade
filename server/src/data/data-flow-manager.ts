// 🌊 Gerenciador de Fluxo de Dados - Smart-Trade
import { EventEmitter } from 'events';
import { TradingSQLiteManager, TickRecord, OrderFlowRecord, FootprintRecord } from './sqlite-manager';
import { TradingRedisManager, QuoteCacheData, BookCacheData, TradeCacheData } from './redis-manager';
import { CedroMessage, QuoteData, BookData, TradeData } from '../cedro/parser';
import { createLogger } from '../utils/logger';

const logger = createLogger('DataFlowManager');

export interface DataFlowConfig {
  batchSize: number;
  batchInterval: number; // ms
  bufferSize: number;
}

export class DataFlowManager extends EventEmitter {
  private sqlite: TradingSQLiteManager;
  private redis: TradingRedisManager;
  private config: DataFlowConfig;
  
  // Buffers para batch processing
  private tickBuffer: TickRecord[] = [];
  private orderFlowBuffer: OrderFlowRecord[] = [];
  private footprintBuffer: FootprintRecord[] = [];
  
  // Timers para flush automático
  private batchTimer: NodeJS.Timeout | null = null;
  
  // Estatísticas
  private stats = {
    messagesProcessed: 0,
    ticksStored: 0,
    cacheHits: 0,
    cacheMisses: 0,
    batchesProcessed: 0,
    errors: 0
  };

  constructor(
    sqlite: TradingSQLiteManager,
    redis: TradingRedisManager,
    config: DataFlowConfig
  ) {
    super();
    this.sqlite = sqlite;
    this.redis = redis;
    this.config = config;
    
    logger.info('🌊 Data Flow Manager inicializado', { config });
    this.startBatchTimer();
  }

  // === PROCESSAMENTO DE MENSAGENS CEDRO ===
  
  async processMarketData(message: CedroMessage): Promise<void> {
    try {
      this.stats.messagesProcessed++;
      
      switch (message.type) {
        case 'T': // Quote
          await this.processQuoteData(message);
          break;
          
        case 'B': // Book
          await this.processBookData(message);
          break;
          
        case 'V': // Trade
          await this.processTradeData(message);
          break;
          
        case 'Z': // Aggregated Book
          await this.processAggregatedBookData(message);
          break;
          
        default:
          logger.debug('🔍 Tipo de mensagem não processado:', message.type);
      }
      
      // Emitir evento para outros componentes
      this.emit('dataProcessed', {
        type: message.type,
        symbol: message.symbol,
        timestamp: message.timestamp
      });
      
    } catch (error) {
      this.stats.errors++;
      logger.error('❌ Erro ao processar dados de mercado:', error);
      this.emit('error', error);
    }
  }

  private async processQuoteData(message: CedroMessage): Promise<void> {
    const quoteData = message.data as QuoteData;
    
    // Cache no Redis (tempo real)
    const cacheData: QuoteCacheData = {
      symbol: message.symbol,
      timestamp: Date.now(),
      lastPrice: quoteData.lastPrice,
      bidPrice: quoteData.bidPrice,
      askPrice: quoteData.askPrice,
      volume: quoteData.currentVolume,
      change: quoteData.variation
    };
    
    await this.redis.setCurrentQuote(message.symbol, cacheData);
    
    logger.debug('📊 Quote processada:', {
      symbol: message.symbol,
      lastPrice: quoteData.lastPrice,
      bidPrice: quoteData.bidPrice,
      askPrice: quoteData.askPrice
    });
  }

  private async processBookData(message: CedroMessage): Promise<void> {
    const bookData = message.data as BookData;
    
    // Para book, vamos manter apenas o estado atual no Redis
    // TODO: Implementar lógica completa de book building
    
    logger.debug('📖 Book processado:', {
      symbol: message.symbol,
      operation: bookData.operation,
      side: bookData.side,
      price: bookData.price,
      volume: bookData.volume
    });
  }

  private async processTradeData(message: CedroMessage): Promise<void> {
    const tradeData = message.data as TradeData;
    
    // 1. Cache no Redis (buffer circular)
    const cacheData: TradeCacheData = {
      symbol: message.symbol,
      timestamp: Date.now(),
      price: tradeData.price,
      volume: tradeData.volume,
      side: this.determineTradeSide(tradeData),
      tradeId: tradeData.tradeId
    };
    
    await this.redis.addTrade(message.symbol, cacheData);
    
    // 2. Adicionar ao buffer para SQLite
    const tickRecord: TickRecord = {
      symbol: message.symbol,
      timestamp: Date.now(),
      price: tradeData.price,
      volume: tradeData.volume,
      side: this.determineTradeSide(tradeData),
      aggressor: this.determineAggressor(tradeData),
      trade_id: tradeData.tradeId,
      broker_buyer: tradeData.buyerBroker,
      broker_seller: tradeData.sellerBroker
    };
    
    this.addToTickBuffer(tickRecord);
    
    logger.debug('💰 Trade processado:', {
      symbol: message.symbol,
      price: tradeData.price,
      volume: tradeData.volume,
      side: tickRecord.side
    });
  }

  private async processAggregatedBookData(message: CedroMessage): Promise<void> {
    // Similar ao processBookData, mas para livro agregado
    logger.debug('📚 Aggregated Book processado:', {
      symbol: message.symbol
    });
  }

  // === BUFFER MANAGEMENT ===
  
  private addToTickBuffer(tick: TickRecord): void {
    this.tickBuffer.push(tick);
    
    // Flush se buffer estiver cheio
    if (this.tickBuffer.length >= this.config.batchSize) {
      this.flushTickBuffer();
    }
  }

  private async flushTickBuffer(): Promise<void> {
    if (this.tickBuffer.length === 0) return;
    
    try {
      const ticks = [...this.tickBuffer];
      this.tickBuffer = [];
      
      await this.sqlite.insertTicksBatch(ticks);
      
      this.stats.ticksStored += ticks.length;
      this.stats.batchesProcessed++;
      
      logger.debug(`📦 Batch de ${ticks.length} ticks armazenado`);
      
    } catch (error) {
      logger.error('❌ Erro ao armazenar batch de ticks:', error);
      this.stats.errors++;
    }
  }

  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.flushAllBuffers();
    }, this.config.batchInterval);
    
    logger.debug('⏰ Timer de batch iniciado', { interval: this.config.batchInterval });
  }

  private async flushAllBuffers(): Promise<void> {
    await Promise.all([
      this.flushTickBuffer(),
      this.flushOrderFlowBuffer(),
      this.flushFootprintBuffer()
    ]);
  }

  private async flushOrderFlowBuffer(): Promise<void> {
    if (this.orderFlowBuffer.length === 0) return;
    
    try {
      const analyses = [...this.orderFlowBuffer];
      this.orderFlowBuffer = [];
      
      for (const analysis of analyses) {
        await this.sqlite.insertOrderFlow(analysis);
      }
      
      logger.debug(`📦 Batch de ${analyses.length} análises Order Flow armazenado`);
      
    } catch (error) {
      logger.error('❌ Erro ao armazenar batch de Order Flow:', error);
    }
  }

  private async flushFootprintBuffer(): Promise<void> {
    if (this.footprintBuffer.length === 0) return;
    
    try {
      const footprints = [...this.footprintBuffer];
      this.footprintBuffer = [];
      
      for (const footprint of footprints) {
        await this.sqlite.insertFootprint(footprint);
      }
      
      logger.debug(`📦 Batch de ${footprints.length} dados Footprint armazenado`);
      
    } catch (error) {
      logger.error('❌ Erro ao armazenar batch de Footprint:', error);
    }
  }

  // === CONSULTAS DE DADOS ===
  
  async getCurrentQuote(symbol: string): Promise<QuoteCacheData | null> {
    try {
      // Tentar cache primeiro
      const cached = await this.redis.getCurrentQuote(symbol);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
      
      this.stats.cacheMisses++;
      
      // Fallback para SQLite (última cotação)
      // TODO: Implementar busca no SQLite
      return null;
      
    } catch (error) {
      logger.error('❌ Erro ao buscar cotação:', error);
      return null;
    }
  }

  async getRecentTrades(symbol: string, limit: number = 100): Promise<TradeCacheData[]> {
    try {
      // Tentar cache primeiro
      const cached = await this.redis.getRecentTrades(symbol, limit);
      if (cached.length > 0) {
        this.stats.cacheHits++;
        return cached;
      }
      
      this.stats.cacheMisses++;
      
      // Fallback para SQLite
      const ticks = await this.sqlite.getLastTicks(symbol, limit);
      return ticks.map(tick => ({
        symbol: tick.symbol,
        timestamp: tick.timestamp,
        price: tick.price,
        volume: tick.volume,
        side: tick.side,
        tradeId: tick.trade_id
      }));
      
    } catch (error) {
      logger.error('❌ Erro ao buscar trades:', error);
      return [];
    }
  }

  async getHistoricalTicks(symbol: string, startTime: number, endTime: number): Promise<TickRecord[]> {
    try {
      return await this.sqlite.getTicksByPeriod(symbol, startTime, endTime);
    } catch (error) {
      logger.error('❌ Erro ao buscar ticks históricos:', error);
      return [];
    }
  }

  // === UTILITÁRIOS ===
  
  private determineTradeSide(tradeData: TradeData): 'BUY' | 'SELL' {
    // Lógica para determinar se é compra ou venda
    // Baseado no aggressor ou outros campos
    if (tradeData.aggressor === 'A') {
      return 'BUY'; // Agressor comprando
    } else if (tradeData.aggressor === 'V') {
      return 'SELL'; // Agressor vendendo
    }
    
    // Fallback baseado em broker
    return tradeData.buyerBroker > tradeData.sellerBroker ? 'BUY' : 'SELL';
  }

  private determineAggressor(tradeData: TradeData): boolean {
    // Determinar se houve agressão (ordem a mercado)
    return tradeData.aggressor !== undefined && tradeData.aggressor !== '';
  }

  // === ESTATÍSTICAS E MONITORAMENTO ===
  
  getStats(): object {
    return {
      ...this.stats,
      bufferSizes: {
        ticks: this.tickBuffer.length,
        orderFlow: this.orderFlowBuffer.length,
        footprint: this.footprintBuffer.length
      },
      config: this.config
    };
  }

  async getSystemStats(): Promise<object> {
    const [sqliteStats, redisStats] = await Promise.all([
      this.sqlite.getDatabaseStats(),
      this.redis.getCacheStats()
    ]);
    
    return {
      dataFlow: this.getStats(),
      sqlite: sqliteStats,
      redis: redisStats
    };
  }

  // === LIMPEZA E MANUTENÇÃO ===
  
  async cleanup(): Promise<void> {
    logger.info('🧹 Iniciando limpeza do Data Flow Manager...');
    
    // Flush final de todos os buffers
    await this.flushAllBuffers();
    
    // Parar timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    logger.info('✅ Data Flow Manager limpo');
  }

  async shutdown(): Promise<void> {
    logger.info('🛑 Parando Data Flow Manager...');
    
    await this.cleanup();
    
    // Fechar conexões
    await Promise.all([
      this.sqlite.close(),
      this.redis.disconnect()
    ]);
    
    logger.info('✅ Data Flow Manager parado');
  }
}
