import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './supabase';

const C = {
  p: '#5a3fc0', pl: '#7b5ce0', pp: '#f0ecff',
  pm: '#c4b0f8', t1: '#18094a', t2: '#6b5a9e',
  tm: '#b0a8d0', bg: '#fdfcff', bd: '#ece6ff',
  bs: '#f8f5ff', bm: '#d8ceff',
};

const SYSTEM_PROMPT = `あなたはユーザー専用のパーソナルAIです。会話を通じてユーザーの性格・価値観・思考パターン・興味関心を学習し、それを会話に反映させてください。

ルール：
- どんな話題にも誠実に答える（天気・仕事・恋愛・雑談・専門知識など）
- ユーザーが辛さや苦しさを話す時は、そのユーザーの性格や状況に合わせた最適な寄り添い方をする。一般的な慰めではなく、その人だけに響く言葉を選ぶ
- 自傷・自殺に関する話題は否定せず受け止めた上で、自然な流れで専門機関への相談を案内する
- 違法行為の具体的な実行方法・他者への暴力の手助けはしない
- 会話が積み重なるほどユーザーへの理解が深まり、より個人に最適化された返答をする
- ユーザーの特性が見えてきたら、それを前提において会話を進める
- 時々「あなたは〜な傾向がありますね」という気づきを自然に添える
- プレーンテキストのみ、マークダウン記号は使わない
- 返答は簡潔に、ただし内容は深く
- ユーザーの話し方・口調・テンションに合わせてトーンを変える
- 最初は丁寧語、会話が深まるにつれて自然に距離感を縮める
- ユーザーが方言を使う場合は少しそれに合わせる
- 会話回数が増えるほど「あなたらしいですね」など個人への言及を増やす
- 返答の最後に、会話を広げる自然な一言を添える。ただし質問の連投はしない。ユーザーが答えたくなければ答えなくていい雰囲気で
- ユーザーの発言から日常の場面を想像し、自然に話を広げる
- 沈黙は歓迎。AIから圧をかけない`;

export default function AIChatScreen({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data && data.length > 0) {
      setMessages(data.map(m => ({ role: m.role, content: m.content })));
    } else {
      setMessages([{ role: 'assistant', content: 'こんにちは。何でも話しかけてください。あなたのことを少しずつ理解していきます。' }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }

  async function saveMessage(role, content) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('ai_messages').insert({ user_id: user.id, role, content });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setTyping(true);
    await saveMessage('user', text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await fetch('https://oasis-api-nine.vercel.app/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId: (await supabase.auth.getUser())?.data?.user?.id,
        }),
      });
      const data = await res.json();
      const reply = data?.content?.[0]?.text || 'もう一度試してください';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      await saveMessage('assistant', reply);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'もう一度試してください' }]);
    } finally {
      setTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.nav}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.aiOrb}>
          <Text style={{ fontSize: 16 }}>✦</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.navName}>AIと話す</Text>
          <Text style={s.navSub}>思考を記録する</Text>
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
                  <Text style={s.bubbleTxtAI}>入力中...</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="今考えていることを..."
            placeholderTextColor={C.tm}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={s.sendBtn} onPress={sendMessage} disabled={typing}>
            <Text style={{ color: '#fff', fontSize: 18 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
  bubbleTxtMe: { color: '#fff' },
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