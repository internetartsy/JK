import { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { setAuthToken } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Registry } from './components/Registry';
import { ReviewQueue } from './components/ReviewQueue';
import { MapView } from './components/MapView';
import { Settings } from './components/Settings';

import { SettingsProvider } from './context/SettingsContext';

function App() {
  const auth = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

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

  return (
    <SettingsProvider>
      <div className="flex h-screen bg-[#f3f4f6] dark:bg-secondary-900 overflow-hidden bg-[url('/bg-pattern.svg')] bg-fixed transition-colors">
        {/* Sidebar Navigation */}
        <Sidebar currentView={currentView} onChangeView={setCurrentView} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-secondary-50/50 dark:from-primary-900/20 dark:to-secondary-900/20 pointer-events-none" />

          <div className="relative z-10 container mx-auto max-w-7xl h-full p-4 lg:p-8">
            {currentView === 'dashboard' && <Dashboard />}

            {currentView === 'map' && (
              <div className="h-[calc(100vh-6rem)]">
                <MapView />
              </div>
            )}

            {currentView === 'review' && <ReviewQueue />}

            {currentView === 'registry' && <Registry />}

            {currentView === 'settings' && <Settings />}
          </div>
        </main>
      </div>
    </SettingsProvider>
  );
}

export default App;
