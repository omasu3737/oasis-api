import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn, signUp } from '../services/auth';
import { C } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      setMsg('メールアドレスとパスワードを入力してください');
      setIsError(true);
      return;
    }
    setLoading(true);
    setMsg('');
    const { error } = await signIn(email, password);
    if (error) {
      setMsg('ログインに失敗しました。メールアドレスとパスワードを確認してください');
      setIsError(true);
    }
    setLoading(false);
  }

  async function handleSignUp() {
    if (!email || !password) {
      setMsg('メールアドレスとパスワードを入力してください');
      setIsError(true);
      return;
    }
    if (password.length < 6) {
      setMsg('パスワードは6文字以上で入力してください');
      setIsError(true);
      return;
    }
    setLoading(true);
    setMsg('');
    const { error } = await signUp(email, password);
    if (error) {
      setMsg(error.message);
      setIsError(true);
    } else {
      setMsg('確認メールを送信しました。メールをご確認ください');
      setIsError(false);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={[s.screen, { justifyContent: 'center', paddingHorizontal: 28 }]}>
      <Text style={s.logo}>OASIS</Text>
      <Text style={[s.sub, { marginBottom: 40 }]}>ありのままの自分を知る</Text>
      <Text style={s.label}>メールアドレス</Text>
      <TextInput
        style={s.input}
        placeholder="example@email.com"
        placeholderTextColor={C.tm}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={s.label}>パスワード（6文字以上）</Text>
      <TextInput
        style={s.input}
        placeholder="パスワード"
        placeholderTextColor={C.tm}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {msg ? (
        <Text style={{ color: isError ? '#e05050' : C.p, fontSize: 12, marginBottom: 10, textAlign: 'center' }}>
          {msg}
        </Text>
      ) : null}
      <TouchableOpacity style={s.btn} onPress={handleSignIn} disabled={loading}>
        <Text style={s.btnTxt}>{loading ? '...' : 'ログイン'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnOut} onPress={handleSignUp} disabled={loading}>
        <Text style={[s.btnTxt, { color: C.p }]}>アカウントを作成</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 36, fontWeight: '500', color: C.t1, textAlign: 'center', marginBottom: 6, letterSpacing: -0.5 },
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
