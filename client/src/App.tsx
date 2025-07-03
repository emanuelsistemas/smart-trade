// 🚀 App principal - Smart-Trade (TEMA DARK)
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { useSmartTradeWebSocket } from './hooks/useSmartTradeWebSocket';
import { useAppStore } from './stores/useAppStore';

function App() {
  // Inicializar WebSocket
  useSmartTradeWebSocket();

  const { activeView } = useAppStore();

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'orderflow':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-4">Order Flow</h1>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-400">Análise de Order Flow em desenvolvimento...</p>
            </div>
          </div>
        );
      case 'footprint':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-4">Footprint</h1>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-400">Gráfico Footprint em desenvolvimento...</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-4">Configurações</h1>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-400">Painel de configurações em desenvolvimento...</p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="App bg-gray-900 min-h-screen">
      <Layout>
        {renderView()}
      </Layout>
    </div>
  );
}

export default App;
