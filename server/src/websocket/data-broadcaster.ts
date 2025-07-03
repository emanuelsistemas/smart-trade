// 📡 Sistema de Broadcasting de Dados - Smart-Trade
import { EventEmitter } from 'events';
import { TradingWebSocketServer, WebSocketMessage, ClientConnection } from './websocket-server';
import { AuthManager } from './auth-manager';
import { DataFlowManager } from '../data/data-flow-manager';
import { CedroMessage } from '../cedro/parser';
import { createLogger } from '../utils/logger';

const logger = createLogger('DataBroadcaster');

export interface BroadcastConfig {
  throttleInterval: number; // ms entre broadcasts
  maxQueueSize: number;
  enableCompression: boolean;
}

export interface ChannelSubscription {
  channel: string;
  symbol?: string;
  dataType?: string;
  filters?: any;
}

export class DataBroadcaster extends EventEmitter {
  private wsServer: TradingWebSocketServer;
  private authManager: AuthManager;
  private dataFlow: DataFlowManager;
  private config: BroadcastConfig;
  
  // Filas de dados por canal
  private dataQueues: Map<string, any[]> = new Map();
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Estatísticas
  private stats = {
    messagesSent: 0,
    messagesQueued: 0,
    messagesDropped: 0,
    channelsActive: 0,
    subscribersTotal: 0
  };

  constructor(
    wsServer: TradingWebSocketServer,
    authManager: AuthManager,
    dataFlow: DataFlowManager,
    config: BroadcastConfig
  ) {
    super();
    this.wsServer = wsServer;
    this.authManager = authManager;
    this.dataFlow = dataFlow;
    this.config = config;
    
    this.setupEventHandlers();
    logger.info('📡 Data Broadcaster inicializado', { config });
  }

  private setupEventHandlers(): void {
    // Eventos do WebSocket Server
    this.wsServer.on('clientSubscribed', (client, channel) => {
      this.handleClientSubscription(client, channel);
    });

    this.wsServer.on('clientUnsubscribed', (client, channel) => {
      this.handleClientUnsubscription(client, channel);
    });

    this.wsServer.on('clientDisconnected', (client) => {
      this.handleClientDisconnect(client);
    });

    // Eventos do Data Flow Manager
    this.dataFlow.on('dataProcessed', (info) => {
      this.handleNewMarketData(info);
    });
  }

  private handleClientSubscription(client: ClientConnection, channel: string): void {
    logger.info(`📡 Cliente subscrito no canal: ${client.id} → ${channel}`);
    
    // Verificar permissões
    if (!this.hasChannelPermission(client, channel)) {
      this.wsServer.sendError(client.id, 'PERMISSION_DENIED', `Sem permissão para canal: ${channel}`);
      return;
    }

    // Enviar dados iniciais se disponível
    this.sendInitialData(client.id, channel);
    
    this.updateStats();
  }

  private handleClientUnsubscription(client: ClientConnection, channel: string): void {
    logger.info(`📡 Cliente desinscrito do canal: ${client.id} ← ${channel}`);
    this.updateStats();
  }

  private handleClientDisconnect(client: ClientConnection): void {
    logger.debug(`📡 Cliente desconectado: ${client.id}`);
    this.updateStats();
  }

  private handleNewMarketData(info: any): void {
    const { type, symbol, timestamp } = info;
    
    // Determinar canais para broadcast
    const channels = this.getChannelsForData(type, symbol);
    
    for (const channel of channels) {
      this.queueDataForChannel(channel, {
        type,
        symbol,
        timestamp,
        data: info.data
      });
    }
  }

  private hasChannelPermission(client: ClientConnection, channel: string): boolean {
    if (!client.authenticated || !client.userId) {
      return false;
    }

    // Mapear canais para permissões
    const channelPermissions: Record<string, string> = {
      'quotes': 'read:quotes',
      'trades': 'read:trades',
      'orderflow': 'read:orderflow',
      'footprint': 'read:footprint',
      'book': 'read:book',
      'system': 'read:system'
    };

    const requiredPermission = channelPermissions[channel.split(':')[0]];
    if (!requiredPermission) {
      return false; // Canal desconhecido
    }

    // Verificar permissão via AuthManager
    // Como não temos o token aqui, vamos assumir que cliente autenticado tem permissões básicas
    // Em implementação real, armazenaria o token ou permissões no ClientConnection
    return true;
  }

