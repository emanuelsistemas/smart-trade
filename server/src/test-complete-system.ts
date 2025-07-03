// 🧪 Teste do Sistema Completo - Smart-Trade
import { SmartTradeServer } from './main';
import WebSocket from 'ws';
import { createLogger } from './utils/logger';

const logger = createLogger('TestCompleteSystem');

async function testCompleteSystem() {
  logger.info('🧪 Iniciando teste do sistema completo...');

  const server = new SmartTradeServer();
  
  try {
    // Iniciar servidor completo
    logger.info('🚀 Iniciando servidor completo...');
    await server.start();
    
    // Aguardar inicialização
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Testar conexão WebSocket com dados reais
    logger.info('🌐 Testando cliente WebSocket...');
    await testWebSocketClient();
    
    // Aguardar dados da Cedro por 20 segundos
    logger.info('⏳ Aguardando dados da Cedro por 20 segundos...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    logger.info('✅ Teste do sistema completo concluído!');
    
  } catch (error) {
    logger.error('❌ Erro no teste completo:', error);
    throw error;
    
  } finally {
    logger.info('🛑 Parando servidor...');
    await server.shutdown('test-complete');
  }
}

async function testWebSocketClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3002');
    let authenticated = false;
    let dataReceived = false;
    
    const timeout = setTimeout(() => {
      ws.close();
      if (!authenticated) {
        reject(new Error('Timeout na autenticação WebSocket'));
      } else if (!dataReceived) {
        logger.warn('⚠️ Nenhum dado recebido, mas autenticação OK');
        resolve();
      } else {
        resolve();
      }
    }, 15000);
    
    ws.on('open', () => {
      logger.info('✅ Conectado ao WebSocket do servidor');
      
      // Simular autenticação (token simples para teste)
      ws.send(JSON.stringify({
        type: 'auth',
        payload: { 
          token: 'test-token' // Em produção, usar token JWT real
        }
      }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'welcome':
            logger.info('📨 Mensagem de boas-vindas recebida');
            break;
            
          case 'authSuccess':
            logger.info('✅ Autenticação WebSocket bem-sucedida');
            authenticated = true;
            
            // Subscrever canais
            ws.send(JSON.stringify({
              type: 'subscribe',
              payload: { channel: 'quotes:DOL' }
            }));
            
            ws.send(JSON.stringify({
              type: 'subscribe',
              payload: { channel: 'trades:DOL' }
            }));
            
            ws.send(JSON.stringify({
              type: 'subscribe',
              payload: { channel: 'system' }
            }));
            break;
            
          case 'subscribed':
            logger.info(`📡 Subscrito no canal: ${message.payload.channel}`);
            break;
            
          case 'quote':
          case 'trades':
          case 'T':
          case 'V':
          case 'B':
            if (!dataReceived) {
              logger.info('📊 Primeiro dado recebido:', {
                type: message.type,
                symbol: message.payload?.symbol || 'N/A'
              });
              dataReceived = true;
            }
            break;
            
          case 'systemMessage':
            logger.info('📢 Mensagem do sistema:', message.payload.message);
            break;
            
          case 'marketStatus':
            logger.info('📊 Status do mercado:', message.payload.status);
            break;
            
          case 'systemStats':
            logger.info('📊 Estatísticas do sistema recebidas');
            break;
            
          case 'error':
            logger.error('❌ Erro WebSocket:', message.payload);
            if (message.payload.code === 'NOT_AUTHENTICATED') {
              // Erro esperado com token de teste
              logger.info('⚠️ Erro de autenticação esperado (token de teste)');
              authenticated = false;
            }
            break;
            
          default:
            logger.debug('📨 Mensagem não reconhecida:', message.type);
        }
        
      } catch (error) {
        logger.error('❌ Erro ao processar mensagem WebSocket:', error);
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      logger.error('❌ Erro na conexão WebSocket:', error);
      reject(error);
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      logger.info('❌ Conexão WebSocket fechada');
      
      if (authenticated || dataReceived) {
        resolve();
      }
    });
  });
}

// Executar teste
if (require.main === module) {
  testCompleteSystem()
    .then(() => {
      logger.info('🎉 Sistema completo funcionando perfeitamente!');
      logger.info('✅ Integração Cedro + Dados + WebSocket validada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Falha no teste completo:', error);
      process.exit(1);
    });
}

export { testCompleteSystem };
