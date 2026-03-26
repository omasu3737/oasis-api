import { supabase } from '../supabase';

// プロフィールを取得
export async function loadProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data || null;
}

// プロフィールを保存（upsert）
export async function saveProfile(userId, { displayName, bio }) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      display_name: displayName,
      bio,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  return !error;
}
