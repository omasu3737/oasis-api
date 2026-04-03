import { useEffect, useState } from 'react';
import { StatusBar, Text, UIManager, View, Platform } from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import DiagnosticScreen from './src/screens/DiagnosticScreen';
import { getSession, onAuthStateChange } from './src/services/auth';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { I18nProvider } from './src/i18n';
import { supabase } from './src/supabase';

async function checkHasDiagnostic(userId) {
  const { data } = await supabase
    .from('diagnostic_results')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

function AppContent() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // null = 確認中, true = 完了済み, false = 未完了
  const [hasDiagnostic, setHasDiagnostic] = useState(null);
  const { colors: C } = useTheme();

  useEffect(() => {
    getSession().then(s => {
      setSession(s);
      setLoading(false);
    });
    const subscription = onAuthStateChange(setSession);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setHasDiagnostic(null); return; }
    checkHasDiagnostic(session.user.id).then(setHasDiagnostic);
  }, [session]);

  const isChecking = session && hasDiagnostic === null;

  if (loading || isChecking) {
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
