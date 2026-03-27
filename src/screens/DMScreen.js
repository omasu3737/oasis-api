import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserIcon from '../components/UserIcon';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { getCurrentUser } from '../services/auth';
import { loadDMs, sendDM } from '../services/dm';

export default function DMScreen() {
  const { colors: C } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const route = useRoute();
  const { friendId, friendName } = route.params;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const scrollRef = useRef(null);

  const s = getStyles(C);

  useEffect(() => { init(); }, []);

  async function init() {
    const user = await getCurrentUser();
    if (!user) return;
    setCurrentUser(user);
    const dms = await loadDMs(user.id, friendId);
    setMessages(dms);
    setLoading(false);
  }

  async function handleSend() {
    if (!input.trim() || !currentUser || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const tempMsg = {
      id: 'temp-' + Date.now(),
      sender_id: currentUser.id,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    await sendDM(currentUser.id, friendId, text);
    setSending(false);
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <UserIcon name={friendName} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={s.navName}>{friendName}</Text>
          <Text style={s.navSub}>{t('dm_friend_label')}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={C.p} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1, paddingHorizontal: 18 }}
            contentContainerStyle={{ paddingVertical: 8, gap: 9 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>👋</Text>
                <Text style={{ fontSize: 13, color: C.tm }}>{t('dm_empty')}</Text>
              </View>
            ) : (
              messages.map((m, i) => {
                const isMe = m.sender_id === currentUser?.id;
                return (
                  <View key={m.id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '84%' }}>
                    <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                      <Text style={[s.bubbleText, isMe && { color: C.white }]}>{m.content}</Text>
                    </View>
                    <Text style={[s.time, isMe && { textAlign: 'right' }]}>{formatTime(m.created_at)}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('dm_placeholder')}
            placeholderTextColor={C.tm}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity style={s.sendBtn} onPress={handleSend}>
            <Text style={{ color: C.white, fontSize: 16 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(C) {
  return StyleSheet.create({
    nav: { paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: C.bd },
    back: { fontSize: 28, color: C.p, paddingRight: 4 },
    navName: { fontSize: 14, fontWeight: '500', color: C.t1 },
    navSub: { fontSize: 10, color: C.tm },
    bubble: { padding: 11, borderRadius: 18, maxWidth: '100%' },
    bubbleMe: { backgroundColor: C.p, borderBottomRightRadius: 5 },
    bubbleOther: { backgroundColor: C.pp, borderBottomLeftRadius: 5 },
    bubbleText: { fontSize: 13, lineHeight: 20, color: C.t1 },
    time: { fontSize: 9, color: C.tm, marginTop: 2, paddingHorizontal: 4 },
    inputRow: { paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: C.bd },
    input: { flex: 1, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontSize: 13, color: C.t1 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.p, alignItems: 'center', justifyContent: 'center' },
  });
}
