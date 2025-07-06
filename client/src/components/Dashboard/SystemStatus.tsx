// 🔧 Status do sistema - Smart-Trade (TEMA DARK)
import {
  Server,
  // Users, // REMOVIDO - Não usado para plataforma pessoal
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { SystemStats } from '../../stores/useAppStore';
import { clsx } from 'clsx';

interface SystemStatusProps {
  stats: SystemStats | null;
  messages: Array<{
    id: string;
    message: string;
    level: 'info' | 'warning' | 'error';
    timestamp: number;
  }>;
}

export function SystemStatus({ stats, messages }: SystemStatusProps) {
  const recentMessages = messages.slice(0, 3);
  const errorCount = messages.filter(m => m.level === 'error').length;
  const warningCount = messages.filter(m => m.level === 'warning').length;

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Server className="w-5 h-5" />
          <span>Status do Sistema</span>
        </h3>
        
        <div className={clsx(
          'flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium',
          stats?.connected 
            ? 'bg-green-900 text-green-200 border border-green-700'
            : 'bg-red-900 text-red-200 border border-red-700'
        )}>
          {stats?.connected ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span>{stats?.connected ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Clients - OCULTO PARA USO PESSOAL */}
        {/*
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Clientes</span>
          </div>
          <div className="text-xl font-bold text-white">
            {stats?.authenticatedClients || 0}
            <span className="text-sm text-gray-400 font-normal">
              /{stats?.totalClients || 0}
            </span>
          </div>
          <p className="text-xs text-gray-500">Autenticados/Total</p>
        </div>
        */}

        {/* Subscriptions */}
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-gray-300">Subscrições</span>
          </div>
          <div className="text-xl font-bold text-white">
            {stats?.totalSubscriptions || 0}
          </div>
          <p className="text-xs text-gray-500">Canais ativos</p>
        </div>

        {/* Uptime */}
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">Uptime</span>
          </div>
          <div className="text-xl font-bold text-white">
            {stats?.uptime ? formatUptime(stats.uptime) : '---'}
          </div>
          <p className="text-xs text-gray-500">Tempo online</p>
        </div>

        {/* Alerts */}
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-gray-300">Alertas</span>
          </div>
          <div className="text-xl font-bold text-white">
            {errorCount + warningCount}
          </div>
          <p className="text-xs text-gray-500">
            {errorCount} erros, {warningCount} avisos
          </p>
        </div>
      </div>

      {/* Recent Messages */}
      {recentMessages.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Mensagens Recentes</h4>
          <div className="space-y-2">
            {recentMessages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  'flex items-start space-x-2 p-2 rounded text-sm',
                  message.level === 'error' && 'bg-red-900/20 border border-red-800',
                  message.level === 'warning' && 'bg-yellow-900/20 border border-yellow-800',
                  message.level === 'info' && 'bg-blue-900/20 border border-blue-800'
                )}
              >
                <div className={clsx(
                  'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                  message.level === 'error' && 'bg-red-400',
                  message.level === 'warning' && 'bg-yellow-400',
                  message.level === 'info' && 'bg-blue-400'
                )}></div>
                
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    'font-medium',
                    message.level === 'error' && 'text-red-200',
                    message.level === 'warning' && 'text-yellow-200',
                    message.level === 'info' && 'text-blue-200'
                  )}>
                    {message.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
