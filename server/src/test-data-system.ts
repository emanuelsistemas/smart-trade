// 🧪 Teste do Sistema de Dados - Smart-Trade
import path from 'path';
import fs from 'fs';
import { TradingSQLiteManager, TickRecord } from './data/sqlite-manager';
import { TradingRedisManager, QuoteCacheData, TradeCacheData } from './data/redis-manager';
import { DataFlowManager } from './data/data-flow-manager';
import { createLogger } from './utils/logger';

const logger = createLogger('TestDataSystem');

async function testDataSystem() {
  logger.info('🧪 Iniciando testes do Sistema de Dados...');
  
  try {
    // Teste 1: SQLite Manager
    await testSQLiteManager();
    
    // Teste 2: Redis Manager
    await testRedisManager();
    
    // Teste 3: Data Flow Manager
    await testDataFlowManager();
    
    logger.info('✅ Todos os testes do sistema de dados passaram!');
    
  } catch (error) {
    logger.error('❌ Falha nos testes:', error);
    process.exit(1);
  }
}

async function testSQLiteManager() {
  logger.info('🗄️ Testando SQLite Manager...');
  
  // Usar banco temporário para teste
  const testDbPath = path.join(process.cwd(), 'data', 'test.db');
  
  // Limpar banco de teste se existir
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  const sqlite = new TradingSQLiteManager(testDbPath);
  
  try {
    // Inicializar
    await sqlite.initialize();
    logger.info('✅ SQLite inicializado');
    
    // Teste de inserção de tick individual
    const testTick: TickRecord = {
      symbol: 'DOL',
      timestamp: Date.now(),
      price: 6.0450,
      volume: 100,
      side: 'BUY',
      aggressor: true,
      trade_id: 'TEST001',
      broker_buyer: 123,
      broker_seller: 456
    };
    
    const tickId = await sqlite.insertTick(testTick);
    logger.info('✅ Tick inserido:', { id: tickId });
    
    // Teste de inserção em lote
    const batchTicks: TickRecord[] = [];
    for (let i = 0; i < 10; i++) {
      batchTicks.push({
        symbol: 'DOL',
        timestamp: Date.now() + i * 1000,
        price: 6.0450 + (i * 0.001),
        volume: 50 + i,
        side: i % 2 === 0 ? 'BUY' : 'SELL',
        aggressor: i % 3 === 0,
        trade_id: `BATCH${i.toString().padStart(3, '0')}`,
        broker_buyer: 100 + i,
        broker_seller: 200 + i
      });
    }
    
    await sqlite.insertTicksBatch(batchTicks);
    logger.info('✅ Batch de ticks inserido:', { count: batchTicks.length });
    
    // Teste de consulta
    const lastTicks = await sqlite.getLastTicks('DOL', 5);
    logger.info('✅ Últimos ticks consultados:', { count: lastTicks.length });
    
    // Teste de estatísticas
    const stats = await sqlite.getDatabaseStats();
    logger.info('✅ Estatísticas SQLite:', stats);
    
    // Fechar conexão
    await sqlite.close();
    
    // Limpar arquivo de teste
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    logger.info('✅ SQLite Manager testado com sucesso');
    
  } catch (error) {
    await sqlite.close();
    throw error;
  }
}

