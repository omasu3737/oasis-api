import { useEffect, useState } from 'react';
import { StatusBar, Text, UIManager, View, Platform } from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import DiagnosticScreen from './src/screens/DiagnosticScreen';
import LoginScreen from './src/screens/LoginScreen';
import { getSession, onAuthStateChange } from './src/services/auth';
import { hasDiagnosticResult } from './src/services/persona';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { I18nProvider } from './src/i18n';

function AppContent() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasDiagnostic, setHasDiagnostic] = useState(false);
  const { colors: C, isDark } = useTheme();

  useEffect(() => {
    async function init() {
      const s = await getSession();
      setSession(s);
      if (s?.user) {
        const has = await hasDiagnosticResult(s.user.id);
        setHasDiagnostic(has);
      }
      setLoading(false);
    }
    init();

    const subscription = onAuthStateChange(async (s) => {
      setSession(s);
      if (s?.user) {
        const has = await hasDiagnosticResult(s.user.id);
        setHasDiagnostic(has);
      } else {
        setHasDiagnostic(false);
      }
    });
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

  if (!hasDiagnostic) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
        <DiagnosticScreen onComplete={() => setHasDiagnostic(true)} />
      </SafeAreaProvider>
    );
  }

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
