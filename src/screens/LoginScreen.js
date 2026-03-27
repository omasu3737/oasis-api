import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { signIn, signUp, resetPassword } from '../services/auth';

export default function LoginScreen() {
  const { colors: C } = useTheme();
  const { t } = useI18n();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const s = getStyles(C);

  function showMsg(text, error = true) {
    setMsg(text);
    setIsError(error);
  }

  async function handleSignIn() {
    if (!email || !password) { showMsg(t('login_empty_fields')); return; }
    setLoading(true);
    setMsg('');
    const { error } = await signIn(email, password);
    if (error) showMsg(t('login_failed'));
    setLoading(false);
  }

  async function handleSignUp() {
    if (!email || !password) { showMsg(t('login_empty_fields')); return; }
    if (password.length < 6) { showMsg(t('login_password_short')); return; }
    setLoading(true);
    setMsg('');
    const { error } = await signUp(email, password);
    if (error) showMsg(error.message);
    else { showMsg(t('login_confirm_email'), false); setMode('signin'); }
    setLoading(false);
  }

  async function handleReset() {
    if (!email) { showMsg(t('login_reset_empty')); return; }
    setLoading(true);
    setMsg('');
    const { error } = await resetPassword(email);
    if (error) showMsg(t('login_reset_failed'));
    else showMsg(t('login_reset_sent'), false);
    setLoading(false);
  }

  function switchMode(next) {
    setMode(next);
    setMsg('');
  }

  const isReset = mode === 'reset';
  const isSignUp = mode === 'signup';

  return (
    <SafeAreaView style={s.screen}>
      {/* Logo */}
      <Text style={s.logo}>{t('app_name')}</Text>
      <Text style={s.sub}>{t('login_subtitle')}</Text>

      {/* Form */}
      <View style={s.form}>
        <Text style={s.label}>{t('login_email')}</Text>
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

        {!isReset && (
          <>
            <Text style={s.label}>{t('login_password_label')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('login_password')}
              placeholderTextColor={C.tm}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </>
        )}

        {msg ? (
          <Text style={[s.msg, isError ? { color: C.err } : { color: C.p }]}>{msg}</Text>
        ) : null}

        {/* Primary action */}
        {isReset ? (
          <TouchableOpacity style={s.btn} onPress={handleReset} disabled={loading}>
            <Text style={s.btnTxt}>{loading ? t('loading') : t('login_reset_send')}</Text>
          </TouchableOpacity>
        ) : isSignUp ? (
          <TouchableOpacity style={s.btn} onPress={handleSignUp} disabled={loading}>
            <Text style={s.btnTxt}>{loading ? t('loading') : t('login_signup')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.btn} onPress={handleSignIn} disabled={loading}>
            <Text style={s.btnTxt}>{loading ? t('loading') : t('login_signin')}</Text>
          </TouchableOpacity>
        )}

        {/* Secondary action */}
        {isReset ? (
          <TouchableOpacity style={s.linkBtn} onPress={() => switchMode('signin')}>
            <Text style={s.linkTxt}>{t('login_switch_to_signin')}</Text>
          </TouchableOpacity>
        ) : isSignUp ? (
          <TouchableOpacity style={s.linkBtn} onPress={() => switchMode('signin')}>
            <Text style={s.linkTxt}>{t('login_switch_to_signin')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <TouchableOpacity onPress={() => switchMode('reset')}>
              <Text style={s.linkTxt}>{t('login_forgot')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => switchMode('signup')}>
              <Text style={s.linkTxt}>{t('login_switch_to_signup')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function getStyles(C) {
  return StyleSheet.create({
    screen: {
      flex: 1, backgroundColor: C.bg,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 28,
    },
    logo: {
      fontSize: 38, fontWeight: '600', color: C.t1,
      textAlign: 'center', marginBottom: 8, letterSpacing: -1,
    },
    sub: { fontSize: 13, color: C.tm, textAlign: 'center', marginBottom: 40 },
    form: { width: '100%' },
    label: { fontSize: 11, color: C.t2, marginBottom: 5, marginTop: 4, fontWeight: '500' },
    input: {
      width: '100%', backgroundColor: C.inputBg,
      borderWidth: 1, borderColor: C.bd,
      borderRadius: 14, padding: 13,
      fontSize: 14, color: C.t1, marginBottom: 14,
    },
    msg: { fontSize: 12, marginBottom: 12, textAlign: 'center', lineHeight: 18 },
    btn: {
      width: '100%', backgroundColor: C.p, borderRadius: 14,
      padding: 14, alignItems: 'center', marginBottom: 12,
    },
    btnTxt: { color: C.white, fontSize: 15, fontWeight: '600' },
    linkBtn: { alignItems: 'center', paddingVertical: 6 },
    linkTxt: { fontSize: 13, color: C.p, fontWeight: '500' },
  });
}
