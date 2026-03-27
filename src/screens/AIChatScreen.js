import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { getCurrentUser } from '../services/auth';
import { loadMessages, saveMessage, sendToAI } from '../services/messages';

export default function AIChatScreen() {
  const { colors: C } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const scrollRef = useRef(null);

  const s = getStyles(C);

  const WELCOME = { role: 'assistant', content: t('chat_welcome') };

  useEffect(() => { initScreen(); }, []);

  async function initScreen() {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) { setLoading(false); return; }
      setCurrentUser(user);

      const history = await loadMessages(user.id);
      setMessages(history || [WELCOME]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) {
      Alert.alert(t('error'), t('chat_load_error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || typing || !currentUser) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setTyping(true);
    await saveMessage(currentUser.id, 'user', text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const reply = await sendToAI(newMessages, currentUser.id);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      await saveMessage(currentUser.id, 'assistant', reply);
    } catch (e) {
      Alert.alert(t('chat_network_error_title'), t('chat_network_error_msg'));
      setMessages(prev => [...prev, { role: 'assistant', content: t('chat_retry_msg') }]);
    } finally {
      setTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.nav}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.aiOrb}>
          <Text style={{ fontSize: 16 }}>✦</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.navName}>{t('chat_nav_name')}</Text>
          <Text style={s.navSub}>{t('chat_nav_sub')}</Text>
        </View>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 30}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={C.p} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, gap: 9 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m, i) => (
              <View key={i} style={[s.bubbleWrap, m.role === 'user' ? s.bubbleWrapMe : s.bubbleWrapAI]}>
                <View style={[s.bubble, m.role === 'user' ? s.bubbleMe : s.bubbleAI]}>
                  <Text style={[s.bubbleTxt, m.role === 'user' ? s.bubbleTxtMe : s.bubbleTxtAI]}>
                    {m.content}
                  </Text>
                </View>
              </View>
            ))}
            {typing && (
              <View style={s.bubbleWrapAI}>
                <View style={s.bubbleAI}>
                  <ActivityIndicator size="small" color={C.p} style={{ padding: 4 }} />
                </View>
              </View>
            )}
          </ScrollView>
        )}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder={t('chat_placeholder')}
            placeholderTextColor={C.tm}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={[s.sendBtn, typing && { opacity: 0.5 }]} onPress={handleSend} disabled={typing}>
            <Text style={{ color: C.white, fontSize: 18 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(C) {
  return StyleSheet.create({
    nav: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 18, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.bd,
    },
    backBtn: { padding: 4 },
    backTxt: { fontSize: 22, color: C.p },
    aiOrb: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.pp, borderWidth: 2, borderColor: C.bm,
      alignItems: 'center', justifyContent: 'center',
    },
    navName: { fontSize: 14, fontWeight: '500', color: C.t1 },
    navSub: { fontSize: 10, color: C.tm },
    bubbleWrap: { flexDirection: 'row', marginBottom: 2 },
    bubbleWrapAI: { justifyContent: 'flex-start' },
    bubbleWrapMe: { justifyContent: 'flex-end' },
    bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 },
    bubbleAI: { backgroundColor: C.pp, borderBottomLeftRadius: 5 },
    bubbleMe: { backgroundColor: C.p, borderBottomRightRadius: 5 },
    bubbleTxt: { fontSize: 13, lineHeight: 21 },
    bubbleTxtAI: { color: C.t1 },
    bubbleTxtMe: { color: C.white },
    inputRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 18, paddingVertical: 12,
      borderTopWidth: 1, borderTopColor: C.bd,
      backgroundColor: C.bg,
    },
    input: {
      flex: 1, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm,
      borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11,
      fontSize: 13, color: C.t1, maxHeight: 100,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.p, alignItems: 'center', justifyContent: 'center',
    },
  });
}
