// 📡 Gerenciador de subscrições da Cedro API
import { EventEmitter } from 'events';
import { CedroTcpClient } from './client';
import { createLogger } from '../utils/logger';

const logger = createLogger('CedroSubscriptions');

export type SubscriptionType = 'quote' | 'book' | 'trades' | 'aggregatedBook' | 'vap';

export interface Subscription {
  id: string;
  symbol: string;
  type: SubscriptionType;
  active: boolean;
  subscribedAt: Date;
  parameters?: any;
}

export class SubscriptionManager extends EventEmitter {
  private client: CedroTcpClient;
  private subscriptions: Map<string, Subscription> = new Map();
  private subscriptionCounter: number = 0;

  constructor(client: CedroTcpClient) {
    super();
    this.client = client;
    this.setupEventHandlers();
    logger.info('📡 Gerenciador de subscrições inicializado');
  }

  private setupEventHandlers(): void {
    this.client.on('authenticated', () => {
      logger.info('✅ Cliente autenticado, subscrições disponíveis');
      this.emit('ready');
    });

    this.client.on('disconnected', () => {
      logger.warn('⚠️ Cliente desconectado, subscrições pausadas');
      this.markAllSubscriptionsInactive();
    });
  }

  /**
   * SQT - Subscribe Quote
   * Subscrever cotações de um ativo
   */
  async subscribeQuote(symbol: string, snapshot: boolean = false): Promise<string> {
    const command = snapshot ? `SQT ${symbol} N` : `SQT ${symbol}`;
    return this.subscribe(symbol, 'quote', command, { snapshot });
  }

  /**
   * BQT - Subscribe Book Quote
   * Subscrever livro de ofertas de um ativo
   */
  async subscribeBook(symbol: string): Promise<string> {
    const command = `BQT ${symbol}`;
    return this.subscribe(symbol, 'book', command);
  }

  /**
   * GQT - Get Quote Trade (Subscribe)
   * Subscrever negócios realizados de um ativo
   */
  async subscribeTrades(symbol: string, quantity?: number, tradeId?: string, order: 'ASC' | 'DESC' = 'DESC'): Promise<string> {
    let command = `GQT ${symbol} S`;
    
    if (quantity) {
      command += ` ${quantity}`;
      
      if (tradeId) {
        command += ` ${tradeId}`;
        command += ` ${order}`;
      }
    }
    
    return this.subscribe(symbol, 'trades', command, { quantity, tradeId, order });
  }

  /**
   * SAB - Subscribe Aggregated Book
   * Subscrever livro agregado de ofertas
   */
  async subscribeAggregatedBook(symbol: string): Promise<string> {
    const command = `SAB ${symbol}`;
    return this.subscribe(symbol, 'aggregatedBook', command);
  }

  /**
   * VAP - Volume at Price
   * Subscrever volume por preço
   */
  async subscribeVAP(symbol: string, period?: number): Promise<string> {
    const command = period ? `VAP ${symbol} ${period}` : `VAP ${symbol}`;
    return this.subscribe(symbol, 'vap', command, { period });
  }

  private async subscribe(symbol: string, type: SubscriptionType, command: string, parameters?: any): Promise<string> {
    try {
      if (!this.client.authenticated) {
        throw new Error('Cliente não autenticado');
      }

      const subscriptionId = this.generateSubscriptionId(symbol, type);
      
      // Verificar se já existe subscrição ativa
      const existingKey = this.findExistingSubscription(symbol, type);
      if (existingKey) {
        logger.warn(`⚠️ Subscrição já existe: ${existingKey}`);
        return existingKey;
      }

      logger.info(`📡 Subscrevendo: ${command}`, { symbol, type, subscriptionId });
      
      // Enviar comando para Cedro
      this.client.send(command);

      // Criar registro da subscrição
      const subscription: Subscription = {
        id: subscriptionId,
        symbol,
        type,
        active: true,
        subscribedAt: new Date(),
        parameters
      };

      this.subscriptions.set(subscriptionId, subscription);
      
      logger.info(`✅ Subscrição criada: ${subscriptionId}`, { symbol, type });
      this.emit('subscribed', subscription);

      return subscriptionId;

    } catch (error) {
      logger.error(`❌ Erro ao subscrever ${symbol}:${type}:`, error);
      throw error;
    }
  }

  /**
   * Cancelar subscrição específica
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) {
      logger.warn(`⚠️ Subscrição não encontrada: ${subscriptionId}`);
      return;
    }

    try {
      const command = this.getUnsubscribeCommand(subscription);
      
      if (command) {
        logger.info(`📡 Cancelando subscrição: ${command}`, { subscriptionId });
        this.client.send(command);
      }

      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
      
      logger.info(`✅ Subscrição cancelada: ${subscriptionId}`);
      this.emit('unsubscribed', subscription);

    } catch (error) {
      logger.error(`❌ Erro ao cancelar subscrição ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Cancelar todas as subscrições de um símbolo
   */
  async unsubscribeSymbol(symbol: string): Promise<void> {
    const symbolSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.symbol === symbol && sub.active);

    logger.info(`📡 Cancelando ${symbolSubscriptions.length} subscrições do símbolo: ${symbol}`);

    for (const subscription of symbolSubscriptions) {
      await this.unsubscribe(subscription.id);
    }
  }

  /**
   * Cancelar todas as subscrições
   */
  async unsubscribeAll(): Promise<void> {
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.active);

    logger.info(`📡 Cancelando todas as ${activeSubscriptions.length} subscrições ativas`);

    for (const subscription of activeSubscriptions) {
      await this.unsubscribe(subscription.id);
    }
  }

  private getUnsubscribeCommand(subscription: Subscription): string | null {
    switch (subscription.type) {
      case 'quote':
        return `USQ ${subscription.symbol}`;
      case 'book':
        return `UBQ ${subscription.symbol}`;
      case 'trades':
        return `UQT ${subscription.symbol}`;
      case 'aggregatedBook':
        return `UAB ${subscription.symbol}`;
      case 'vap':
        // VAP não tem comando de unsubscribe específico na documentação
        return null;
      default:
        logger.warn(`⚠️ Tipo de subscrição não suportado para unsubscribe: ${subscription.type}`);
        return null;
    }
  }

  private generateSubscriptionId(symbol: string, type: SubscriptionType): string {
    this.subscriptionCounter++;
    return `${symbol}_${type}_${this.subscriptionCounter}_${Date.now()}`;
  }

  private findExistingSubscription(symbol: string, type: SubscriptionType): string | null {
    for (const [id, subscription] of this.subscriptions) {
      if (subscription.symbol === symbol && subscription.type === type && subscription.active) {
        return id;
      }
    }
    return null;
  }

  private markAllSubscriptionsInactive(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.active = false;
    }
    logger.warn('⚠️ Todas as subscrições marcadas como inativas');
  }

  // Getters para informações
  getActiveSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.active);
  }

  getSubscriptionsBySymbol(symbol: string): Subscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.symbol === symbol);
  }

  getSubscriptionsByType(type: SubscriptionType): Subscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.type === type);
  }

  isSubscribed(symbol: string, type: SubscriptionType): boolean {
    return this.findExistingSubscription(symbol, type) !== null;
  }

  getSubscriptionStats(): object {
    const active = this.getActiveSubscriptions();
    const byType = active.reduce((acc, sub) => {
      acc[sub.type] = (acc[sub.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.subscriptions.size,
      active: active.length,
      inactive: this.subscriptions.size - active.length,
      byType
    };
  }
}
