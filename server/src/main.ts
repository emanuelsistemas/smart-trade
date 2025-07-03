// 🚀 Smart-Trade Server - Ponto de entrada principal
import { CedroTcpClient } from './cedro/client';
import { CedroMessageParser } from './cedro/parser';
import { SubscriptionManager } from './cedro/subscription-manager';
import { CedroErrorHandler } from './cedro/error-handler';
import { config, getConfigSummary } from './utils/config';
import { createLogger } from './utils/logger';

const logger = createLogger('SmartTradeServer');

class SmartTradeServer {
  private cedroClient: CedroTcpClient;
  private parser: CedroMessageParser;
  private subscriptionManager: SubscriptionManager;
  private isRunning: boolean = false;

  constructor() {
    logger.info('🚀 Inicializando Smart-Trade Server...');

    // Exibir configuração (sem senhas)
    logger.info('⚙️ Configuração carregada:', getConfigSummary());

    // Inicializar componentes
    this.cedroClient = new CedroTcpClient(config.cedro);
    this.parser = new CedroMessageParser();
    this.subscriptionManager = new SubscriptionManager(this.cedroClient);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Eventos do cliente Cedro
    this.cedroClient.on('connected', () => {
      logger.info('🔌 Cliente Cedro conectado');
    });

    this.cedroClient.on('authenticated', () => {
      logger.info('✅ Cliente Cedro autenticado com sucesso');
      this.onAuthenticated();
    });

    this.cedroClient.on('disconnected', () => {
      logger.warn('❌ Cliente Cedro desconectado');
    });

    this.cedroClient.on('error', (error) => {
      logger.error('❌ Erro no cliente Cedro:', error);
    });

    this.cedroClient.on('authError', (message) => {
      logger.error('🚫 Erro de autenticação:', message);
    });

    this.cedroClient.on('message', (rawMessage) => {
      this.handleCedroMessage(rawMessage);
    });

    // Eventos do gerenciador de subscrições
    this.subscriptionManager.on('subscribed', (subscription) => {
      logger.info('📡 Nova subscrição ativa:', {
        id: subscription.id,
        symbol: subscription.symbol,
        type: subscription.type
      });
    });

    this.subscriptionManager.on('unsubscribed', (subscription) => {
      logger.info('📡 Subscrição cancelada:', {
        id: subscription.id,
        symbol: subscription.symbol,
        type: subscription.type
      });
    });

    // Tratamento de sinais do sistema
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      logger.error('💥 Exceção não capturada:', error);
      this.shutdown('uncaughtException');
    });
  }

  private async onAuthenticated(): Promise<void> {
    try {
      logger.info('🎯 Iniciando subscrições de teste...');

      // Subscrever DOL (Dólar Futuro) para testes
      await this.subscriptionManager.subscribeQuote('DOL', true); // Com snapshot
      await this.subscriptionManager.subscribeBook('DOL');
      await this.subscriptionManager.subscribeTrades('DOL');

      logger.info('✅ Subscrições de teste criadas');

      // Exibir estatísticas
      const stats = this.subscriptionManager.getSubscriptionStats();
      logger.info('📊 Estatísticas de subscrições:', stats);

    } catch (error) {
      logger.error('❌ Erro ao criar subscrições de teste:', error);
    }
  }

  private handleCedroMessage(rawMessage: string): void {
    try {
      const parsedMessage = this.parser.parseMessage(rawMessage);

      if (!parsedMessage) {
        return;
      }

      // Tratar erros
      if (parsedMessage.type === 'E') {
        const error = CedroErrorHandler.handleError(
          parsedMessage.data.code,
          parsedMessage.data.message
        );

        // Tomar ação baseada no tipo de erro
        if (error.fatal) {
          logger.error('🚨 Erro fatal detectado, parando servidor');
          this.shutdown('fatalError');
        } else if (CedroErrorHandler.shouldReconnect(error.code)) {
          logger.warn('🔄 Erro requer reconexão');
          // TODO: Implementar lógica de reconexão
        }

        return;
      }

      // Processar dados de mercado
      this.processMarketData(parsedMessage);

    } catch (error) {
      logger.error('❌ Erro ao processar mensagem Cedro:', error);
    }
  }

  private processMarketData(message: any): void {
    // Log dos dados recebidos (apenas para debug na Fase 2)
    switch (message.type) {
      case 'T': // Quote
        logger.debug('📊 Quote recebida:', {
          symbol: message.symbol,
          lastPrice: message.data.lastPrice,
          bidPrice: message.data.bidPrice,
          askPrice: message.data.askPrice
        });
        break;

      case 'B': // Book
        logger.debug('📖 Book update:', {
          symbol: message.symbol,
          operation: message.data.operation,
          side: message.data.side,
          price: message.data.price,
          volume: message.data.volume
        });
        break;

      case 'V': // Trade
        logger.debug('💰 Trade executado:', {
          symbol: message.symbol,
          price: message.data.price,
          volume: message.data.volume,
          time: message.data.time
        });
        break;
    }

    // TODO: Na Fase 3, enviar para sistema de dados
    // TODO: Na Fase 4, enviar via WebSocket para clientes
  }

  async start(): Promise<void> {
    try {
      logger.info('🚀 Iniciando Smart-Trade Server...');

      this.isRunning = true;

      // Conectar ao Cedro
      await this.cedroClient.connect();

      logger.info('✅ Smart-Trade Server iniciado com sucesso!');
      logger.info('📡 Aguardando dados da Cedro API...');

    } catch (error) {
      logger.error('❌ Erro ao iniciar servidor:', error);
      throw error;
    }
  }

  async shutdown(reason: string): Promise<void> {
    logger.info(`🛑 Parando Smart-Trade Server (${reason})...`);

    this.isRunning = false;

    try {
      // Cancelar todas as subscrições
      await this.subscriptionManager.unsubscribeAll();

      // Desconectar cliente Cedro
      this.cedroClient.disconnect();

      logger.info('✅ Smart-Trade Server parado com sucesso');

    } catch (error) {
      logger.error('❌ Erro ao parar servidor:', error);
    }

    process.exit(0);
  }
}

// Inicializar e executar servidor
async function main() {
  try {
    const server = new SmartTradeServer();
    await server.start();
  } catch (error) {
    logger.error('💥 Falha crítica ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Executar apenas se for o módulo principal
if (require.main === module) {
  main();
}

export { SmartTradeServer };
