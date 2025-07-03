// 🧪 Teste da integração Cedro API
import { CedroTcpClient } from './cedro/client';
import { CedroMessageParser } from './cedro/parser';
import { SubscriptionManager } from './cedro/subscription-manager';
import { CedroErrorHandler } from './cedro/error-handler';
import { createLogger } from './utils/logger';

const logger = createLogger('TestCedro');

// Configuração de teste (mock)
const testConfig = {
  host: 'localhost', // Será substituído por host real
  port: 81,
  username: 'test-user',
  password: 'test-pass',
  timeout: 10000,
  maxReconnectAttempts: 3,
  reconnectDelay: 2000
};

async function testCedroComponents() {
  logger.info('🧪 Iniciando testes dos componentes Cedro...');
  
  try {
    // Teste 1: Parser de mensagens
    await testMessageParser();
    
    // Teste 2: Tratamento de erros
    await testErrorHandler();
    
    // Teste 3: Cliente TCP (sem conexão real)
    await testTcpClient();
    
    logger.info('✅ Todos os testes passaram!');
    
  } catch (error) {
    logger.error('❌ Falha nos testes:', error);
    process.exit(1);
  }
}

async function testMessageParser() {
  logger.info('🔍 Testando parser de mensagens...');
  
  const parser = new CedroMessageParser();
  
  // Teste mensagem Quote (SQT)
  const quoteMessage = 'T:DOL:14:30:25:2:6.0450:3:6.0440:4:6.0460:6:100:7:50!';
  const parsedQuote = parser.parseMessage(quoteMessage);
  
  if (!parsedQuote || parsedQuote.type !== 'T') {
    throw new Error('Falha no parse de mensagem Quote');
  }
  
  logger.info('✅ Quote parseada:', {
    symbol: parsedQuote.symbol,
    lastPrice: parsedQuote.data.lastPrice,
    bidPrice: parsedQuote.data.bidPrice,
    askPrice: parsedQuote.data.askPrice
  });
  
  // Teste mensagem Book (BQT)
  const bookMessage = 'B:DOL:A:1:V:6.0440:100:123:14:30:25:ORD001:L';
  const parsedBook = parser.parseMessage(bookMessage);
  
  if (!parsedBook || parsedBook.type !== 'B') {
    throw new Error('Falha no parse de mensagem Book');
  }
  
  logger.info('✅ Book parseado:', {
    symbol: parsedBook.symbol,
    operation: parsedBook.data.operation,
    side: parsedBook.data.side,
    price: parsedBook.data.price,
    volume: parsedBook.data.volume
  });
  
  // Teste mensagem Trade (GQT)
  const tradeMessage = 'V:DOL:A:14:30:25:6.0450:123:456:50:TRD001:D:A';
  const parsedTrade = parser.parseMessage(tradeMessage);
  
  if (!parsedTrade || parsedTrade.type !== 'V') {
    throw new Error('Falha no parse de mensagem Trade');
  }
  
  logger.info('✅ Trade parseado:', {
    symbol: parsedTrade.symbol,
    price: parsedTrade.data.price,
    volume: parsedTrade.data.volume,
    time: parsedTrade.data.time
  });
  
  // Teste mensagem de erro
  const errorMessage = 'E:2:Objeto não encontrado';
  const parsedError = parser.parseMessage(errorMessage);
  
  if (!parsedError || parsedError.type !== 'E') {
    throw new Error('Falha no parse de mensagem de erro');
  }
  
  logger.info('✅ Erro parseado:', {
    code: parsedError.data.code,
    message: parsedError.data.message
  });
}

