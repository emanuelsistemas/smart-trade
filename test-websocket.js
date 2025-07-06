// 🧪 Teste simples de conexão WebSocket
const WebSocket = require('ws');

console.log('🔌 Testando conexão WebSocket...');

const ws = new WebSocket('ws://localhost:8081');

ws.on('open', function open() {
  console.log('✅ Conectado ao WebSocket!');
  
  // Enviar mensagem de autenticação
  ws.send(JSON.stringify({
    type: 'auth',
    payload: { token: 'trader-dev-token' },
    timestamp: Date.now()
  }));
});

ws.on('message', function message(data) {
  console.log('📨 Mensagem recebida:', data.toString());
});

ws.on('close', function close() {
  console.log('❌ Conexão fechada');
});

ws.on('error', function error(err) {
  console.error('❌ Erro WebSocket:', err.message);
});

// Fechar após 10 segundos
setTimeout(() => {
  console.log('⏰ Fechando conexão de teste...');
  ws.close();
  process.exit(0);
}, 10000);
