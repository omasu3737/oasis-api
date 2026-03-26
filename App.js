import { useEffect, useState } from 'react';
import { BackHandler, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import AIChatScreen from './src/screens/AIChatScreen';
import LoginScreen from './src/screens/LoginScreen';
import { getSession, onAuthStateChange } from './src/services/auth';
import { C } from './src/theme';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    getSession().then(s => {
      setSession(s);
      setLoading(false);
    });
    const subscription = onAuthStateChange(setSession);
    return () => subscription.unsubscribe();
  }, []);

  // Android物理バックボタン対応
  useEffect(() => {
    if (!showAIChat) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowAIChat(false);
      return true;
    });
    return () => backHandler.remove();
  }, [showAIChat]);

  // 読み込み中
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <Text style={{ fontSize: 36, fontWeight: '500', color: C.t1, letterSpacing: -0.5 }}>OASIS</Text>
      </View>
    );
  }

  // 未ログイン
  if (!session) return <LoginScreen />;

  // AIチャット画面
  if (showAIChat) return <AIChatScreen onBack={() => setShowAIChat(false)} />;

  // メイン画面（タブナビゲーション）
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <AppNavigator onOpenAIChat={() => setShowAIChat(true)} />
    </SafeAreaProvider>
  );
}