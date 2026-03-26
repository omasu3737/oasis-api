import { supabase } from '../supabase';

// 現在のユーザーを取得
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ログイン
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

// アカウント作成
export async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error };
}

// ログアウト
export async function signOut() {
  await supabase.auth.signOut();
}

// セッション取得
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// 認証状態の変化を監視
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
    callback(session);
  });
  return subscription;
}
