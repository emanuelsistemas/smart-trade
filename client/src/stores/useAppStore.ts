// 🏪 Store principal da aplicação - Smart-Trade
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface QuoteData {
  symbol: string;
  timestamp: number;
  lastPrice?: number;
  bidPrice?: number;
  askPrice?: number;
  volume?: number;
  change?: number;
  changePercent?: number;
}

export interface TradeData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  side: 'BUY' | 'SELL';
  tradeId: string;
}

export interface BookLevel {
  price: number;
  volume: number;
  position: number;
}

export interface BookData {
  symbol: string;
  timestamp: number;
  bids: BookLevel[];
  asks: BookLevel[];
}

export interface SystemStats {
  connected: boolean;
  totalClients: number;
  authenticatedClients: number;
  totalSubscriptions: number;
  uptime: number;
}

export interface AppState {
  // Conexão
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionError: string | null;
  
  // Dados de mercado
  quotes: Record<string, QuoteData>;
  trades: Record<string, TradeData[]>;
  books: Record<string, BookData>;
  
  // Sistema
  systemStats: SystemStats | null;
  systemMessages: Array<{
    id: string;
    message: string;
    level: 'info' | 'warning' | 'error';
    timestamp: number;
  }>;
  
  // UI
  selectedSymbol: string;
  activeView: 'dashboard' | 'orderflow' | 'footprint' | 'settings';
  sidebarCollapsed: boolean;
  
  // Configurações
  settings: {
    theme: 'light' | 'dark';
    autoReconnect: boolean;
    soundEnabled: boolean;
    refreshRate: number;
  };
}

export interface AppActions {
  // Conexão
  setConnectionState: (connected: boolean, authenticated: boolean, error?: string | null) => void;
  
  // Dados de mercado
  updateQuote: (quote: QuoteData) => void;
  addTrade: (trade: TradeData) => void;
  updateBook: (book: BookData) => void;
  
  // Sistema
  updateSystemStats: (stats: SystemStats) => void;
  addSystemMessage: (message: string, level: 'info' | 'warning' | 'error') => void;
  clearSystemMessages: () => void;
  
  // UI
  setSelectedSymbol: (symbol: string) => void;
  setActiveView: (view: AppState['activeView']) => void;
  toggleSidebar: () => void;
  
  // Configurações
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  
  // Utilitários
  reset: () => void;
}

const initialState: AppState = {
  // Conexão
  isConnected: false,
  isAuthenticated: false,
  connectionError: null,
  
  // Dados de mercado
  quotes: {},
  trades: {},
  books: {},
  
  // Sistema
  systemStats: null,
  systemMessages: [],
  
  // UI
  selectedSymbol: 'PETR4',
  activeView: 'dashboard',
  sidebarCollapsed: false,
  
  // Configurações
  settings: {
    theme: 'dark',
    autoReconnect: true,
    soundEnabled: false,
    refreshRate: 100
  }
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    (set) => ({
      ...initialState,
      
      // Conexão
      setConnectionState: (connected, authenticated, error = null) =>
        set(
          { 
            isConnected: connected, 
            isAuthenticated: authenticated, 
            connectionError: error 
          },
          false,
          'setConnectionState'
        ),
      
      // Dados de mercado
      updateQuote: (quote) =>
        set(
          (state) => ({
            quotes: {
              ...state.quotes,
              [quote.symbol]: {
                ...state.quotes[quote.symbol],
                ...quote,
                changePercent: quote.change && state.quotes[quote.symbol]?.lastPrice
                  ? ((quote.lastPrice || 0) - (state.quotes[quote.symbol]?.lastPrice || 0)) / (state.quotes[quote.symbol]?.lastPrice || 1) * 100
                  : undefined
              }
            }
          }),
          false,
          'updateQuote'
        ),
      
      addTrade: (trade) =>
        set(
          (state) => {
            const symbolTrades = state.trades[trade.symbol] || [];
            const newTrades = [trade, ...symbolTrades].slice(0, 1000); // Manter apenas os últimos 1000
            
            return {
              trades: {
                ...state.trades,
                [trade.symbol]: newTrades
              }
            };
          },
          false,
          'addTrade'
        ),
      
      updateBook: (book) =>
        set(
          (state) => ({
            books: {
              ...state.books,
              [book.symbol]: book
            }
          }),
          false,
          'updateBook'
        ),
      
      // Sistema
      updateSystemStats: (stats) =>
        set({ systemStats: stats }, false, 'updateSystemStats'),
      
      addSystemMessage: (message, level) =>
        set(
          (state) => ({
            systemMessages: [
              {
                id: Date.now().toString(),
                message,
                level,
                timestamp: Date.now()
              },
              ...state.systemMessages.slice(0, 99) // Manter apenas as últimas 100
            ]
          }),
          false,
          'addSystemMessage'
        ),
      
      clearSystemMessages: () =>
        set({ systemMessages: [] }, false, 'clearSystemMessages'),
      
      // UI
      setSelectedSymbol: (symbol) =>
        set({ selectedSymbol: symbol }, false, 'setSelectedSymbol'),
      
      setActiveView: (view) =>
        set({ activeView: view }, false, 'setActiveView'),
      
      toggleSidebar: () =>
        set(
          (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
          false,
          'toggleSidebar'
        ),
      
      // Configurações
      updateSettings: (newSettings) =>
        set(
          (state) => ({
            settings: { ...state.settings, ...newSettings }
          }),
          false,
          'updateSettings'
        ),
      
      // Utilitários
      reset: () => set(initialState, false, 'reset')
    }),
    {
      name: 'smart-trade-store',
      partialize: (state: AppState & AppActions) => ({
        selectedSymbol: state.selectedSymbol,
        activeView: state.activeView,
        sidebarCollapsed: state.sidebarCollapsed,
        settings: state.settings
      })
    }
  )
);

// Seletores úteis
export const useQuote = (symbol: string) => 
  useAppStore((state) => state.quotes[symbol]);

export const useTrades = (symbol: string, limit = 100) => 
  useAppStore((state) => state.trades[symbol]?.slice(0, limit) || []);

export const useBook = (symbol: string) => 
  useAppStore((state) => state.books[symbol]);

export const useConnectionState = () =>
  useAppStore((state) => ({
    isConnected: state.isConnected,
    isAuthenticated: state.isAuthenticated,
    error: state.connectionError
  }));

export const useSystemInfo = () =>
  useAppStore((state) => ({
    stats: state.systemStats,
    messages: state.systemMessages
  }));

export const useUIState = () =>
  useAppStore((state) => ({
    selectedSymbol: state.selectedSymbol,
    activeView: state.activeView,
    sidebarCollapsed: state.sidebarCollapsed
  }));

export const useSettings = () =>
  useAppStore((state) => state.settings);
