import { supabase } from '../supabase';

// 自分の分身への会話ログを取得（最新20件）
export async function getMyTwinConversations(userId) {
  const { data, error } = await supabase
    .from('twin_conversations')
    .select('id, question, answer, asker_user_id, created_at')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.log('getMyTwinConversations error:', error.message);
    return [];
  }
  return data || [];
}
