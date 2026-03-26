import { supabase } from '../supabase';

// 人格データを取得
export async function loadPersona(userId) {
  const { data } = await supabase
    .from('persona_data')
    .select('*')
    .eq('user_id', userId)
    .single();

  return data || null;
}

// ユーザーの会話数を取得
export async function getConversationCount(userId) {
  const { count } = await supabase
    .from('ai_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user');

  return count || 0;
}
