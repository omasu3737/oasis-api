import { API_URL, SYSTEM_PROMPT } from '../constants';
import { supabase } from '../supabase';

// 会話履歴を読み込み
export async function loadMessages(userId, limit = 200) {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data || data.length === 0) return null;
  return data.map(m => ({ role: m.role, content: m.content }));
}

// メッセージを保存
export async function saveMessage(userId, role, content) {
  await supabase.from('ai_messages').insert({ user_id: userId, role, content });
}

// AIにメッセージを送信して返答を取得
// STEP4: 直近20件のみ送信（それ以前はサーバー側RAGで補完）
export async function sendToAI(messages, userId) {
  const recentMessages = messages.slice(-20);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: recentMessages.map(m => ({ role: m.role, content: m.content })),
      userId,
    }),
  });

  if (!res.ok) throw new Error('サーバーエラー');

  const data = await res.json();
  return data?.content?.[0]?.text || 'もう一度試してください';
}
