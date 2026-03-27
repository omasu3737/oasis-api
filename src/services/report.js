import { supabase } from '../supabase';

// ユーザーを通報
export async function reportUser(reporterId, reportedUserId, reason, detail) {
  try {
    const { error } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        reason,
        detail: detail || null,
      });
    return !error;
  } catch {
    return false;
  }
}

// ユーザーをブロック
export async function blockUser(myId, targetId) {
  try {
    // 既存のfriends関係を確認
    const { data: existing } = await supabase
      .from('friends')
      .select('id')
      .or(`and(requester_id.eq.${myId},receiver_id.eq.${targetId}),and(requester_id.eq.${targetId},receiver_id.eq.${myId})`)
      .single();

    if (existing) {
      await supabase
        .from('friends')
        .update({ status: 'blocked' })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('friends')
        .insert({ requester_id: myId, receiver_id: targetId, status: 'blocked' });
    }
    return true;
  } catch {
    return false;
  }
}

// ブロック解除
export async function unblockUser(myId, targetId) {
  try {
    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(requester_id.eq.${myId},receiver_id.eq.${targetId}),and(requester_id.eq.${targetId},receiver_id.eq.${myId})`)
      .eq('status', 'blocked');
    return !error;
  } catch {
    return false;
  }
}

// ブロック済みか確認
export async function isBlocked(myId, targetId) {
  try {
    const { data } = await supabase
      .from('friends')
      .select('id')
      .or(`and(requester_id.eq.${myId},receiver_id.eq.${targetId}),and(requester_id.eq.${targetId},receiver_id.eq.${myId})`)
      .eq('status', 'blocked')
      .single();
    return !!data;
  } catch {
    return false;
  }
}
