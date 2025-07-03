// 📱 Sidebar da aplicação - Smart-Trade (TEMA DARK)
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Settings,
  Home,
  Layers,
  Target
} from 'lucide-react';
import { useAppStore, useUIState } from '../../stores/useAppStore';
import { clsx } from 'clsx';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  view: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

function SidebarItem({ icon, label, isActive, isCollapsed, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200',
        'hover:bg-gray-800 group relative',
        isActive && 'bg-blue-600 hover:bg-blue-700 text-white',
        !isActive && 'text-gray-300 hover:text-white',
        isCollapsed ? 'justify-center' : 'justify-start space-x-3'
      )}
      title={isCollapsed ? label : undefined}
    >
      <div className={clsx(
        'flex-shrink-0 transition-colors',
        isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
      )}>
        {icon}
      </div>
      
      {!isCollapsed && (
        <span className="font-medium text-sm truncate">
          {label}
        </span>
      )}
      
      {/* Tooltip para modo collapsed */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </button>
  );
}

export function Sidebar() {
  const { setActiveView } = useAppStore();
  const { activeView, sidebarCollapsed } = useUIState();

  const menuItems = [
    {
      view: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />
    },
    {
      view: 'orderflow',
      label: 'Order Flow',
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      view: 'footprint',
      label: 'Footprint',
      icon: <Activity className="w-5 h-5" />
    },
    {
      view: 'charts',
      label: 'Gráficos',
      icon: <BarChart3 className="w-5 h-5" />
    },
    {
      view: 'volume',
      label: 'Volume Profile',
      icon: <Layers className="w-5 h-5" />
    },
    {
      view: 'scanner',
      label: 'Scanner',
      icon: <Target className="w-5 h-5" />
    }
  ];

  return (
    <aside className={clsx(
      'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-gray-900 border-r border-gray-700 transition-all duration-300 ease-in-out z-40',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      <div className="flex flex-col h-full">
        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.view}
              icon={item.icon}
              label={item.label}
              view={item.view}
              isActive={activeView === item.view}
              isCollapsed={sidebarCollapsed}
              onClick={() => setActiveView(item.view as any)}
            />
          ))}
        </nav>

        {/* Symbol Selector */}
        {!sidebarCollapsed && (
          <div className="px-3 py-4 border-t border-gray-700">
            <div className="mb-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Símbolo Ativo
              </label>
            </div>
            <select className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="DOL">DOL - Dólar Futuro</option>
              <option value="WIN">WIN - Mini Índice</option>
              <option value="WDO">WDO - Mini Dólar</option>
              <option value="IND">IND - Índice Bovespa</option>
            </select>
          </div>
        )}

        {/* Settings */}
        <div className="px-3 py-4 border-t border-gray-700">
          <SidebarItem
            icon={<Settings className="w-5 h-5" />}
            label="Configurações"
            view="settings"
            isActive={activeView === 'settings'}
            isCollapsed={sidebarCollapsed}
            onClick={() => setActiveView('settings')}
          />
        </div>

        {/* Status Indicator */}
        {!sidebarCollapsed && (
          <div className="px-3 py-2 border-t border-gray-700">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Sistema Ativo</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