  private async sendInitialData(clientId: string, channel: string): Promise<void> {
    try {
      const [channelType, symbol] = channel.split(':');
      
      switch (channelType) {
        case 'quotes':
          if (symbol) {
            const quote = await this.dataFlow.getCurrentQuote(symbol);
            if (quote) {
              this.wsServer.sendToClient(clientId, {
                type: 'quote',
                payload: { ...quote, symbol },
                timestamp: Date.now()
              });
            }
          }
          break;
          
        case 'trades':
          if (symbol) {
            const trades = await this.dataFlow.getRecentTrades(symbol, 10);
            if (trades.length > 0) {
              this.wsServer.sendToClient(clientId, {
                type: 'trades',
                payload: { symbol, trades },
                timestamp: Date.now()
              });
            }
          }
          break;
          
        case 'system':
          const stats = await this.dataFlow.getSystemStats();
          this.wsServer.sendToClient(clientId, {
            type: 'systemStats',
            payload: stats,
            timestamp: Date.now()
          });
          break;
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao enviar dados iniciais para ${clientId}:`, error);
    }
  }

  private getChannelsForData(type: string, symbol: string): string[] {
    const channels: string[] = [];
    
    switch (type) {
      case 'T': // Quote
        channels.push(`quotes:${symbol}`, 'quotes:*');
        break;
        
      case 'V': // Trade
        channels.push(`trades:${symbol}`, 'trades:*');
        break;
        
      case 'B': // Book
        channels.push(`book:${symbol}`, 'book:*');
        break;
        
      case 'orderflow':
        channels.push(`orderflow:${symbol}`, 'orderflow:*');
        break;
        
      case 'footprint':
        channels.push(`footprint:${symbol}`, 'footprint:*');
        break;
    }
    
    return channels;
  }

  private queueDataForChannel(channel: string, data: any): void {
    if (!this.dataQueues.has(channel)) {
      this.dataQueues.set(channel, []);
    }
    
    const queue = this.dataQueues.get(channel)!;
    
    // Verificar limite da fila
    if (queue.length >= this.config.maxQueueSize) {
      queue.shift(); // Remove o mais antigo
      this.stats.messagesDropped++;
    }
    
    queue.push(data);
    this.stats.messagesQueued++;
    
    // Iniciar throttle se não estiver ativo
    if (!this.throttleTimers.has(channel)) {
      this.scheduleChannelBroadcast(channel);
    }
  }

  private scheduleChannelBroadcast(channel: string): void {
    const timer = setTimeout(() => {
      this.broadcastChannelData(channel);
      this.throttleTimers.delete(channel);
    }, this.config.throttleInterval);
    
    this.throttleTimers.set(channel, timer);
  }

  private broadcastChannelData(channel: string): void {
    const queue = this.dataQueues.get(channel);
    if (!queue || queue.length === 0) {
      return;
    }
    
    // Agrupar dados por tipo para otimizar
    const groupedData = this.groupDataByType(queue);
    
    for (const [dataType, items] of Object.entries(groupedData)) {
      const message: WebSocketMessage = {
        type: dataType,
        payload: {
          channel,
          data: items.length === 1 ? items[0] : items,
          count: items.length
        },
        timestamp: Date.now()
      };
      
      const sent = this.wsServer.broadcastToChannel(channel, message);
      this.stats.messagesSent += sent;
    }
    
    // Limpar fila
    queue.length = 0;
    
    logger.debug(`📡 Broadcast enviado para canal ${channel}`);
  }

  private groupDataByType(data: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const item of data) {
      const type = item.type || 'unknown';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(item);
    }
    
    return grouped;
  }

  // === MÉTODOS PÚBLICOS ===

  broadcastSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const wsMessage: WebSocketMessage = {
      type: 'systemMessage',
      payload: { message, level },
      timestamp: Date.now()
    };
    
    this.wsServer.broadcast(wsMessage);
    logger.info(`📢 Mensagem do sistema enviada: ${message}`);
  }

  broadcastMarketStatus(status: 'open' | 'closed' | 'pre-open' | 'after-hours'): void {
    const wsMessage: WebSocketMessage = {
      type: 'marketStatus',
      payload: { status },
      timestamp: Date.now()
    };
    
    this.wsServer.broadcast(wsMessage);
    logger.info(`📊 Status do mercado enviado: ${status}`);
  }

  getChannelStats(): object {
    const channelStats: Record<string, any> = {};
    
    for (const [channel, queue] of this.dataQueues) {
      const subscribers = this.getChannelSubscribers(channel);
      channelStats[channel] = {
        queueSize: queue.length,
        subscribers: subscribers.length,
        hasThrottle: this.throttleTimers.has(channel)
      };
    }
    
    return {
      channels: channelStats,
      totalChannels: this.dataQueues.size,
      activeThrottles: this.throttleTimers.size,
      stats: this.stats
    };
  }

  private getChannelSubscribers(channel: string): ClientConnection[] {
    const clients = this.wsServer.getClientList();
    return clients.filter((client: any) => 
      client.subscriptions.includes(channel)
    ) as ClientConnection[];
  }

  private updateStats(): void {
    const clients = this.wsServer.getClientList();
    this.stats.subscribersTotal = clients.reduce((acc: number, client: any) => 
      acc + client.subscriptions.length, 0
    );
    this.stats.channelsActive = this.dataQueues.size;
  }

  getStats(): object {
    return {
      ...this.stats,
      channels: this.getChannelStats(),
      config: this.config
    };
  }

  // === LIMPEZA ===

  cleanup(): void {
    logger.info('🧹 Limpando Data Broadcaster...');
    
    // Parar todos os timers
    for (const timer of this.throttleTimers.values()) {
      clearTimeout(timer);
    }
    this.throttleTimers.clear();
    
    // Limpar filas
    this.dataQueues.clear();
    
    logger.info('✅ Data Broadcaster limpo');
  }

  shutdown(): void {
    logger.info('🛑 Parando Data Broadcaster...');
    this.cleanup();
    logger.info('✅ Data Broadcaster parado');
  }
}
