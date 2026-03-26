import { useNavigation, useRoute } from '@react-navigation/native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserIcon from '../components/UserIcon';
import { C, ELEMENT_COLORS } from '../theme';

const API_URL = 'https://oasis-api-nine.vercel.app/api/ask';

export default function AskAIScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userName, persona } = route.params;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const elementInfo = persona?.element_type ? ELEMENT_COLORS[persona.element_type] : null;

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
      const aiText = data?.content?.[0]?.text || 'もう一度試してください';
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '通信エラーが発生しました' }]);
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
          <Text style={[s.bubbleTxt, isUser && { color: '#fff' }]}>{item.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ヘッダー */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <UserIcon name={userName} size={30} />
        <View style={{ flex: 1 }}>
          <Text style={s.navName}>{userName} の AI</Text>
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

      {/* イントロ */}
      {messages.length === 0 ? (
        <View style={s.intro}>
          <UserIcon name={userName} size={56} />
          <Text style={s.introTitle}>{userName} の デジタル分身</Text>
          <Text style={s.introSub}>
            {userName}のAI会話データから生成された{'\n'}デジタル分身に質問してみましょう
          </Text>
          <View style={s.suggestRow}>
            {[
              `${userName}さんの趣味は？`,
              '大切にしていることは？',
              '最近考えていることは？',
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

      {/* 送信中インジケーター */}
      {sending ? (
        <View style={s.typingRow}>
          <UserIcon name={userName} size={24} />
          <View style={s.typingDots}>
            <ActivityIndicator size="small" color={C.p} />
            <Text style={s.typingTxt}>{userName}が考え中...</Text>
          </View>
        </View>
      ) : null}

      {/* 入力欄 */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={`${userName}に聞いてみる...`}
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
          デジタル分身はAI生成です。本人の発言ではありません。
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
  // イントロ
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
  // メッセージ
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  msgRowUser: { flexDirection: 'row-reverse' },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12 },
  bubbleUser: { backgroundColor: C.p, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.bd, borderBottomLeftRadius: 4 },
  bubbleTxt: { fontSize: 13, color: C.t1, lineHeight: 20 },
  // タイピング
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingBottom: 8 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typingTxt: { fontSize: 11, color: C.tm },
  // 入力
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: C.bd,
  },
  input: {
    flex: 1, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: C.t1, maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.p, alignItems: 'center', justifyContent: 'center',
  },
  sendTxt: { fontSize: 18, color: '#fff', fontWeight: '600' },
  disclaimer: {
    fontSize: 9, color: C.tm, textAlign: 'center',
    paddingBottom: 8, paddingTop: 2,
  },
});
