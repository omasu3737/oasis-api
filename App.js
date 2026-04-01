import { useEffect, useState } from 'react';
import { StatusBar, Text, UIManager, View, Platform } from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { getSession, onAuthStateChange } from './src/services/auth';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { I18nProvider } from './src/i18n';

function AppContent() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { colors: C, isDark } = useTheme();

  useEffect(() => {
    getSession().then(s => {
      setSession(s);
      setLoading(false);
    });
    const subscription = onAuthStateChange(setSession);
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <Text style={{ fontSize: 36, fontWeight: '500', color: C.t1, letterSpacing: -0.5 }}>OASIS</Text>
      </View>
    );
  }

  if (!session) return <LoginScreen />;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </ThemeProvider>
  );
}
