// 🔧 Componente de debug WebSocket - Smart-Trade
import { useState, useEffect } from 'react';

export function WebSocketDebug() {
  const [status, setStatus] = useState('Desconectado');
  const [messages, setMessages] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    console.log('🔧 WebSocketDebug: Iniciando...');

    // Tentar conectar com timeout
    const connectWithTimeout = () => {
      try {
        const websocket = new WebSocket('ws://localhost:3002');
        setWs(websocket);

        // Timeout de 5 segundos para conexão
        const timeout = setTimeout(() => {
          if (websocket.readyState === WebSocket.CONNECTING) {
            console.log('⏰ WebSocketDebug: Timeout na conexão');
            websocket.close();
            setStatus('Timeout');
            setMessages(prev => [...prev, 'Timeout na conexão - Servidor pode estar offline']);
          }
        }, 5000);

        websocket.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ WebSocketDebug: Conectado');
          setStatus('Conectado');
          setMessages(prev => [...prev, 'Conectado com sucesso']);
        };

        return websocket;
      } catch (error) {
        console.error('❌ WebSocketDebug: Erro ao criar WebSocket', error);
        setStatus('Erro');
        setMessages(prev => [...prev, `Erro ao criar WebSocket: ${error}`]);
        return null;
      }
    };

    const websocket = connectWithTimeout();
    if (!websocket) return;



    websocket.onmessage = (event) => {
      console.log('📨 WebSocketDebug: Mensagem recebida', event.data);
      setMessages(prev => [...prev, `Recebido: ${event.data}`]);
    };

    websocket.onerror = (error) => {
      console.error('❌ WebSocketDebug: Erro', error);
      setStatus('Erro');
      setMessages(prev => [...prev, `Erro: ${error}`]);
    };

    websocket.onclose = () => {
      console.log('🔌 WebSocketDebug: Desconectado');
      setStatus('Desconectado');
      setMessages(prev => [...prev, 'Desconectado']);
    };

    return () => {
      websocket.close();
    };
  }, []);

  const sendPing = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'ping',
        payload: {},
        timestamp: Date.now()
      });
      ws.send(message);
      setMessages(prev => [...prev, `Enviado: ${message}`]);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 m-4">
      <h3 className="text-lg font-semibold text-white mb-4">🔧 WebSocket Debug</h3>

      {status === 'Timeout' || status === 'Erro' ? (
        <div className="bg-red-900 border border-red-700 rounded p-3 mb-4">
          <h4 className="text-red-200 font-medium mb-2">❌ Problema de Conexão</h4>
          <p className="text-red-300 text-sm mb-2">
            O WebSocket não conseguiu conectar ao servidor backend.
          </p>
          <div className="text-red-300 text-sm">
            <p className="font-medium">Para resolver:</p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Verifique se o servidor backend está rodando</li>
              <li>Execute: <code className="bg-red-800 px-1 rounded">cd server && npm run dev</code></li>
              <li>Aguarde a mensagem: "WebSocket Server iniciado em ws://localhost:3002"</li>
              <li>Recarregue esta página</li>
            </ol>
          </div>
        </div>
      ) : null}
      
      <div className="mb-4">
        <span className="text-gray-400">Status: </span>
        <span className={`font-medium ${
          status === 'Conectado' ? 'text-green-400' : 
          status === 'Erro' ? 'text-red-400' : 'text-yellow-400'
        }`}>
          {status}
        </span>
      </div>

      <button
        onClick={sendPing}
        disabled={status !== 'Conectado'}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded mb-4"
      >
        Enviar Ping
      </button>

      <div className="bg-gray-900 border border-gray-600 rounded p-3 max-h-64 overflow-y-auto">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Mensagens:</h4>
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma mensagem ainda...</p>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => (
              <div key={index} className="text-xs text-gray-300 font-mono">
                {message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
