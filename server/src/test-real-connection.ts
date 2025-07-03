// 🌐 Teste de conexão real com Cedro API
import { CedroTcpClient } from './cedro/client';
import { CedroMessageParser } from './cedro/parser';
import { SubscriptionManager } from './cedro/subscription-manager';
import { config } from './utils/config';
import { createLogger } from './utils/logger';

const logger = createLogger('TestRealConnection');

async function testRealConnection() {
  logger.info('🌐 Iniciando teste de conexão real com Cedro...');
  logger.info('🔗 Configuração:', {
    host: config.cedro.host,
    port: config.cedro.port,
    username: config.cedro.username,
    password: '***'
  });

  const client = new CedroTcpClient(config.cedro);
  const parser = new CedroMessageParser();
  const subscriptionManager = new SubscriptionManager(client);
  
  let messageCount = 0;
  let connectionSuccess = false;
  let authSuccess = false;
  let subscriptionSuccess = false;

  try {
    // Setup event handlers
    client.on('connected', () => {
      logger.info('✅ Conectado ao servidor Cedro!');
      connectionSuccess = true;
    });

    client.on('authenticated', async () => {
      logger.info('✅ Autenticado com sucesso!');
      authSuccess = true;
      
      try {
        // Testar subscrições
        logger.info('📡 Testando subscrições...');
        
        // Subscrever DOL com snapshot
        const quoteId = await subscriptionManager.subscribeQuote('DOL', true);
        logger.info('✅ Subscrição Quote DOL criada:', quoteId);
        
        // Subscrever book DOL
        const bookId = await subscriptionManager.subscribeBook('DOL');
        logger.info('✅ Subscrição Book DOL criada:', bookId);
        
        // Subscrever trades DOL
        const tradesId = await subscriptionManager.subscribeTrades('DOL');
        logger.info('✅ Subscrição Trades DOL criada:', tradesId);
        
        subscriptionSuccess = true;
        
        // Exibir estatísticas
        const stats = subscriptionManager.getSubscriptionStats();
        logger.info('📊 Estatísticas de subscrições:', stats);
        
      } catch (error) {
        logger.error('❌ Erro ao criar subscrições:', error);
      }
    });

    client.on('message', (rawMessage) => {
      messageCount++;
      
      try {
        const parsed = parser.parseMessage(rawMessage);
        
        if (parsed) {
          // Log apenas os primeiros 10 dados para não poluir
          if (messageCount <= 10) {
            logger.info(`📨 Dados recebidos #${messageCount}:`, {
              type: parsed.type,
              symbol: parsed.symbol,
              timestamp: parsed.timestamp,
              dataKeys: Object.keys(parsed.data)
            });
            
            // Mostrar dados específicos por tipo
            switch (parsed.type) {
              case 'T': // Quote
                logger.info('📊 Quote:', {
                  lastPrice: parsed.data.lastPrice,
                  bidPrice: parsed.data.bidPrice,
                  askPrice: parsed.data.askPrice,
                  volume: parsed.data.currentVolume
                });
                break;
                
              case 'B': // Book
                logger.info('📖 Book:', {
                  operation: parsed.data.operation,
                  side: parsed.data.side,
                  price: parsed.data.price,
                  volume: parsed.data.volume,
                  position: parsed.data.position
                });
                break;
                
              case 'V': // Trade
                logger.info('💰 Trade:', {
                  price: parsed.data.price,
                  volume: parsed.data.volume,
                  time: parsed.data.time,
                  buyerBroker: parsed.data.buyerBroker,
                  sellerBroker: parsed.data.sellerBroker
                });
                break;
            }
          } else if (messageCount === 11) {
            logger.info('📨 Continuando a receber dados... (logs suprimidos)');
          }
        }
        
      } catch (error) {
        logger.error('❌ Erro ao processar mensagem:', error);
      }
    });

    client.on('error', (error) => {
      logger.error('❌ Erro de conexão:', error);
    });

    client.on('authError', (message) => {
      logger.error('🚫 Erro de autenticação:', message);
    });

    client.on('disconnected', () => {
      logger.warn('❌ Desconectado do servidor');
    });

    // Conectar
    logger.info('🔌 Conectando...');
    await client.connect();

    // Aguardar dados por 30 segundos
    logger.info('⏳ Aguardando dados por 30 segundos...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Finalizar teste
    logger.info('🛑 Finalizando teste...');
    await subscriptionManager.unsubscribeAll();
    client.disconnect();

    // Relatório final
    logger.info('📋 RELATÓRIO FINAL DO TESTE:');
    logger.info('✅ Resultados:', {
      connectionSuccess,
      authSuccess,
      subscriptionSuccess,
      messagesReceived: messageCount,
      testDuration: '30 segundos'
    });

    if (connectionSuccess && authSuccess && subscriptionSuccess && messageCount > 0) {
      logger.info('🎉 TESTE COMPLETO COM SUCESSO!');
      logger.info('✅ Integração Cedro API funcionando perfeitamente');
    } else {
      logger.error('❌ TESTE FALHOU - Verificar problemas acima');
    }

  } catch (error) {
    logger.error('💥 Erro crítico no teste:', error);
    client.disconnect();
  }
}

// Executar teste
if (require.main === module) {
  testRealConnection()
    .then(() => {
      logger.info('🏁 Teste finalizado');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Falha crítica:', error);
      process.exit(1);
    });
}

export { testRealConnection };
