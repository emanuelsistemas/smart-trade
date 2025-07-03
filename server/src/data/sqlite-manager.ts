// 🗄️ Gerenciador SQLite para Smart-Trade
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('SQLiteManager');

export interface TickRecord {
  id?: number;
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  side: 'BUY' | 'SELL';
  aggressor: boolean;
  trade_id: string;
  broker_buyer?: number;
  broker_seller?: number;
  created_at?: number;
}

export interface OrderFlowRecord {
  id?: number;
  symbol: string;
  timestamp: number;
  buy_volume: number;
  sell_volume: number;
  imbalance_ratio: number;
  intensity: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';
  big_players_detected: boolean;
  created_at?: number;
}

export interface FootprintRecord {
  id?: number;
  symbol: string;
  timestamp: number;
  price_level: number;
  bid_volume: number;
  ask_volume: number;
  delta: number;
  trades_count: number;
  created_at?: number;
}

export class TradingSQLiteManager {
  private db: sqlite3.Database;
  private dbPath: string;
  private isInitialized: boolean = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    logger.info('🗄️ Inicializando SQLite Manager', { dbPath });
    
    // Garantir que o diretório existe
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info('📁 Diretório de dados criado:', dir);
    }
    
    // Inicializar banco
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('❌ Erro ao abrir SQLite:', err);
        throw err;
      }
      logger.info('✅ SQLite conectado com sucesso');
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('🔧 Inicializando schema SQLite...');
      
      await this.createTables();
      await this.optimizeDatabase();
      
      this.isInitialized = true;
      logger.info('✅ SQLite inicializado com sucesso');
      
    } catch (error) {
      logger.error('❌ Erro ao inicializar SQLite:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const queries = [
      // Tabela de ticks históricos
      `CREATE TABLE IF NOT EXISTS historical_ticks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        price REAL NOT NULL,
        volume INTEGER NOT NULL,
        side TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
        aggressor BOOLEAN NOT NULL,
        trade_id TEXT NOT NULL,
        broker_buyer INTEGER,
        broker_seller INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Índices para ticks
      `CREATE INDEX IF NOT EXISTS idx_ticks_symbol_time 
       ON historical_ticks(symbol, timestamp)`,
      
      `CREATE INDEX IF NOT EXISTS idx_ticks_created_at 
       ON historical_ticks(created_at)`,
      
      // Tabela de análises Order Flow
      `CREATE TABLE IF NOT EXISTS order_flow_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        buy_volume INTEGER NOT NULL,
        sell_volume INTEGER NOT NULL,
        imbalance_ratio REAL NOT NULL,
        intensity TEXT NOT NULL CHECK(intensity IN ('WEAK', 'MODERATE', 'STRONG', 'EXTREME')),
        big_players_detected BOOLEAN NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Índices para order flow
      `CREATE INDEX IF NOT EXISTS idx_orderflow_symbol_time 
       ON order_flow_analysis(symbol, timestamp)`,
      
      // Tabela de dados Footprint
      `CREATE TABLE IF NOT EXISTS footprint_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        price_level REAL NOT NULL,
        bid_volume INTEGER NOT NULL,
        ask_volume INTEGER NOT NULL,
        delta INTEGER NOT NULL,
        trades_count INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Índices para footprint
      `CREATE INDEX IF NOT EXISTS idx_footprint_symbol_time 
       ON footprint_data(symbol, timestamp)`,
      
      `CREATE INDEX IF NOT EXISTS idx_footprint_price_level 
       ON footprint_data(symbol, price_level, timestamp)`,
      
      // Tabela de configurações do sistema
      `CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Tabela de sessões de trading
      `CREATE TABLE IF NOT EXISTS trading_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_name TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        symbols TEXT NOT NULL,
        notes TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`
    ];

    for (const query of queries) {
      await this.runQuery(query);
    }
    
    logger.info('✅ Tabelas SQLite criadas/verificadas');
  }

  private async optimizeDatabase(): Promise<void> {
    const optimizations = [
      // WAL mode para melhor concorrência
      'PRAGMA journal_mode = WAL',
      
      // Sincronização normal (mais rápida que FULL)
      'PRAGMA synchronous = NORMAL',
      
      // Cache maior para melhor performance
      'PRAGMA cache_size = 10000',
      
      // Armazenar temporários em memória
      'PRAGMA temp_store = MEMORY',
      
      // Timeout para locks
      'PRAGMA busy_timeout = 30000'
    ];

    for (const pragma of optimizations) {
      await this.runQuery(pragma);
    }
    
    logger.info('✅ Otimizações SQLite aplicadas');
  }

  // Inserir tick individual
  async insertTick(tick: TickRecord): Promise<number> {
    const query = `
      INSERT INTO historical_ticks 
      (symbol, timestamp, price, volume, side, aggressor, trade_id, broker_buyer, broker_seller)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await this.runQuery(query, [
      tick.symbol,
      tick.timestamp,
      tick.price,
      tick.volume,
      tick.side,
      tick.aggressor ? 1 : 0,
      tick.trade_id,
      tick.broker_buyer || null,
      tick.broker_seller || null
    ]);
    
    return result.lastID as number;
  }

  // Inserir múltiplos ticks em lote (mais eficiente)
  async insertTicksBatch(ticks: TickRecord[]): Promise<void> {
    if (ticks.length === 0) return;

    const query = `
      INSERT INTO historical_ticks 
      (symbol, timestamp, price, volume, side, aggressor, trade_id, broker_buyer, broker_seller)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.runTransaction(async () => {
      for (const tick of ticks) {
        await this.runQuery(query, [
          tick.symbol,
          tick.timestamp,
          tick.price,
          tick.volume,
          tick.side,
          tick.aggressor ? 1 : 0,
          tick.trade_id,
          tick.broker_buyer || null,
          tick.broker_seller || null
        ]);
      }
    });

    logger.debug(`📊 Inseridos ${ticks.length} ticks em lote`);
  }

  // Inserir análise Order Flow
  async insertOrderFlow(analysis: OrderFlowRecord): Promise<number> {
    const query = `
      INSERT INTO order_flow_analysis 
      (symbol, timestamp, buy_volume, sell_volume, imbalance_ratio, intensity, big_players_detected)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await this.runQuery(query, [
      analysis.symbol,
      analysis.timestamp,
      analysis.buy_volume,
      analysis.sell_volume,
      analysis.imbalance_ratio,
      analysis.intensity,
      analysis.big_players_detected ? 1 : 0
    ]);
    
    return result.lastID as number;
  }

  // Inserir dados Footprint
  async insertFootprint(footprint: FootprintRecord): Promise<number> {
    const query = `
      INSERT INTO footprint_data 
      (symbol, timestamp, price_level, bid_volume, ask_volume, delta, trades_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await this.runQuery(query, [
      footprint.symbol,
      footprint.timestamp,
      footprint.price_level,
      footprint.bid_volume,
      footprint.ask_volume,
      footprint.delta,
      footprint.trades_count
    ]);
    
    return result.lastID as number;
  }

  // Buscar ticks por período
  async getTicksByPeriod(symbol: string, startTime: number, endTime: number): Promise<TickRecord[]> {
    const query = `
      SELECT * FROM historical_ticks 
      WHERE symbol = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `;
    
    const rows = await this.allQuery(query, [symbol, startTime, endTime]);
    return rows.map(this.mapTickRecord);
  }

  // Buscar últimos N ticks
  async getLastTicks(symbol: string, limit: number = 100): Promise<TickRecord[]> {
    const query = `
      SELECT * FROM historical_ticks 
      WHERE symbol = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    
    const rows = await this.allQuery(query, [symbol, limit]);
    return rows.map(this.mapTickRecord);
  }

  // Estatísticas do banco
  async getDatabaseStats(): Promise<object> {
    const queries = {
      totalTicks: 'SELECT COUNT(*) as count FROM historical_ticks',
      totalOrderFlow: 'SELECT COUNT(*) as count FROM order_flow_analysis',
      totalFootprint: 'SELECT COUNT(*) as count FROM footprint_data',
      dbSize: "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
    };

    const stats: any = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await this.getQuery(query);
      stats[key] = result?.count || result?.size || 0;
    }

    return stats;
  }

  // Limpeza de dados antigos
  async cleanOldData(daysToKeep: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    const queries = [
      `DELETE FROM historical_ticks WHERE created_at < ?`,
      `DELETE FROM order_flow_analysis WHERE created_at < ?`,
      `DELETE FROM footprint_data WHERE created_at < ?`
    ];

    let totalDeleted = 0;
    
    for (const query of queries) {
      const result = await this.runQuery(query, [Math.floor(cutoffTime / 1000)]);
      totalDeleted += result.changes || 0;
    }

    // Vacuum para recuperar espaço
    await this.runQuery('VACUUM');
    
    logger.info(`🧹 Limpeza concluída: ${totalDeleted} registros removidos`);
  }

  // Utilitários privados
  private runQuery(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          logger.error('❌ Erro na query:', { query, error: err });
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  private getQuery(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          logger.error('❌ Erro na query:', { query, error: err });
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  private allQuery(query: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          logger.error('❌ Erro na query:', { query, error: err });
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  private async runTransaction(callback: () => Promise<void>): Promise<void> {
    await this.runQuery('BEGIN TRANSACTION');
    try {
      await callback();
      await this.runQuery('COMMIT');
    } catch (error) {
      await this.runQuery('ROLLBACK');
      throw error;
    }
  }

  private mapTickRecord(row: any): TickRecord {
    return {
      id: row.id,
      symbol: row.symbol,
      timestamp: row.timestamp,
      price: row.price,
      volume: row.volume,
      side: row.side,
      aggressor: Boolean(row.aggressor),
      trade_id: row.trade_id,
      broker_buyer: row.broker_buyer,
      broker_seller: row.broker_seller,
      created_at: row.created_at
    };
  }

  // Fechar conexão
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          logger.error('❌ Erro ao fechar SQLite:', err);
          reject(err);
        } else {
          logger.info('✅ SQLite desconectado');
          resolve();
        }
      });
    });
  }
}
