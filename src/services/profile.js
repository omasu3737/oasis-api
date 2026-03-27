import { supabase } from '../supabase';

// アバター画像をSupabase Storageにアップロードし、URLを返す
export async function uploadAvatar(userId, uri) {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = (uri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const path = `${userId}/avatar.${ext === 'png' ? 'png' : 'jpg'}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { contentType, upsert: true });

    if (error) { console.log('uploadAvatar error:', error); return null; }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = data.publicUrl + '?t=' + Date.now(); // cache bust

    // profilesテーブルにURLを保存
    await supabase.from('profiles').upsert(
      { id: userId, avatar_url: data.publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

    return publicUrl;
  } catch (e) {
    console.log('uploadAvatar exception:', e);
    return null;
  }
}

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
  const upsertData = {
    id: userId,
    display_name: fields.displayName,
    bio: fields.bio,
    gender: fields.gender,
    age: fields.age || null,
    birthday: fields.birthday || null,
    comment: fields.comment,
    private_topics: fields.privateTopics,
    updated_at: new Date().toISOString(),
  };
  if (fields.avatarUrl !== undefined) {
    upsertData.avatar_url = fields.avatarUrl;
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(upsertData, { onConflict: 'id' });

  return !error;
}
