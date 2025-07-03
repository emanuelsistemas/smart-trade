// 📋 Header da aplicação - Smart-Trade (TEMA DARK)
import {
  Menu,
  Wifi,
  WifiOff,
  Settings,
  Bell,
  Sun,
  Moon
} from 'lucide-react';
import { useAppStore, useConnectionState, useSystemInfo } from '../../stores/useAppStore';
import { clsx } from 'clsx';

export function Header() {
  const { toggleSidebar, updateSettings, settings } = useAppStore();
  const { isConnected, isAuthenticated, error } = useConnectionState();
  const { stats, messages } = useSystemInfo();
  
  const unreadMessages = messages.filter(m => m.level === 'error' || m.level === 'warning').length;

  const toggleTheme = () => {
    updateSettings({ 
      theme: settings.theme === 'light' ? 'dark' : 'light' 
    });
  };

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 shadow-lg">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Menu Toggle */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">ST</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Smart-Trade
          </h1>
        </div>
      </div>

      {/* Center Section - Connection Status */}
      <div className="flex items-center space-x-4">
        <div className={clsx(
          'flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium',
          isConnected && isAuthenticated
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : isConnected
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        )}>
          {isConnected ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span>
            {isConnected && isAuthenticated
              ? 'Conectado'
              : isConnected
              ? 'Não Autenticado'
              : 'Desconectado'
            }
          </span>
        </div>

        {/* System Stats */}
        {stats && (
          <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
            <span>Clientes: {stats.authenticatedClients}/{stats.totalClients}</span>
            <span>Subscrições: {stats.totalSubscriptions}</span>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Notificações"
        >
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={`Mudar para tema ${settings.theme === 'light' ? 'escuro' : 'claro'}`}
        >
          {settings.theme === 'light' ? (
            <Moon className="w-5 h-5 text-gray-600" />
          ) : (
            <Sun className="w-5 h-5 text-gray-300" />
          )}
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Configurações"
        >
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* User Info */}
        <div className="flex items-center space-x-2 pl-2 border-l border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">T</span>
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Trader
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Online
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="absolute top-16 left-0 right-0 bg-red-500 text-white px-4 py-2 text-sm text-center">
          <span className="font-medium">Erro de Conexão:</span> {error}
        </div>
      )}
    </header>
  );
}
