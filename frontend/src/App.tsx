import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MapView } from './components/MapView';

function App() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full bg-white relative">
        <Header title="Map View" />
        <main className="flex-1 flex flex-col min-h-0 bg-slate-50 relative">
          <MapView />
        </main>
      </div>
    </div>
  );
}

export default App;
