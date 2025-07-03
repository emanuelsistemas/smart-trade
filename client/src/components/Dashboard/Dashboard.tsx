// 📊 Dashboard principal - Smart-Trade (TEMA DARK)
import { QuoteCard } from './QuoteCard';
import { TradesList } from './TradesList';
import { SystemStatus } from './SystemStatus';
import { useAppStore, useQuote, useTrades, useSystemInfo } from '../../stores/useAppStore';

export function Dashboard() {
  const { selectedSymbol } = useAppStore();
  const quote = useQuote(selectedSymbol);
  const trades = useTrades(selectedSymbol, 20);
  const { stats, messages } = useSystemInfo();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Visão geral do mercado em tempo real
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Dados em tempo real</span>
        </div>
      </div>

      {/* System Status */}
      <SystemStatus stats={stats} messages={messages} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quote Card */}
        <div className="lg:col-span-1">
          <QuoteCard symbol={selectedSymbol} quote={quote} />
        </div>

        {/* Trades List */}
        <div className="lg:col-span-2">
          <TradesList symbol={selectedSymbol} trades={trades} />
        </div>
      </div>

      {/* Additional Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Volume Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Volume</h3>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <div className="text-2xl font-bold text-white">
            {quote?.volume?.toLocaleString() || '---'}
          </div>
          <p className="text-xs text-gray-400 mt-1">Contratos negociados</p>
        </div>

        {/* Variation Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Variação</h3>
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          </div>
          <div className={`text-2xl font-bold ${
            (quote?.change || 0) >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {quote?.change ? (quote.change >= 0 ? '+' : '') + quote.change.toFixed(4) : '---'}
          </div>
          <p className="text-xs text-gray-400 mt-1">Pontos</p>
        </div>

        {/* Trades Count */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Negócios</h3>
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          </div>
          <div className="text-2xl font-bold text-white">
            {trades.length}
          </div>
          <p className="text-xs text-gray-400 mt-1">Últimos 20</p>
        </div>

        {/* Spread Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Spread</h3>
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          </div>
          <div className="text-2xl font-bold text-white">
            {quote?.askPrice && quote?.bidPrice 
              ? (quote.askPrice - quote.bidPrice).toFixed(4)
              : '---'
            }
          </div>
          <p className="text-xs text-gray-400 mt-1">Bid/Ask</p>
        </div>
      </div>

      {/* Market Info */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Informações do Mercado</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Preços</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Último:</span>
                <span className="text-white font-medium">
                  {quote?.lastPrice?.toFixed(4) || '---'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Compra:</span>
                <span className="text-green-400 font-medium">
                  {quote?.bidPrice?.toFixed(4) || '---'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Venda:</span>
                <span className="text-red-400 font-medium">
                  {quote?.askPrice?.toFixed(4) || '---'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Estatísticas</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Volume:</span>
                <span className="text-white font-medium">
                  {quote?.volume?.toLocaleString() || '---'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Negócios:</span>
                <span className="text-white font-medium">
                  {trades.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Símbolo:</span>
                <span className="text-blue-400 font-medium">
                  {selectedSymbol}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Sistema</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Clientes:</span>
                <span className="text-white font-medium">
                  {stats?.authenticatedClients || 0}/{stats?.totalClients || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Subscrições:</span>
                <span className="text-white font-medium">
                  {stats?.totalSubscriptions || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400 font-medium">
                  {stats?.connected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
