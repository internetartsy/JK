import { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { setAuthToken } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Registry } from './components/Registry';
import { ReviewQueue } from './components/ReviewQueue';
import { MapView } from './components/MapView';
import { Settings } from './components/Settings';
import { LandingPage } from './components/LandingPage';
import { DataCleaning } from './components/DataCleaning';
import { Menu } from 'lucide-react';

import { SettingsProvider } from './context/SettingsContext';

function App() {
  const auth = useAuth();
  const queryParams = new URLSearchParams(window.location.search);
  const initialView = queryParams.get('view') || 'dashboard';
  console.log('[App] Initializing. Params:', Object.fromEntries(queryParams), 'InitialView:', initialView);
  const [currentView, setCurrentView] = useState(initialView);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // DEBUG: Bypass auth if ?debug=true
  const isDebug = new URLSearchParams(window.location.search).get('debug') === 'true';
  const isAuthenticated = auth.isAuthenticated || isDebug;

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.access_token) {
      setAuthToken(auth.user.access_token);
    } else {
      setAuthToken(null);
    }
  }, [auth.isAuthenticated, auth.user]);

  if (auth.isLoading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <SettingsProvider>
      <div className="flex h-screen bg-[#f3f4f6] dark:bg-secondary-900 overflow-hidden bg-[url('/bg-pattern.svg')] bg-fixed transition-colors">
        {/* Sidebar Navigation */}
        <Sidebar
          currentView={currentView}
          onChangeView={setCurrentView}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-secondary-50/50 dark:from-primary-900/20 dark:to-secondary-900/20 pointer-events-none" />

          {/* Mobile Header */}
          <div className="lg:hidden p-4 flex items-center gap-3 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-md border-b border-secondary-200 dark:border-secondary-800 z-10">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-600 dark:text-secondary-300"
            >
              <Menu size={24} />
            </button>
            <span className="font-bold text-lg text-secondary-900 dark:text-white">AgriStack</span>
            {/* Added Map View button for debug/quick access */}
            {isDebug && (
              <button onClick={() => window.location.href = '/?debug=true&view=map'} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Map View</button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 lg:p-8 relative z-10 container mx-auto max-w-7xl">
            {currentView === 'dashboard' && <Dashboard />}

            {currentView === 'map' && (
              <div className="h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)]">
                <MapView />
              </div>
            )}

            {currentView === 'review' && <ReviewQueue />}

            {currentView === 'registry' && <Registry />}

            {currentView === 'data-cleaning' && <DataCleaning />}

            {currentView === 'settings' && <Settings />}
          </div>
        </main>
      </div>
    </SettingsProvider>
  );
}

export default App;
