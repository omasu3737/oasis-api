import { supabase } from '../supabase';

// フレンドリクエストを送信
export async function sendFriendRequest(requesterId, receiverId) {
  const { error } = await supabase
    .from('friends')
    .insert({ requester_id: requesterId, receiver_id: receiverId });
  return !error;
}

// フレンドリクエストを承認
export async function acceptFriendRequest(friendshipId) {
  const { error } = await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
  return !error;
}

// フレンドリクエストを拒否（削除）
export async function rejectFriendRequest(friendshipId) {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendshipId);
  return !error;
}

// 受信したフレンドリクエスト一覧
export async function getPendingRequests(userId) {
  const { data } = await supabase
    .from('friends')
    .select('id, requester_id, created_at')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return data || [];
}

// 承認済みフレンド一覧を取得
export async function getFriends(userId) {
  const { data } = await supabase
    .from('friends')
    .select('id, requester_id, receiver_id, created_at')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  if (!data) return [];

  // 相手のIDリストを作成
  return data.map(f => ({
    friendshipId: f.id,
    friendId: f.requester_id === userId ? f.receiver_id : f.requester_id,
  }));
}

// フレンド関係の状態を確認
export async function getFriendshipStatus(userId, otherUserId) {
  const { data } = await supabase
    .from('friends')
    .select('id, status, requester_id')
    .or(`and(requester_id.eq.${userId},receiver_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .maybeSingle();

  if (!data) return { status: 'none', id: null };
  return { status: data.status, id: data.id, isSender: data.requester_id === userId };
}
