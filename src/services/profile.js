import { supabase } from '../supabase';

// base64文字列をUint8Arrayに変換
function base64ToUint8Array(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const b64 = base64.replace(/=+$/, '');
  const len = b64.length;
  const bufLen = Math.floor(len * 3 / 4);
  const buf = new Uint8Array(bufLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[b64.charCodeAt(i)];
    const b = lookup[b64.charCodeAt(i + 1)];
    const c = lookup[b64.charCodeAt(i + 2)];
    const d = lookup[b64.charCodeAt(i + 3)];
    buf[p++] = (a << 2) | (b >> 4);
    if (i + 2 < len) buf[p++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < len) buf[p++] = ((c & 3) << 6) | (d & 63);
  }
  return buf;
}

// アバター画像をSupabase Storageにアップロードし、URLを返す
export async function uploadAvatar(userId, uri) {
  try {
    const path = `${userId}/avatar.jpg`;

    // fetch → arrayBuffer → Uint8Array（Androidネイティブビルドで確実に動作）
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, uint8Array, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      console.log('uploadAvatar error:', error.message, JSON.stringify(error));
      return { url: null, errorMessage: error.message };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = data.publicUrl + '?t=' + Date.now();

    // profilesテーブルにURLを保存
    await supabase.from('profiles').upsert(
      { id: userId, avatar_url: data.publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

    return { url: publicUrl, errorMessage: null };
  } catch (e) {
    console.log('uploadAvatar exception:', e?.message || e);
    return { url: null, errorMessage: e?.message || 'unknown error' };
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
