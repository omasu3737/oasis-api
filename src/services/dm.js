import { supabase } from '../supabase';

// DMを送信
export async function sendDM(senderId, receiverId, content) {
  const { error } = await supabase
    .from('direct_messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, content });
  return !error;
}

// 特定の相手とのDM履歴を取得
export async function loadDMs(userId, friendId, limit = 50) {
  const { data } = await supabase
    .from('direct_messages')
    .select('id, sender_id, receiver_id, content, created_at')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true })
    .limit(limit);
  return data || [];
}

// フレンドごとの最新メッセージを取得（トークリスト用）
export async function getLatestDMs(userId, friendIds) {
  if (!friendIds.length) return {};

  const latest = {};
  for (const fid of friendIds) {
    const { data } = await supabase
      .from('direct_messages')
      .select('content, created_at, sender_id')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${fid}),and(sender_id.eq.${fid},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data?.[0]) {
      latest[fid] = data[0];
    }
  }
  return latest;
}
