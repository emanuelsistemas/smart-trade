// 📋 Lista de negócios - Smart-Trade (TEMA DARK)
import { ArrowUp, ArrowDown } from 'lucide-react';
import { TradeData } from '../../stores/useAppStore';
import { clsx } from 'clsx';
import { format } from 'date-fns';

interface TradesListProps {
  symbol: string;
  trades: TradeData[];
}

export function TradesList({ symbol, trades }: TradesListProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Negócios - {symbol}</h3>
            <p className="text-sm text-gray-400">Últimas transações em tempo real</p>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>{trades.length} negócios</span>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div className="grid grid-cols-5 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wide">
          <div>Horário</div>
          <div>Preço</div>
          <div>Volume</div>
          <div>Lado</div>
          <div>ID</div>
        </div>
      </div>

      {/* Trades List */}
      <div className="max-h-96 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500 mb-2">
              <ArrowUp className="w-8 h-8 mx-auto opacity-50" />
            </div>
            <p className="text-gray-400">Aguardando negócios...</p>
            <p className="text-sm text-gray-500 mt-1">
              Os negócios aparecerão aqui em tempo real
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {trades.map((trade, index) => (
              <div
                key={`${trade.tradeId}-${index}`}
                className={clsx(
                  'px-4 py-3 hover:bg-gray-750 transition-colors',
                  index === 0 && 'bg-gray-750' // Destacar o mais recente
                )}
              >
                <div className="grid grid-cols-5 gap-4 items-center">
                  {/* Horário */}
                  <div className="text-sm text-gray-300">
                    {format(new Date(trade.timestamp), 'HH:mm:ss')}
                  </div>

                  {/* Preço */}
                  <div className={clsx(
                    'text-sm font-bold',
                    trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'
                  )}>
                    {trade.price.toFixed(4)}
                  </div>

                  {/* Volume */}
                  <div className="text-sm text-white font-medium">
                    {trade.volume.toLocaleString()}
                  </div>

                  {/* Lado */}
                  <div className="flex items-center space-x-1">
                    {trade.side === 'BUY' ? (
                      <>
                        <ArrowUp className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-medium text-green-400">COMPRA</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-medium text-red-400">VENDA</span>
                      </>
                    )}
                  </div>

                  {/* ID */}
                  <div className="text-xs text-gray-500 font-mono">
                    {trade.tradeId.substring(0, 8)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {trades.length > 0 && (
        <div className="px-4 py-2 bg-gray-900 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Mostrando {trades.length} negócios mais recentes
            </span>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <ArrowUp className="w-3 h-3 text-green-400" />
                <span>Compras: {trades.filter(t => t.side === 'BUY').length}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <ArrowDown className="w-3 h-3 text-red-400" />
                <span>Vendas: {trades.filter(t => t.side === 'SELL').length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
