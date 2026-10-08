import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList } from './src/navigation/types';
import { AuthProvider } from './src/auth/AuthContext';
import { PreferencesProvider } from './src/preferences/PreferencesContext';
import { NowPlayingProvider } from './src/playback/NowPlayingContext';
import FloatingMiniPlayer from './src/components/FloatingMiniPlayer';
import { navigationRef } from './src/navigation/navigationRef';
import HomeScreen from './src/screens/HomeScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import SyncStatusScreen from './src/screens/SyncStatusScreen';
import DownloadsLibraryScreen from './src/screens/DownloadsLibraryScreen';
import MenuScreen from './src/screens/MenuScreen';
import InfoScreen from './src/screens/InfoScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import ScreeningsScreen from './src/screens/ScreeningsScreen';
import ScreeningDetailScreen from './src/screens/ScreeningDetailScreen';
import AccessibilitySettingsScreen from './src/screens/AccessibilitySettingsScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.gold,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <NowPlayingProvider>
            <NavigationContainer ref={navigationRef} theme={navTheme}>
              <StatusBar style="light" />
              <Stack.Navigator
                initialRouteName="Home"
                screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
              >
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
                <Stack.Screen name="Player" component={PlayerScreen} />
                <Stack.Screen name="Sync" component={SyncStatusScreen} />
                <Stack.Screen name="Downloads" component={DownloadsLibraryScreen} />
                <Stack.Screen name="Menu" component={MenuScreen} />
                <Stack.Screen name="Info" component={InfoScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Favorites" component={FavoritesScreen} />
                <Stack.Screen name="Screenings" component={ScreeningsScreen} />
                <Stack.Screen name="ScreeningDetail" component={ScreeningDetailScreen} />
                <Stack.Screen name="AccessibilitySettings" component={AccessibilitySettingsScreen} />
              </Stack.Navigator>
            </NavigationContainer>
            <FloatingMiniPlayer />
          </NowPlayingProvider>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
