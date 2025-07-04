// 🧪 Teste simples de conexão WebSocket
const WebSocket = require('ws');

console.log('🧪 Testando conexão WebSocket...');

const ws = new WebSocket('ws://localhost:3002');

ws.on('open', function open() {
  console.log('✅ WebSocket conectado com sucesso!');
  
  // Enviar mensagem de teste
  ws.send(JSON.stringify({
    type: 'ping',
    payload: {},
    timestamp: Date.now()
  }));
});

ws.on('message', function message(data) {
  console.log('📨 Mensagem recebida:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ Erro WebSocket:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket desconectado');
});

// Fechar após 5 segundos
setTimeout(() => {
  console.log('🛑 Fechando conexão de teste...');
  ws.close();
  process.exit(0);
}, 5000);
