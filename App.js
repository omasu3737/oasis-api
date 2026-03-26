import { useEffect, useState } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { getSession, onAuthStateChange } from './src/services/auth';
import { C } from './src/theme';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
