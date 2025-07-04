// 🧪 Servidor WebSocket simples para teste
const WebSocket = require('ws');

console.log('🚀 Iniciando servidor WebSocket simples...');

const wss = new WebSocket.Server({ 
  port: 3003,
  host: 'localhost'
});

console.log('✅ Servidor WebSocket rodando em ws://localhost:3003');

wss.on('connection', function connection(ws, req) {
  console.log('🔌 Nova conexão WebSocket:', req.socket.remoteAddress);
  
  // Enviar mensagem de boas-vindas
  ws.send(JSON.stringify({
    type: 'welcome',
    payload: {
      clientId: Math.random().toString(36).substr(2, 9),
      serverTime: Date.now(),
      version: '1.0.0'
    },
    timestamp: Date.now()
  }));

  ws.on('message', function message(data) {
    console.log('📨 Mensagem recebida:', data.toString());
    
    try {
      const parsed = JSON.parse(data.toString());
      
      if (parsed.type === 'ping') {
        // Responder com pong
        ws.send(JSON.stringify({
          type: 'pong',
          payload: {
            timestamp: Date.now()
          },
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
    }
  });

  ws.on('close', function close() {
    console.log('🔌 Conexão WebSocket fechada');
  });

  ws.on('error', function error(err) {
    console.error('❌ Erro WebSocket:', err);
  });
});

wss.on('error', function error(err) {
  console.error('❌ Erro do servidor WebSocket:', err);
});

console.log('🎯 Servidor pronto para conexões...');

// Manter o processo rodando
process.on('SIGINT', () => {
  console.log('🛑 Parando servidor WebSocket...');
  wss.close(() => {
    console.log('✅ Servidor WebSocket parado');
    process.exit(0);
  });
});
