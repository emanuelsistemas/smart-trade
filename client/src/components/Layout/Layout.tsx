// 🏗️ Layout principal - Smart-Trade (TEMA DARK)
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAppStore } from '../../stores/useAppStore';
import { clsx } from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <Header />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className={clsx(
          'flex-1 transition-all duration-300 ease-in-out',
          'bg-gray-800',
          'border-l border-gray-700',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}>
          <div className="h-full overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
