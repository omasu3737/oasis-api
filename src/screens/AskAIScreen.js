import { useNavigation, useRoute } from '@react-navigation/native';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserIcon from '../components/UserIcon';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';

const API_URL = 'https://oasis-api-nine.vercel.app/api/ask';

export default function AskAIScreen() {
  const { colors: C, elementColors } = useTheme();
  const { t } = useI18n();
  const s = useMemo(() => getStyles(C), [C]);
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userName, persona } = route.params;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const elementInfo = persona?.element_type ? elementColors[persona.element_type] : null;

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          targetUserId: userId,
        }),
      });

      const data = await response.json();
      const aiText = data?.content?.[0]?.text || t('ask_retry');
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('ask_network_error') }]);
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item }) {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgRow, isUser && s.msgRowUser]}>
        {!isUser ? (
          <UserIcon name={userName} size={32} />
        ) : null}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
          <Text style={[s.bubbleTxt, isUser && { color: C.white }]}>{item.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <UserIcon name={userName} size={30} />
        <View style={{ flex: 1 }}>
          <Text style={s.navName}>{t('ask_nav_title', { name: userName })}</Text>
          {persona?.persona_type ? (
            <Text style={s.navType}>{persona.persona_type}</Text>
          ) : null}
        </View>
        {elementInfo && (
          <View style={[s.elBadge, { backgroundColor: elementInfo.bg, borderColor: elementInfo.border }]}>
            <Text style={[s.elBadgeTxt, { color: elementInfo.text }]}>
              {elementInfo.emoji} {persona.element_type}
            </Text>
          </View>
        )}
      </View>

      {messages.length === 0 ? (
        <View style={s.intro}>
          <UserIcon name={userName} size={56} />
          <Text style={s.introTitle}>{t('ask_ai_title', { name: userName })}</Text>
          <Text style={s.introSub}>
            {t('ask_intro_sub', { name: userName })}
          </Text>
          <View style={s.suggestRow}>
            {[
              t('ask_suggest_hobby', { name: userName }),
              t('ask_suggest_values'),
              t('ask_suggest_thoughts'),
            ].map((q, i) => (
              <TouchableOpacity key={i} style={s.suggestBtn}
                onPress={() => { setInput(q); }}>
                <Text style={s.suggestTxt}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 14, paddingBottom: 8 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {sending ? (
        <View style={s.typingRow}>
          <UserIcon name={userName} size={24} />
          <View style={s.typingDots}>
            <ActivityIndicator size="small" color={C.p} />
            <Text style={s.typingTxt}>{t('ask_thinking', { name: userName })}</Text>
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('ask_ai_placeholder', { name: userName })}
            placeholderTextColor={C.tm}
            multiline
            maxLength={300}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Text style={s.sendTxt}>↑</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.disclaimer}>
          {t('ask_ai_disclaimer')}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (C) => StyleSheet.create({
  nav: {
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 1, borderBottomColor: C.bd,
  },
  back: { fontSize: 28, color: C.p, paddingRight: 4 },
  navName: { fontSize: 14, fontWeight: '500', color: C.t1 },
  navType: { fontSize: 10, color: C.p, marginTop: 1 },
  elBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
  },
  elBadgeTxt: { fontSize: 9, fontWeight: '500' },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  introTitle: { fontSize: 16, fontWeight: '500', color: C.t1, marginTop: 4 },
  introSub: { fontSize: 12, color: C.tm, textAlign: 'center', lineHeight: 20 },
  suggestRow: { marginTop: 12, gap: 8, width: '100%' },
  suggestBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm,
    borderRadius: 14, alignItems: 'center',
  },
  suggestTxt: { fontSize: 12, color: C.p },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  msgRowUser: { flexDirection: 'row-reverse' },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12 },
  bubbleUser: { backgroundColor: C.p, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: C.card, borderWidth: 1, borderColor: C.bd, borderBottomLeftRadius: 4 },
  bubbleTxt: { fontSize: 13, color: C.t1, lineHeight: 20 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingBottom: 8 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typingTxt: { fontSize: 11, color: C.tm },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: C.bd,
  },
  input: {
    flex: 1, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.bm,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: C.t1, maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.p, alignItems: 'center', justifyContent: 'center',
  },
  sendTxt: { fontSize: 18, color: C.white, fontWeight: '600' },
  disclaimer: {
    fontSize: 9, color: C.tm, textAlign: 'center',
    paddingBottom: 8, paddingTop: 2,
  },
});
