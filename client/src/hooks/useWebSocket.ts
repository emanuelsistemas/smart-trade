// 🌐 Hook para WebSocket - Smart-Trade
import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastMessage: WebSocketMessage | null;
  error: string | null;
}

export function useWebSocket(config: WebSocketConfig) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isAuthenticated: false,
    connectionState: 'disconnected',
    lastMessage: null,
    error: null
  });

  const [subscriptions] = useState<Set<string>>(new Set());
  const messageHandlersRef = useRef<Map<string, (payload: any) => void>>(new Map());

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        send({ type: 'ping', payload: {} });
        startHeartbeat(); // Reagendar
      }
    }, config.heartbeatInterval || 30000);
  }, [config.heartbeatInterval]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Já conectado
    }

    setState(prev => ({ ...prev, connectionState: 'connecting', error: null }));

    try {
      const ws = new WebSocket(config.url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🌐 WebSocket conectado');
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectionState: 'connected',
          error: null
        }));
        
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          setState(prev => ({ ...prev, lastMessage: message }));
          
          // Processar mensagens especiais
          switch (message.type) {
            case 'welcome':
              console.log('👋 Mensagem de boas-vindas recebida');
              break;
              
            case 'authSuccess':
              console.log('✅ Autenticação bem-sucedida');
              setState(prev => ({ ...prev, isAuthenticated: true }));
              break;
              
            case 'authError':
            case 'error':
              console.error('❌ Erro WebSocket:', message.payload);
              setState(prev => ({ 
                ...prev, 
                error: message.payload.message || 'Erro desconhecido',
                isAuthenticated: false 
              }));
              break;
              
            case 'pong':
              // Resposta ao ping, conexão ativa
              break;
              
            default:
              // Chamar handlers registrados
              const handler = messageHandlersRef.current.get(message.type);
              if (handler) {
                handler(message.payload);
              }
          }
          
        } catch (error) {
          console.error('❌ Erro ao processar mensagem WebSocket:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('❌ WebSocket desconectado:', event.code, event.reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isAuthenticated: false,
          connectionState: 'disconnected'
        }));
        
        wsRef.current = null;
        
        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && reconnectAttemptsRef.current < (config.maxReconnectAttempts || 5)) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Erro WebSocket:', error);
        setState(prev => ({
          ...prev,
          connectionState: 'error',
          error: 'Erro de conexão WebSocket'
        }));
      };

    } catch (error) {
      console.error('❌ Erro ao criar WebSocket:', error);
      setState(prev => ({
        ...prev,
        connectionState: 'error',
        error: 'Falha ao criar conexão WebSocket'
      }));
    }
  }, [config.url, config.maxReconnectAttempts, startHeartbeat]);

  const scheduleReconnect = useCallback(() => {
    reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Backoff exponencial, máx 30s
    
    console.log(`🔄 Tentativa de reconexão ${reconnectAttemptsRef.current} em ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const send = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        ...message,
        timestamp: Date.now()
      };
      
      wsRef.current.send(JSON.stringify(fullMessage));
      return true;
    }
    
    console.warn('⚠️ WebSocket não conectado, mensagem não enviada:', message);
    return false;
  }, []);

  const authenticate = useCallback((token: string) => {
    return send({
      type: 'auth',
      payload: { token }
    });
  }, [send]);

  const subscribe = useCallback((channel: string) => {
    if (subscriptions.has(channel)) {
      console.warn(`⚠️ Já subscrito no canal: ${channel}`);
      return false;
    }
    
    const success = send({
      type: 'subscribe',
      payload: { channel }
    });
    
    if (success) {
      subscriptions.add(channel);
    }
    
    return success;
  }, [send, subscriptions]);

  const unsubscribe = useCallback((channel: string) => {
    if (!subscriptions.has(channel)) {
      console.warn(`⚠️ Não subscrito no canal: ${channel}`);
      return false;
    }
    
    const success = send({
      type: 'unsubscribe',
      payload: { channel }
    });
    
    if (success) {
      subscriptions.delete(channel);
    }
    
    return success;
  }, [send, subscriptions]);

  const onMessage = useCallback((type: string, handler: (payload: any) => void) => {
    messageHandlersRef.current.set(type, handler);
    
    // Retornar função de cleanup
    return () => {
      messageHandlersRef.current.delete(type);
    };
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setState(prev => ({
      ...prev,
      isConnected: false,
      isAuthenticated: false,
      connectionState: 'disconnected'
    }));
  }, [cleanup]);

  // Conectar automaticamente ao montar
  useEffect(() => {
    connect();
    
    // Cleanup ao desmontar
    return cleanup;
  }, [connect, cleanup]);

  return {
    // Estado
    ...state,
    subscriptions: Array.from(subscriptions),
    
    // Ações
    connect,
    disconnect,
    send,
    authenticate,
    subscribe,
    unsubscribe,
    onMessage
  };
}
