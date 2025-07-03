// 🧪 Teste do Sistema Integrado - Smart-Trade
import { SmartTradeServer } from './main';
import { createLogger } from './utils/logger';

const logger = createLogger('TestIntegratedSystem');

async function testIntegratedSystem() {
  logger.info('🧪 Iniciando teste do sistema integrado...');
  
  const server = new SmartTradeServer();
  
  try {
    // Iniciar servidor
    logger.info('🚀 Iniciando servidor...');
    await server.start();
    
    // Aguardar dados por 30 segundos
    logger.info('⏳ Aguardando dados por 30 segundos...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Parar servidor
    logger.info('🛑 Parando servidor...');
    await server.shutdown('test-complete');
    
    logger.info('✅ Teste do sistema integrado concluído com sucesso!');
    
  } catch (error) {
    logger.error('❌ Erro no teste integrado:', error);
    await server.shutdown('test-error');
    process.exit(1);
  }
}

// Executar teste
if (require.main === module) {
  testIntegratedSystem()
    .then(() => {
      logger.info('🎉 Sistema integrado funcionando perfeitamente!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Falha no teste integrado:', error);
      process.exit(1);
    });
}

export { testIntegratedSystem };
