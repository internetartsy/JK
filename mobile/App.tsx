import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { store } from './src/store';

// Screens
import RoleSelectionScreen from './src/screens/auth/RoleSelectionScreen';
import OperatorDashboard from './src/screens/dashboard/OperatorDashboard';
import { CameraScreen } from './src/screens/landRecords/ScanDocumentScreen';
import OfflineSyncScreen from './src/screens/offline/OfflineSyncScreen';

const Stack = createStackNavigator();

function OperatorStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="OperatorDashboard" component={OperatorDashboard} options={{ title: 'Operator Home' }} />
      <Stack.Screen name="ScanDocument" component={MockCameraWrapper} options={{ headerShown: false }} />
      <Stack.Screen name="OfflineSync" component={OfflineSyncScreen} options={{ title: 'Sync Data' }} />
    </Stack.Navigator>
  );
}

// Wrapper to handle camera props navigation
function MockCameraWrapper({ navigation }: any) {
  return <CameraScreen onCapture={(path) => navigation.goBack()} onClose={() => navigation.goBack()} />;
}

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="RoleSelection" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <Stack.Screen name="OperatorTabs" component={OperatorStack} />
          {/* Add other role stacks here (Verifier, Tahsildar, etc.) */}
          <Stack.Screen name="VerifierTabs" component={OperatorStack} />
          <Stack.Screen name="TahsildarTabs" component={OperatorStack} />
          <Stack.Screen name="FieldTeamTabs" component={OperatorStack} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