async function testRedisManager() {
  logger.info('🔴 Testando Redis Manager...');
  
  const redis = new TradingRedisManager();
  
  try {
    // Tentar conectar (pode falhar se Redis não estiver rodando)
    await redis.connect();
    
    if (!redis.connected) {
      logger.warn('⚠️ Redis não disponível, pulando testes Redis');
      return;
    }
    
    logger.info('✅ Redis conectado');
    
    // Teste de cache de cotação
    const testQuote: QuoteCacheData = {
      symbol: 'DOL',
      timestamp: Date.now(),
      lastPrice: 6.0450,
      bidPrice: 6.0440,
      askPrice: 6.0460,
      volume: 1000,
      change: 0.0010
    };
    
    await redis.setCurrentQuote('DOL', testQuote);
    logger.info('✅ Quote cacheada');
    
    const cachedQuote = await redis.getCurrentQuote('DOL');
    if (cachedQuote && cachedQuote.lastPrice === testQuote.lastPrice) {
      logger.info('✅ Quote recuperada do cache');
    } else {
      throw new Error('Falha ao recuperar quote do cache');
    }
    
    // Teste de cache de trades
    const testTrades: TradeCacheData[] = [];
    for (let i = 0; i < 5; i++) {
      testTrades.push({
        symbol: 'DOL',
        timestamp: Date.now() + i * 1000,
        price: 6.0450 + (i * 0.001),
        volume: 50 + i,
        side: i % 2 === 0 ? 'BUY' : 'SELL',
        tradeId: `CACHE${i.toString().padStart(3, '0')}`
      });
    }
    
    for (const trade of testTrades) {
      await redis.addTrade('DOL', trade);
    }
    logger.info('✅ Trades cacheados');
    
    const cachedTrades = await redis.getRecentTrades('DOL', 3);
    if (cachedTrades.length === 3) {
      logger.info('✅ Trades recuperados do cache:', { count: cachedTrades.length });
    } else {
      throw new Error('Falha ao recuperar trades do cache');
    }
    
    // Teste de estatísticas
    const stats = await redis.getCacheStats();
    logger.info('✅ Estatísticas Redis:', stats);
    
    // Limpar cache de teste
    await redis.clearSymbolCache('DOL');
    logger.info('✅ Cache limpo');
    
    await redis.disconnect();
    logger.info('✅ Redis Manager testado com sucesso');
    
  } catch (error) {
    await redis.disconnect();
    throw error;
  }
}

async function testDataFlowManager() {
  logger.info('🌊 Testando Data Flow Manager...');
  
  // Usar banco temporário
  const testDbPath = path.join(process.cwd(), 'data', 'test-flow.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  const sqlite = new TradingSQLiteManager(testDbPath);
  const redis = new TradingRedisManager();
  
  await sqlite.initialize();
  await redis.connect();
  
  const dataFlow = new DataFlowManager(sqlite, redis, {
    batchSize: 5,
    batchInterval: 1000,
    bufferSize: 100
  });
  
  try {
    // Simular mensagens Cedro
    const mockQuoteMessage = {
      type: 'T' as const,
      symbol: 'DOL',
      timestamp: new Date().toISOString(),
      data: {
        symbol: 'DOL',
        timestamp: new Date().toISOString(),
        lastPrice: 6.0450,
        bidPrice: 6.0440,
        askPrice: 6.0460,
        currentVolume: 100
      },
      raw: 'T:DOL:14:30:25:2:6.0450:3:6.0440:4:6.0460!'
    };
    
    const mockTradeMessage = {
      type: 'V' as const,
      symbol: 'DOL',
      timestamp: new Date().toISOString(),
      data: {
        symbol: 'DOL',
        operation: 'A',
        time: '14:30:25',
        price: 6.0450,
        buyerBroker: 123,
        sellerBroker: 456,
        volume: 50,
        tradeId: 'FLOW001',
        aggressor: 'A'
      },
      raw: 'V:DOL:A:14:30:25:6.0450:123:456:50:FLOW001:D:A'
    };
    
    // Processar mensagens
    await dataFlow.processMarketData(mockQuoteMessage);
    logger.info('✅ Quote processada pelo Data Flow');
    
    await dataFlow.processMarketData(mockTradeMessage);
    logger.info('✅ Trade processado pelo Data Flow');
    
    // Aguardar um pouco para processamento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Testar consultas
    const currentQuote = await dataFlow.getCurrentQuote('DOL');
    if (currentQuote) {
      logger.info('✅ Quote consultada via Data Flow:', {
        price: currentQuote.lastPrice
      });
    }
    
    const recentTrades = await dataFlow.getRecentTrades('DOL', 5);
    logger.info('✅ Trades consultados via Data Flow:', {
      count: recentTrades.length
    });
    
    // Estatísticas
    const stats = dataFlow.getStats();
    logger.info('✅ Estatísticas Data Flow:', stats);
    
    const systemStats = await dataFlow.getSystemStats();
    logger.info('✅ Estatísticas do sistema:', systemStats);
    
    // Cleanup
    await dataFlow.shutdown();
    
    // Limpar arquivo de teste
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    logger.info('✅ Data Flow Manager testado com sucesso');
    
  } catch (error) {
    await dataFlow.shutdown();
    throw error;
  }
}

// Executar testes
if (require.main === module) {
  testDataSystem()
    .then(() => {
      logger.info('🎉 Todos os testes do sistema de dados concluídos!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Falha nos testes:', error);
      process.exit(1);
    });
}

export { testDataSystem };
