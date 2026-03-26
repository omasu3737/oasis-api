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
export async function saveProfile(userId, fields) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      display_name: fields.displayName,
      bio: fields.bio,
      gender: fields.gender,
      age: fields.age || null,
      birthday: fields.birthday || null,
      comment: fields.comment,
      private_topics: fields.privateTopics,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  return !error;
}
