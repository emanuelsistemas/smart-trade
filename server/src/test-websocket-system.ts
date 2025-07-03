// 🧪 Teste do Sistema WebSocket - Smart-Trade
import WebSocket from 'ws';
import { TradingWebSocketServer } from './websocket/websocket-server';
import { AuthManager } from './websocket/auth-manager';
import { DataBroadcaster } from './websocket/data-broadcaster';
import { TradingSQLiteManager } from './data/sqlite-manager';
import { TradingRedisManager } from './data/redis-manager';
import { DataFlowManager } from './data/data-flow-manager';
import { createLogger } from './utils/logger';
import path from 'path';
import fs from 'fs';

const logger = createLogger('TestWebSocketSystem');

async function testWebSocketSystem() {
  logger.info('🧪 Iniciando testes do Sistema WebSocket...');
  
  // Configurações de teste
  const testConfig = {
    websocket: {
      port: 3003, // Porta diferente para teste
      host: 'localhost',
      jwtSecret: 'test-secret-key',
      heartbeatInterval: 5000,
      maxConnections: 10
    },
    auth: {
      jwtSecret: 'test-secret-key',
      jwtExpiresIn: '1h',
      maxSessions: 3
    },
    broadcast: {
      throttleInterval: 100,
      maxQueueSize: 100,
      enableCompression: false
    }
  };

  // Banco temporário para teste
  const testDbPath = path.join(process.cwd(), 'data', 'test-ws.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const sqlite = new TradingSQLiteManager(testDbPath);
  const redis = new TradingRedisManager();
  const dataFlow = new DataFlowManager(sqlite, redis, {
    batchSize: 10,
    batchInterval: 1000,
    bufferSize: 100
  });

  const authManager = new AuthManager(testConfig.auth);
  const wsServer = new TradingWebSocketServer(testConfig.websocket);
  const dataBroadcaster = new DataBroadcaster(
    wsServer,
    authManager,
    dataFlow,
    testConfig.broadcast
  );

  try {
    // Inicializar componentes
    await sqlite.initialize();
    await redis.connect();
    await wsServer.start();

    logger.info('✅ Componentes WebSocket inicializados');

    // Teste 1: Autenticação
    await testAuthentication(authManager);

    // Teste 2: Conexão WebSocket
    await testWebSocketConnection(testConfig.websocket.port, authManager);

    // Teste 3: Broadcasting
    await testDataBroadcasting(dataBroadcaster, dataFlow);

    // Teste 4: Estatísticas
    await testSystemStats(wsServer, authManager, dataBroadcaster);

    logger.info('✅ Todos os testes WebSocket passaram!');

  } catch (error) {
    logger.error('❌ Falha nos testes WebSocket:', error);
    throw error;

  } finally {
    // Cleanup
    await wsServer.stop();
    await dataBroadcaster.shutdown();
    authManager.shutdown();
    await dataFlow.shutdown();

    // Limpar arquivo de teste
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  }
}

async function testAuthentication(authManager: AuthManager) {
  logger.info('🔐 Testando autenticação...');

  // Teste login válido
  const token = await authManager.authenticate({
    username: 'trader',
    password: 'trader123'
  });

  if (!token) {
    throw new Error('Falha na autenticação válida');
  }

  logger.info('✅ Login válido funcionando');

  // Teste verificação de token
  const payload = authManager.verifyToken(token);
  if (!payload || payload.username !== 'trader') {
    throw new Error('Falha na verificação de token');
  }

  logger.info('✅ Verificação de token funcionando');

  // Teste login inválido
  const invalidToken = await authManager.authenticate({
    username: 'invalid',
    password: 'wrong'
  });

  if (invalidToken) {
    throw new Error('Login inválido deveria falhar');
  }

  logger.info('✅ Rejeição de login inválido funcionando');

  // Teste revogação de token
  const revoked = authManager.revokeToken(token);
  if (!revoked) {
    throw new Error('Falha na revogação de token');
  }

  logger.info('✅ Revogação de token funcionando');
}

async function testWebSocketConnection(port: number, authManager: AuthManager) {
  logger.info('🌐 Testando conexão WebSocket...');

  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    let authenticated = false;
    let subscribed = false;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout na conexão WebSocket'));
    }, 10000);

    ws.on('open', async () => {
      logger.info('✅ Conexão WebSocket estabelecida');

      // Obter token válido
      const token = await authManager.authenticate({
        username: 'trader',
        password: 'trader123'
      });

      if (!token) {
        reject(new Error('Falha ao obter token para teste'));
        return;
      }

      // Enviar autenticação
      ws.send(JSON.stringify({
        type: 'auth',
        payload: { token }
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug('📨 Mensagem recebida:', message.type);

        switch (message.type) {
          case 'welcome':
            logger.info('✅ Mensagem de boas-vindas recebida');
            break;

          case 'authSuccess':
            logger.info('✅ Autenticação WebSocket bem-sucedida');
            authenticated = true;

            // Testar subscrição
            ws.send(JSON.stringify({
              type: 'subscribe',
              payload: { channel: 'quotes:DOL' }
            }));
            break;

          case 'subscribed':
            logger.info('✅ Subscrição WebSocket bem-sucedida');
            subscribed = true;

            // Testar ping
            ws.send(JSON.stringify({
              type: 'ping',
              payload: {}
            }));
            break;

          case 'pong':
            logger.info('✅ Pong recebido');

            if (authenticated && subscribed) {
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
            break;

          case 'error':
            logger.error('❌ Erro WebSocket:', message.payload);
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`WebSocket error: ${message.payload.message}`));
            break;
        }

      } catch (error) {
        logger.error('❌ Erro ao processar mensagem:', error);
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      logger.info('❌ Conexão WebSocket fechada');
    });
  });
}

async function testDataBroadcasting(dataBroadcaster: DataBroadcaster, dataFlow: DataFlowManager) {
  logger.info('📡 Testando broadcasting de dados...');

  // Simular dados de mercado
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

  // Processar dados
  await dataFlow.processMarketData(mockQuoteMessage);

  logger.info('✅ Dados processados para broadcasting');

  // Testar mensagem do sistema
  dataBroadcaster.broadcastSystemMessage('Sistema funcionando', 'info');

  logger.info('✅ Mensagem do sistema enviada');

  // Testar status do mercado
  dataBroadcaster.broadcastMarketStatus('open');

  logger.info('✅ Status do mercado enviado');
}

async function testSystemStats(
  wsServer: TradingWebSocketServer,
  authManager: AuthManager,
  dataBroadcaster: DataBroadcaster
) {
  logger.info('📊 Testando estatísticas do sistema...');

  const wsStats = wsServer.getStats();
  logger.info('✅ Estatísticas WebSocket:', wsStats);

  const authStats = authManager.getSystemStats();
  logger.info('✅ Estatísticas Auth:', authStats);

  const broadcastStats = dataBroadcaster.getStats();
  logger.info('✅ Estatísticas Broadcasting:', broadcastStats);

  const clientList = wsServer.getClientList();
  logger.info('✅ Lista de clientes:', { count: clientList.length });
}

// Executar testes
if (require.main === module) {
  testWebSocketSystem()
    .then(() => {
      logger.info('🎉 Todos os testes WebSocket concluídos com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Falha nos testes WebSocket:', error);
      process.exit(1);
    });
}

export { testWebSocketSystem };