async function testErrorHandler() {
  logger.info('🚨 Testando tratamento de erros...');
  
  // Teste diferentes códigos de erro
  const testCases = [
    { code: '1', expected: 'Comando inválido' },
    { code: '2', expected: 'Objeto não encontrado' },
    { code: '3', expected: 'Sem permissão' },
    { code: '6', expected: 'Segunda conexão com mesmo usuário' },
    { code: '11', expected: 'Servidor indisponível' },
    { code: '18', expected: 'Erro quantidade quotes' },
    { code: '999', expected: 'Teste' } // Código não documentado - retorna mensagem original
  ];
  
  for (const testCase of testCases) {
    const error = CedroErrorHandler.handleError(testCase.code, 'Teste');
    
    if (!error.message.toLowerCase().includes(testCase.expected.toLowerCase())) {
      throw new Error(`Erro não tratado corretamente: ${testCase.code} - esperado: ${testCase.expected}, recebido: ${error.message}`);
    }
    
    logger.info(`✅ Erro ${testCase.code} tratado:`, {
      message: error.message,
      recoverable: error.recoverable,
      fatal: error.fatal
    });
  }
  
  // Teste funções utilitárias
  const isRecoverable = CedroErrorHandler.isRecoverableError('6');
  const isFatal = CedroErrorHandler.isFatalError('3');
  const shouldReconnect = CedroErrorHandler.shouldReconnect('11');
  
  logger.info('✅ Funções utilitárias:', {
    isRecoverable,
    isFatal,
    shouldReconnect
  });
}

async function testTcpClient() {
  logger.info('🔌 Testando cliente TCP (sem conexão)...');
  
  const client = new CedroTcpClient(testConfig);
  const subscriptionManager = new SubscriptionManager(client);
  
  // Testar propriedades iniciais
  if (client.connected || client.authenticated) {
    throw new Error('Cliente deveria estar desconectado inicialmente');
  }
  
  logger.info('✅ Estado inicial do cliente correto');
  
  // Testar informações de conexão
  const connectionInfo = client.connectionInfo;
  logger.info('✅ Informações de conexão:', connectionInfo);
  
  // Testar estatísticas de subscrições
  const stats = subscriptionManager.getSubscriptionStats();
  logger.info('✅ Estatísticas de subscrições:', stats);
  
  // Testar criação de IDs de subscrição (sem enviar comandos)
  try {
    // Isso deve falhar porque não está conectado
    await subscriptionManager.subscribeQuote('DOL');
    throw new Error('Deveria falhar - cliente não conectado');
  } catch (error) {
    if (error instanceof Error && error.message.includes('não autenticado')) {
      logger.info('✅ Validação de autenticação funcionando');
    } else {
      throw error;
    }
  }
}

// Função para testar com dados reais (quando credenciais estiverem disponíveis)
async function testRealConnection() {
  logger.info('🌐 Teste de conexão real (requer credenciais)...');
  
  // Verificar se credenciais estão configuradas
  if (!process.env.CEDRO_HOST || !process.env.CEDRO_USERNAME || !process.env.CEDRO_PASSWORD) {
    logger.warn('⚠️ Credenciais Cedro não configuradas, pulando teste real');
    return;
  }
  
  const realConfig = {
    host: process.env.CEDRO_HOST,
    port: parseInt(process.env.CEDRO_PORT || '81'),
    username: process.env.CEDRO_USERNAME,
    password: process.env.CEDRO_PASSWORD,
    timeout: 30000,
    maxReconnectAttempts: 3,
    reconnectDelay: 5000
  };
  
  const client = new CedroTcpClient(realConfig);
  const parser = new CedroMessageParser();
  const subscriptionManager = new SubscriptionManager(client);
  
  try {
    logger.info('🔌 Conectando ao Cedro...');
    
    // Setup event handlers para teste
    client.on('authenticated', async () => {
      logger.info('✅ Autenticado! Testando subscrição...');
      
      try {
        await subscriptionManager.subscribeQuote('DOL', true);
        logger.info('✅ Subscrição DOL criada');
        
        // Aguardar alguns dados
        setTimeout(async () => {
          await subscriptionManager.unsubscribeAll();
          client.disconnect();
          logger.info('✅ Teste real concluído');
        }, 10000);
        
      } catch (error) {
        logger.error('❌ Erro na subscrição:', error);
        client.disconnect();
      }
    });
    
    client.on('message', (rawMessage) => {
      const parsed = parser.parseMessage(rawMessage);
      if (parsed) {
        logger.info('📨 Dados recebidos:', {
          type: parsed.type,
          symbol: parsed.symbol
        });
      }
    });
    
    await client.connect();
    
  } catch (error) {
    logger.error('❌ Erro no teste real:', error);
    client.disconnect();
  }
}

// Executar testes
if (require.main === module) {
  testCedroComponents()
    .then(() => testRealConnection())
    .then(() => {
      logger.info('🎉 Todos os testes concluídos!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Falha nos testes:', error);
      process.exit(1);
    });
}

export { testCedroComponents, testRealConnection };
