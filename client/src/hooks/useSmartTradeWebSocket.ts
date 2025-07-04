// 🔌 Hook integrado WebSocket + Store - Smart-Trade
import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAppStore } from '../stores/useAppStore';

const WS_URL = 'ws://localhost:3002';

console.log('🔌 useSmartTradeWebSocket: Inicializando hook...');

export function useSmartTradeWebSocket() {
  const {
    isConnected,
    isAuthenticated,
    connectionState,
    error,
    connect,
    disconnect,
    authenticate,
    subscribe,
    unsubscribe,
    onMessage
  } = useWebSocket({
    url: WS_URL,
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000
  });

  const {
    setConnectionState,
    updateQuote,
    addTrade,
    updateBook,
    updateSystemStats,
    addSystemMessage,
    selectedSymbol
  } = useAppStore();

  // Atualizar estado de conexão no store
  useEffect(() => {
    setConnectionState(isConnected, isAuthenticated, error);
  }, [isConnected, isAuthenticated, error, setConnectionState]);

  // Configurar handlers de mensagens
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Handler para quotes
    unsubscribers.push(
      onMessage('quote', (payload) => {
        updateQuote({
          symbol: payload.symbol,
          timestamp: payload.timestamp || Date.now(),
          lastPrice: payload.lastPrice,
          bidPrice: payload.bidPrice,
          askPrice: payload.askPrice,
          volume: payload.volume,
          change: payload.change
        });
      })
    );

    // Handler para trades
    unsubscribers.push(
      onMessage('trades', (payload) => {
        if (payload.data) {
          // Múltiplos trades
          payload.data.forEach((trade: any) => {
            addTrade({
              symbol: trade.symbol,
              timestamp: trade.timestamp || Date.now(),
              price: trade.price,
              volume: trade.volume,
              side: trade.side,
              tradeId: trade.tradeId
            });
          });
        } else {
          // Trade único
          addTrade({
            symbol: payload.symbol,
            timestamp: payload.timestamp || Date.now(),
            price: payload.price,
            volume: payload.volume,
            side: payload.side,
            tradeId: payload.tradeId
          });
        }
      })
    );

    // Handler para dados de mercado diretos da Cedro
    unsubscribers.push(
      onMessage('T', (payload) => {
        // Quote da Cedro
        updateQuote({
          symbol: payload.symbol,
          timestamp: Date.now(),
          lastPrice: payload.lastPrice,
          bidPrice: payload.bidPrice,
          askPrice: payload.askPrice,
          volume: payload.currentVolume,
          change: payload.variation
        });
      })
    );

    unsubscribers.push(
      onMessage('V', (payload) => {
        // Trade da Cedro
        addTrade({
          symbol: payload.symbol,
          timestamp: Date.now(),
          price: payload.price,
          volume: payload.volume,
          side: payload.aggressor === 'A' ? 'BUY' : 'SELL',
          tradeId: payload.tradeId
        });
      })
    );

    // Handler para book
    unsubscribers.push(
      onMessage('book', (payload) => {
        updateBook({
          symbol: payload.symbol,
          timestamp: payload.timestamp || Date.now(),
          bids: payload.bids || [],
          asks: payload.asks || []
        });
      })
    );

    // Handler para estatísticas do sistema
    unsubscribers.push(
      onMessage('systemStats', (payload) => {
        updateSystemStats({
          connected: payload.connected || true,
          totalClients: payload.totalClients || 0,
          authenticatedClients: payload.authenticatedClients || 0,
          totalSubscriptions: payload.totalSubscriptions || 0,
          uptime: payload.uptime || 0
        });
      })
    );

    // Handler para mensagens do sistema
    unsubscribers.push(
      onMessage('systemMessage', (payload) => {
        addSystemMessage(payload.message, payload.level || 'info');
      })
    );

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [onMessage, updateQuote, addTrade, updateBook, updateSystemStats, addSystemMessage]);

  // Auto-autenticação quando conectado
  useEffect(() => {
    if (isConnected && !isAuthenticated) {
      console.log('🔐 Tentando autenticar...');

      // Para desenvolvimento, usar token simples
      const demoToken = 'trader-dev-token';

      console.log('🔐 Enviando token de desenvolvimento:', demoToken);
      authenticate(demoToken);
    }
  }, [isConnected, isAuthenticated, authenticate]);

  // Auto-subscrição quando autenticado
  useEffect(() => {
    if (isAuthenticated && selectedSymbol) {
      // Subscrever canais do símbolo selecionado
      subscribe(`quotes:${selectedSymbol}`);
      subscribe(`trades:${selectedSymbol}`);
      subscribe(`book:${selectedSymbol}`);
      subscribe('system');
    }
  }, [isAuthenticated, selectedSymbol, subscribe]);

  // Função para trocar símbolo
  const changeSymbol = useCallback((newSymbol: string) => {
    if (isAuthenticated) {
      // Desinscrever do símbolo anterior
      unsubscribe(`quotes:${selectedSymbol}`);
      unsubscribe(`trades:${selectedSymbol}`);
      unsubscribe(`book:${selectedSymbol}`);
      
      // Inscrever no novo símbolo
      subscribe(`quotes:${newSymbol}`);
      subscribe(`trades:${newSymbol}`);
      subscribe(`book:${newSymbol}`);
    }
  }, [isAuthenticated, selectedSymbol, subscribe, unsubscribe]);

  return {
    // Estado da conexão
    isConnected,
    isAuthenticated,
    connectionState,
    error,
    
    // Ações
    connect,
    disconnect,
    changeSymbol,
    
    // Funções de subscrição manual
    subscribe,
    unsubscribe
  };
}
