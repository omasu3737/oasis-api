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

// 診断結果をpersona_dataに保存
export async function saveDiagnosticResult(userId, results) {
  const { error } = await supabase
    .from('persona_data')
    .upsert({
      user_id: userId,
      depth: results.depth,
      will: results.will,
      action: results.action,
      resonance: results.resonance,
      stability: results.stability,
      element_type: results.element_type,
      persona_type: results.persona_type,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  return !error;
}

// 診断済みかどうかを確認
export async function hasDiagnosticResult(userId) {
  const { data } = await supabase
    .from('persona_data')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}
