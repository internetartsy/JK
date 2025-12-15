import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { store } from './src/store';

// Screens
import RoleSelectionScreen from './src/screens/auth/RoleSelectionScreen';
import OperatorDashboard from './src/screens/dashboard/OperatorDashboard';
import OCRProcessingScreen from './src/screens/landRecords/OCRProcessingScreen';
import OfflineSyncScreen from './src/screens/offline/OfflineSyncScreen';

// Farmer Screens
import FarmerLogin from './src/screens/farmer/FarmerLogin';
import FarmerSignup from './src/screens/farmer/FarmerSignup';
import FarmerDashboard from './src/screens/farmer/FarmerDashboard';

const Stack = createStackNavigator();

function OperatorStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="OperatorDashboard" component={OperatorDashboard} options={{ title: 'Operator Home' }} />
      <Stack.Screen name="ScanDocument" component={OCRProcessingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OfflineSync" component={OfflineSyncScreen} options={{ title: 'Sync Data' }} />
    </Stack.Navigator>
  );
}

function FarmerStack() {
  return (
    <Stack.Navigator initialRouteName="FarmerLogin">
      <Stack.Screen name="FarmerLogin" component={FarmerLogin} options={{ headerShown: false }} />
      <Stack.Screen name="FarmerSignup" component={FarmerSignup} options={{ title: 'Register' }} />
      <Stack.Screen name="FarmerDashboard" component={FarmerDashboard} options={{ title: 'Farmer Home', headerLeft: () => null }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="RoleSelection" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <Stack.Screen name="OperatorTabs" component={OperatorStack} />
          <Stack.Screen name="FarmerPortal" component={FarmerStack} />
          {/* Add other role stacks here (Verifier, Tahsildar, etc.) */}
          <Stack.Screen name="VerifierTabs" component={OperatorStack} />
          <Stack.Screen name="TahsildarTabs" component={OperatorStack} />
          <Stack.Screen name="FieldTeamTabs" component={OperatorStack} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
