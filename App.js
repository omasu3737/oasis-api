import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import AIChatScreen from './AIChatScreen';
import MeScreen from './MeScreen';
import ResonanceScreen from './ResonanceScreen';
import { supabase } from './supabase';
import TalkScreen from './TalkScreen';

const C = {
  p: '#5a3fc0', pl: '#7b5ce0', pp: '#f0ecff',
  pm: '#c4b0f8', t1: '#18094a', t2: '#6b5a9e',
  tm: '#b0a8d0', bg: '#fdfcff', bd: '#ece6ff',
};

// ─── SVGアイコン（HTMLモックと同じ） ───
function IconMe({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4.5" stroke={color} strokeWidth="1.5" />
      <Path d="M4 21q0-7 8-7t8 7" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

function IconTalk({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19Q4 5 12 5Q20 5 20 13Q20 19 12 19L4 19Z" stroke={color} strokeWidth="1.5" />
      <Circle cx="9" cy="12" r="1.2" fill={color} />
      <Circle cx="12" cy="12" r="1.2" fill={color} />
      <Circle cx="15" cy="12" r="1.2" fill={color} />
    </Svg>
  );
}

function IconDisc({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="10" cy="10" r="6" stroke={color} strokeWidth="1.5" />
      <Line x1="15" y1="15" x2="21" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function TabIcon({ focused, SvgIcon, label }) {
  const color = focused ? C.p : C.tm;
  return (
    <View style={{ alignItems: 'center', paddingTop: 4 }}>
      <SvgIcon color={color} />
      <Text style={{ fontSize: 10, color, fontWeight: focused ? '500' : '400', marginTop: 4 }}>
        {label}
      </Text>
      <View style={{
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: focused ? C.p : 'transparent',
        marginTop: 3,
      }} />
    </View>
  );
}

// ─── 各タブ画面（仮） ───

const Tab = createBottomTabNavigator();

// ─── ログイン画面 ───
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg('ログインに失敗しました');
    setLoading(false);
  }

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else setMsg('確認メールを送信しました');
    setLoading(false);
  }

  return (
    <SafeAreaView style={[s.screen, { justifyContent: 'center', paddingHorizontal: 28 }]}>
      <Text style={s.logo}>OASIS</Text>
      <Text style={[s.sub, { marginBottom: 40 }]}>ありのままの自分を知る</Text>
      <Text style={s.label}>メールアドレス</Text>
      <TextInput style={s.input} placeholder="example@email.com" placeholderTextColor={C.tm}
        value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Text style={s.label}>パスワード（6文字以上）</Text>
      <TextInput style={s.input} placeholder="パスワード" placeholderTextColor={C.tm}
        value={password} onChangeText={setPassword} secureTextEntry />
      {msg ? <Text style={{ color: C.p, fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{msg}</Text> : null}
      <TouchableOpacity style={s.btn} onPress={signIn} disabled={loading}>
        <Text style={s.btnTxt}>{loading ? '...' : 'ログイン'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnOut} onPress={signUp} disabled={loading}>
        <Text style={[s.btnTxt, { color: C.p }]}>アカウントを作成</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── メインアプリ ───
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <Text style={s.logo}>OASIS</Text>
      </View>
    );
  }

  if (!session) return <LoginScreen />;

  if (showAIChat) return <AIChatScreen onBack={() => setShowAIChat(false)} />;

  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.bg,
            borderTopColor: C.bd,
            borderTopWidth: 1,
            height: 60,           //大きくすると全体が広がる
            paddingBottom: 0,    //大きくするとアイコンが上に上がる
            paddingTop: 8,       //大きくするとアイコンが下に下がる
          },
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen name="わたし" component={MeScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} SvgIcon={IconMe} label="わたし" /> }} />
        <Tab.Screen name="トーク"
          options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} SvgIcon={IconTalk} label="トーク" /> }}>
                  {() => <TalkScreen onOpenAIChat={() => setShowAIChat(true)} />}
        </Tab.Screen>
        <Tab.Screen name="共鳴" component={ResonanceScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} SvgIcon={IconDisc} label="共鳴" /> }} />
      </Tab.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 36, fontWeight: '500', color: C.t1, textAlign: 'center', marginBottom: 6, letterSpacing: -0.5 },
  pageTitle: { fontSize: 26, fontWeight: '500', color: C.t1, marginBottom: 8 },
  sub: { fontSize: 13, color: C.tm, textAlign: 'center' },
  label: { fontSize: 11, color: C.t2, marginBottom: 5, marginTop: 4 },
  input: {
    width: '100%', backgroundColor: C.pp, borderWidth: 1, borderColor: '#d8ceff',
    borderRadius: 12, padding: 12, fontSize: 13, color: C.t1, marginBottom: 12,
  },
  btn: {
    width: '100%', backgroundColor: C.p, borderRadius: 14,
    padding: 13, alignItems: 'center', marginBottom: 10,
  },
  btnOut: {
    width: '100%', backgroundColor: C.pp, borderWidth: 1, borderColor: '#d8ceff',
    borderRadius: 14, padding: 13, alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontSize: 14, fontWeight: '500' },
});

import { AppRegistry } from 'react-native';
AppRegistry.registerComponent('main', () => App);