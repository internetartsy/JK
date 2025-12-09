import { useState, useCallback, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { setAuthToken, parcelApi, reviewApi } from './api/client';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MapViewer from './components/MapViewer';
import ReviewQueue from './components/ReviewQueue';
import Dashboard from './components/Dashboard';
import AppShell from './layouts/AppShell';
import { CameraCapture } from './features/capture/CameraCapture';
import type { CapturedImage } from './features/capture/CameraCapture';
import { QueueManager } from './features/queue/QueueManager';
import { useQueue } from './features/queue/hooks/useQueue';

const queryClient = new QueryClient();

// Types
interface ReviewTask {
  id: string;
  document_id: string;
  document_type: string;
  confidence_score: number;
  extracted_fields: Record<string, string | number>;
  status: 'Pending' | 'Approved' | 'Rejected';
}

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTask, setSelectedTask] = useState<ReviewTask | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const queryClient = useQueryClient();
  const { addCapture } = useQueue();

  const auth = useAuth();

  // Sync token with API client
  useEffect(() => {
    setAuthToken(auth.user?.access_token || null);
  }, [auth.user]);

  // Fetch Stats
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      // In a real app, we'd have a dedicated stats endpoint. 
      // For now, we'll derive some stats from the parcels and reviews.
      const parcels = await parcelApi.getAll();
      const reviews = await reviewApi.getPending();
      return {
        totalParcels: parcels.length,
        activeParcels: parcels.filter((p: any) => p.status === 'active').length,
        disputedParcels: parcels.filter((p: any) => p.status === 'disputed').length,
        totalFarmers: new Set(parcels.map((p: any) => p.owner_id)).size,
        pendingReviews: reviews.length,
        ocrAccuracy: 89, // Mock for now
      };
    },
    initialData: {
      totalParcels: 0,
      activeParcels: 0,
      disputedParcels: 0,
      totalFarmers: 0,
      pendingReviews: 0,
      ocrAccuracy: 0,
    },
    enabled: !!auth.user?.access_token
  });

  // Fetch Reviews
  const { data: tasks = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const reviews = await reviewApi.getPending();
      // Transform backend data to frontend ReviewTask type if needed
      return reviews.map((r: any) => ({
        id: r.id,
        document_id: r.document_id || `DOC-${r.id.substring(0, 8)}`,
        document_type: r.document_type || 'Unknown',
        confidence_score: r.confidence_score || 0,
        extracted_fields: r.extracted_fields || {},
        status: r.status || 'Pending',
      }));
    },
    enabled: !!auth.user?.access_token
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => reviewApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setSelectedTask(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => reviewApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setSelectedTask(null);
    }
  });

  // Handle captured image
  const handleCapture = useCallback(async (image: CapturedImage) => {
    try {
      await addCapture({
        imageBlob: image.blob,
        previewUrl: image.preview,
        documentType: 'khasra',
        qualityScore: image.qualityScore,
        issues: image.issues,
        location: image.location ? {
          latitude: image.location.coords.latitude,
          longitude: image.location.coords.longitude,
          accuracy: image.location.coords.accuracy,
        } : undefined,
      });
      setShowCamera(false);
      setCurrentView('queue');
    } catch (error) {
      console.error('Failed to save capture:', error);
    }
  }, [addCapture]);

  // Handle view changes - show camera modal for capture
  const handleViewChange = (view: string) => {
    if (view === 'capture') {
      setShowCamera(true);
    } else {
      setCurrentView(view);
    }
  };

  // Loading State
  if (auth.isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading authentication...</div>;
  }

  // Unauthenticated State
  if (!auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Sign in to OptionList</h2>
            <p className="mt-2 text-sm text-gray-600">Land Records OCR Management System</p>
          </div>
          <button
            onClick={() => auth.signinRedirect()}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Sign in with SSO
          </button>
        </div>
      </div>
    );
  }

  // Camera modal
  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onCancel={() => setShowCamera(false)}
        documentType="khasra"
        enableGeolocation={true}
      />
    );
  }

  return (
    <AppShell currentView={currentView} onViewChange={handleViewChange}>
      {currentView === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Hello, {auth.user?.profile.preferred_username}</span>
              <button
                onClick={() => auth.removeUser()}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Sign Out
              </button>
            </div>
            <button
              onClick={() => {
                const id = `F-${Date.now()}`;
                alert(`Triggering agristack.farmers.create for ${id}`);
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-md shadow-sm font-medium hover:bg-primary-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Create Farmer ID
            </button>
          </div>
          <Dashboard stats={stats} />
        </div>
      )}

      {currentView === 'queue' && (
        <div className="h-[calc(100vh-8rem)]">
          <QueueManager
            onViewItem={(item) => {
              console.log('View item:', item);
              // TODO: Open item detail view
            }}
          />
        </div>
      )}

      {currentView === 'map' && (
        <div className="h-[calc(100vh-8rem)] rounded-xl overflow-hidden border border-secondary-200 shadow-sm">
          <MapViewer
            onParcelClick={(id) => console.log('Parcel clicked:', id)}
          />
        </div>
      )}

      {currentView === 'review' && (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
          <div className="w-96 flex-shrink-0">
            <ReviewQueue
              tasks={tasks as ReviewTask[]}
              onApprove={(id) => approveMutation.mutate(id)}
              onReject={(id) => rejectMutation.mutate(id)}
              onSelect={setSelectedTask}
            />
          </div>
          <div className="flex-1 bg-white rounded-xl border border-secondary-200 shadow-sm p-6 overflow-auto">
            {selectedTask ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-secondary-100 pb-4">
                  <h2 className="text-xl font-semibold text-secondary-900">Document Details</h2>
                  <span className="inline-flex items-center rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-800">
                    {selectedTask.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-secondary-50 p-4">
                    <label className="block text-xs font-medium text-secondary-500">Document ID</label>
                    <span className="mt-1 block text-sm font-semibold text-secondary-900">{selectedTask.document_id}</span>
                  </div>
                  <div className="rounded-lg bg-secondary-50 p-4">
                    <label className="block text-xs font-medium text-secondary-500">Type</label>
                    <span className="mt-1 block text-sm font-semibold text-secondary-900">{selectedTask.document_type}</span>
                  </div>
                  <div className="rounded-lg bg-secondary-50 p-4">
                    <label className="block text-xs font-medium text-secondary-500">Confidence</label>
                    <span className="mt-1 block text-sm font-semibold text-secondary-900">{Math.round(selectedTask.confidence_score * 100)}%</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-secondary-500 mb-3">Extracted Fields</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedTask.extracted_fields).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-4">
                        <span className="w-32 text-sm text-secondary-600">{key}</span>
                        <input
                          type="text"
                          defaultValue={String(value)}
                          className="flex-1 rounded-md border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-secondary-400">
                <span className="text-4xl mb-2">📄</span>
                <p>Select a document to review</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
