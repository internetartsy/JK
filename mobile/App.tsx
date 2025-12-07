import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { initDatabase, getDB } from './src/services/Database';
import { SyncService } from './src/services/SyncService';
import { backgroundSyncService } from './src/services/BackgroundSyncService';
import MapScreen from './src/screens/MapScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import CameraScreen from './src/screens/CameraScreen';
import LoginScreen from './src/screens/LoginScreen';
import { AuthService } from './src/services/AuthService';
import { Provider as PaperProvider } from 'react-native-paper';
import { GlassBackground, GlassCard, GlassHeader, GlassButton, GlassBadge, MonochromeTheme } from './src/components/GlassUI';

const { width } = Dimensions.get('window');

export default function App() {
  return (
    <PaperProvider>
      <AppContent />
    </PaperProvider>
  );
}

function AppContent() {
  const [status, setStatus] = useState<string>('Ready');
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'authenticated'>('loading');
  const [localParcels, setLocalParcels] = useState<any[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const loggedIn = await AuthService.isLoggedIn();
      if (loggedIn) {
        setAuthStatus('authenticated');
        setup();
      } else {
        setAuthStatus('unauthenticated');
      }
    } catch (e) {
      console.error('Auth check failed', e);
      setAuthStatus('unauthenticated');
    }
  };

  const handleLoginSuccess = () => {
    setAuthStatus('authenticated');
    setup();
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setAuthStatus('unauthenticated');
    setLocalParcels([]);
  };

  const setup = async () => {
    try {
      initDatabase();
      setStatus('Ready');
      await loadLocalData();
      backgroundSyncService.start();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const loadLocalData = async () => {
    const db = getDB();
    const parcels = await db.getAllAsync('SELECT * FROM parcels');
    setLocalParcels(parcels);
  };

  const handleSync = async () => {
    setStatus('Syncing...');
    try {
      await SyncService.sync();
      setStatus('Synced ✓');
      await loadLocalData();
    } catch (e: any) {
      setStatus(`Sync failed`);
    }
  };

  // Loading State
  if (authStatus === 'loading') {
    return (
      <GlassBackground dark={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MonochromeTheme.colors.white} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </GlassBackground>
    );
  }

  // Login Screen
  if (authStatus === 'unauthenticated') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Map View
  if (showMap) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title="Map"
          dark={true}
          leftAction={
            <TouchableOpacity onPress={() => setShowMap(false)}>
              <Text style={styles.headerAction}>←</Text>
            </TouchableOpacity>
          }
        />
        <MapScreen />
        <StatusBar style="light" />
      </View>
    );
  }

  // Camera View
  if (showCamera) {
    return (
      <View style={{ flex: 1 }}>
        <CameraScreen
          onCapture={(path) => {
            setCapturedImage(path);
            setShowCamera(false);
          }}
          onCancel={() => setShowCamera(false)}
        />
        <StatusBar style="auto" />
      </View>
    );
  }

  // Capture Screen
  if (showCapture) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title="Add Parcel"
          dark={true}
          leftAction={
            <TouchableOpacity onPress={() => setShowCapture(false)}>
              <Text style={styles.headerAction}>←</Text>
            </TouchableOpacity>
          }
        />
        <CaptureScreen
          onSave={() => {
            setShowCapture(false);
            setCapturedImage(undefined);
            loadLocalData();
          }}
          onScan={() => setShowCamera(true)}
          imagePath={capturedImage}
        />
        <StatusBar style="light" />
      </View>
    );
  }

  // Main Dashboard
  return (
    <GlassBackground dark={true}>
      <View style={styles.container}>
        <GlassHeader
          title="Land Records"
          subtitle={status}
          dark={true}
          rightActions={[
            <TouchableOpacity onPress={handleSync} key="sync">
              <View style={styles.iconButton}>
                <Text style={styles.iconText}>↻</Text>
              </View>
            </TouchableOpacity>,
            <TouchableOpacity onPress={handleLogout} key="logout">
              <View style={styles.iconButton}>
                <Text style={styles.iconText}>⏻</Text>
              </View>
            </TouchableOpacity>,
          ]}
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Actions */}
          <View style={styles.actionsGrid}>
            <ActionCard
              title="Map"
              onPress={() => setShowMap(true)}
            />
            <ActionCard
              title="Add Parcel"
              onPress={() => setShowCapture(true)}
            />
            <ActionCard
              title="Camera"
              onPress={() => setShowCamera(true)}
            />
          </View>

          {/* Parcels Section */}
          <View style={styles.parcelsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Parcels</Text>
              <GlassBadge label={`${localParcels.length}`} variant="light" />
            </View>

            {localParcels.length === 0 ? (
              <GlassCard dark={true} style={styles.emptyCard}>
                <Text style={styles.emptyText}>No parcels yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap "Add Parcel" to create your first record
                </Text>
              </GlassCard>
            ) : (
              <View style={styles.parcelsList}>
                {localParcels.map((p, i) => (
                  <GlassCard
                    key={i}
                    dark={true}
                    style={styles.parcelCard}
                    onPress={() => console.log('View:', p.id)}
                  >
                    <View style={styles.parcelHeader}>
                      <Text style={styles.parcelTitle}>{p.khasra_number}</Text>
                      <GlassBadge
                        label={p.sync_status}
                        variant={p.sync_status === 'synced' ? 'light' : 'dark'}
                      />
                    </View>
                    <View style={styles.parcelDetails}>
                      <Text style={styles.parcelDetailLabel}>Village</Text>
                      <Text style={styles.parcelDetailValue}>{p.village_id}</Text>
                    </View>
                    <View style={styles.parcelDetails}>
                      <Text style={styles.parcelDetailLabel}>Status</Text>
                      <Text style={styles.parcelDetailValue}>{p.status}</Text>
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <StatusBar style="light" />
      </View>
    </GlassBackground>
  );
}

// Action Card Component
function ActionCard({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.actionCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    color: MonochromeTheme.colors.gray[500],
  },

  // Container
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: MonochromeTheme.spacing.md,
  },

  // Header Actions
  headerAction: {
    color: MonochromeTheme.colors.white,
    fontSize: 24,
    fontWeight: '300',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MonochromeTheme.colors.glassBlack.light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MonochromeTheme.colors.gray[800],
  },
  iconText: {
    fontSize: 18,
    color: MonochromeTheme.colors.white,
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    gap: MonochromeTheme.spacing.md,
    marginBottom: MonochromeTheme.spacing.xl,
  },
  actionCard: {
    flex: 1,
    height: 100,
    borderRadius: MonochromeTheme.borderRadius.md,
    backgroundColor: MonochromeTheme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...MonochromeTheme.shadows.md,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: MonochromeTheme.colors.black,
    letterSpacing: 0.3,
  },

  // Parcels Section
  parcelsSection: {
    marginBottom: MonochromeTheme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: MonochromeTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: MonochromeTheme.colors.white,
  },

  // Empty State
  emptyCard: {
    padding: MonochromeTheme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: MonochromeTheme.colors.white,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: MonochromeTheme.colors.gray[500],
    textAlign: 'center',
  },

  // Parcels List
  parcelsList: {
    gap: MonochromeTheme.spacing.md,
  },
  parcelCard: {
    padding: MonochromeTheme.spacing.md,
  },
  parcelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: MonochromeTheme.spacing.sm,
  },
  parcelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: MonochromeTheme.colors.white,
  },
  parcelDetails: {
    marginTop: 8,
  },
  parcelDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MonochromeTheme.colors.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  parcelDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: MonochromeTheme.colors.gray[300],
  },
});
