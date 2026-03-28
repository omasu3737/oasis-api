import { supabase } from '../supabase';

// 質問を送る（同じ質問があればsource_countを増やす）
export async function sendQuestion(targetUserId, questionText) {
  try {
    // 入力バリデーション
    const text = questionText?.trim();
    if (!text || text.length < 2 || text.length > 200) return false;

    // 現在のユーザーを取得（重複防止・自己送信防止）
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    if (user.id === targetUserId) return false; // 自分への質問を禁止

    // 自分がすでに同じ質問を送っていないか確認
    const { data: myExisting } = await supabase
      .from('user_questions')
      .select('id')
      .eq('target_user_id', targetUserId)
      .eq('question_text', text)
      .eq('sender_user_id', user.id)
      .maybeSingle();

    if (myExisting) return false; // 重複送信は無視

    // 同じ質問文が既にあるか確認（他ユーザーが送った同じ質問）
    const { data: existing } = await supabase
      .from('user_questions')
      .select('id, source_count')
      .eq('target_user_id', targetUserId)
      .eq('question_text', text)
      .maybeSingle();

    if (existing) {
      // 既存の質問のsource_countを増やす
      await supabase
        .from('user_questions')
        .update({ source_count: (existing.source_count || 1) + 1 })
        .eq('id', existing.id);
      return true;
    }

    // 新規質問を作成
    const { error } = await supabase
      .from('user_questions')
      .insert({
        target_user_id: targetUserId,
        sender_user_id: user.id,
        question_text: text,
        source_count: 1,
        status: 'pending',
      });

    return !error;
  } catch {
    return false;
  }
}

// 自分への質問を取得
export async function getMyQuestions(userId) {
  try {
    const { data, error } = await supabase
      .from('user_questions')
      .select('*')
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false });

    return data || [];
  } catch {
    return [];
  }
}

// 質問に回答
export async function answerQuestion(questionId, answerText) {
  try {
    const { error } = await supabase
      .from('user_questions')
      .update({ answer_text: answerText, status: 'answered' })
      .eq('id', questionId);

    return !error;
  } catch {
    return false;
  }
}

// ユーザーの回答済み質問を取得（プロフィール表示用）
export async function getAnsweredQuestions(userId) {
  try {
    const { data } = await supabase
      .from('user_questions')
      .select('id, question_text, answer_text, source_count')
      .eq('target_user_id', userId)
      .eq('status', 'answered')
      .order('created_at', { ascending: false });

    return data || [];
  } catch {
    return [];
  }
}
