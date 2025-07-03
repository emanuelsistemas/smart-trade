// 💰 Card de cotação - Smart-Trade (TEMA DARK)
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { QuoteData } from '../../stores/useAppStore';
import { clsx } from 'clsx';

interface QuoteCardProps {
  symbol: string;
  quote?: QuoteData;
}

export function QuoteCard({ symbol, quote }: QuoteCardProps) {
  const change = quote?.change || 0;
  const changePercent = quote?.changePercent || 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{symbol}</h3>
          <p className="text-sm text-gray-400">Cotação em tempo real</p>
        </div>
        
        <div className={clsx(
          'flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium',
          isPositive && 'bg-green-900 text-green-200',
          isNegative && 'bg-red-900 text-red-200',
          !isPositive && !isNegative && 'bg-gray-700 text-gray-300'
        )}>
          {isPositive && <TrendingUp className="w-4 h-4" />}
          {isNegative && <TrendingDown className="w-4 h-4" />}
          {!isPositive && !isNegative && <Minus className="w-4 h-4" />}
          <span>
            {isPositive && '+'}
            {changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Main Price */}
      <div className="mb-6">
        <div className={clsx(
          'text-3xl font-bold mb-1',
          isPositive && 'text-green-400',
          isNegative && 'text-red-400',
          !isPositive && !isNegative && 'text-white'
        )}>
          {quote?.lastPrice?.toFixed(4) || '---'}
        </div>
        
        <div className={clsx(
          'text-sm font-medium',
          isPositive && 'text-green-400',
          isNegative && 'text-red-400',
          !isPositive && !isNegative && 'text-gray-400'
        )}>
          {isPositive && '+'}
          {change.toFixed(4)} pontos
        </div>
      </div>

      {/* Bid/Ask */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">COMPRA</div>
          <div className="text-lg font-bold text-green-400">
            {quote?.bidPrice?.toFixed(4) || '---'}
          </div>
        </div>
        
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">VENDA</div>
          <div className="text-lg font-bold text-red-400">
            {quote?.askPrice?.toFixed(4) || '---'}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Volume:</span>
          <span className="text-white font-medium">
            {quote?.volume?.toLocaleString() || '---'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Spread:</span>
          <span className="text-white font-medium">
            {quote?.askPrice && quote?.bidPrice 
              ? (quote.askPrice - quote.bidPrice).toFixed(4)
              : '---'
            }
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Última atualização:</span>
          <span className="text-white font-medium">
            {quote?.timestamp 
              ? new Date(quote.timestamp).toLocaleTimeString()
              : '---'
            }
          </span>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <div className={clsx(
            'w-2 h-2 rounded-full',
            quote ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          )}></div>
          <span className="text-xs text-gray-400">
            {quote ? 'Dados atualizados' : 'Aguardando dados'}
          </span>
        </div>
      </div>
    </div>
  );
}
