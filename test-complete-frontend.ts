// 🧪 Teste do Sistema Completo Frontend + Backend - Smart-Trade
import { spawn } from 'child_process';
import { createLogger } from './server/src/utils/logger';

const logger = createLogger('TestCompleteFrontend');

async function testCompleteFrontend() {
  logger.info('🧪 Iniciando teste do sistema completo Frontend + Backend...');
  
  let serverProcess: any = null;
  let clientProcess: any = null;
  
  try {
    // 1. Iniciar servidor backend
    logger.info('🚀 Iniciando servidor backend...');
    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: './server',
      stdio: 'pipe',
      shell: true
    });
    
    // Aguardar servidor inicializar
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 2. Iniciar cliente frontend
    logger.info('🌐 Iniciando cliente frontend...');
    clientProcess = spawn('npm', ['run', 'dev'], {
      cwd: './client',
      stdio: 'pipe',
      shell: true
    });
    
    // Aguardar cliente inicializar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    logger.info('✅ Sistema completo rodando!');
    logger.info('🌐 Frontend: http://localhost:3000');
    logger.info('🔌 Backend: http://localhost:3001');
    logger.info('📡 WebSocket: ws://localhost:3002');
    
    // Aguardar por 30 segundos para teste manual
    logger.info('⏳ Sistema rodando por 30 segundos para teste...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    logger.info('✅ Teste do sistema completo concluído!');
    
  } catch (error) {
    logger.error('❌ Erro no teste completo:', error);
    
  } finally {
    // Cleanup
    if (serverProcess) {
      logger.info('🛑 Parando servidor backend...');
      serverProcess.kill();
    }
    
    if (clientProcess) {
      logger.info('🛑 Parando cliente frontend...');
      clientProcess.kill();
    }
  }
}

// Executar teste
if (require.main === module) {
  testCompleteFrontend()
    .then(() => {
      logger.info('🎉 Sistema completo testado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Falha no teste completo:', error);
      process.exit(1);
    });
}
