import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CatalogoScreen from './src/screens/CatalogoScreen';
import LibroDetalleScreen from './src/screens/LibroDetalleScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import MisPrestamosScreen from './src/screens/MisPrestamosScreen';
import NotificacionesScreen from './src/screens/NotificacionesScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';
import AppIcon from './src/components/AppIcon';
import TopBar from './src/components/TopBar';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Home:     { inactive: 'homeInactive',    label: 'Inicio' },
  Catalogo: { inactive: 'catalogInactive', label: 'Catálogo' },
  Soporte:  { inactive: 'support',         label: 'Soporte' },
  Perfil:   { inactive: 'profileInactive', label: 'Perfil' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        header: () => <TopBar />,
        tabBarIcon: ({ focused }) => {
          const cfg = TAB_CONFIG[route.name];
          return (
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: focused ? colors.primary : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <AppIcon
                name={cfg.inactive}
                size={24}
                tintColor={focused ? colors.black : colors.gray600}
              />
            </View>
          );
        },
        tabBarLabel: TAB_CONFIG[route.name]?.label,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.gray600,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.gray200,
          backgroundColor: colors.white,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Catalogo" component={CatalogoScreen} />
      <Tab.Screen
        name="Soporte"
        component={ChatbotScreen}
      />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="LibroDetalle"
            component={LibroDetalleScreen}
            options={({ navigation }) => ({
              headerShown: true,
              animation: 'slide_from_right',
              header: () => <TopBar showBack onBack={() => navigation.goBack()} />,
            })}
          />
          <Stack.Screen
            name="MisPrestamos"
            component={MisPrestamosScreen}
            options={({ navigation }) => ({
              headerShown: true,
              animation: 'slide_from_right',
              header: () => <TopBar showBack onBack={() => navigation.goBack()} />,
            })}
          />
          <Stack.Screen
            name="Notificaciones"
            component={NotificacionesScreen}
            options={({ navigation }) => ({
              headerShown: true,
              animation: 'slide_from_right',
              header: () => <TopBar showBack onBack={() => navigation.goBack()} />,
            })}
          />
          <Stack.Screen
            name="Chatbot"
            component={ChatbotScreen}
            options={({ navigation }) => ({
              headerShown: true,
              animation: 'slide_from_right',
              header: () => <TopBar showBack onBack={() => navigation.goBack()} />,
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}