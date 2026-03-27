import { supabase } from '../supabase';

// 質問を送る（同じ質問があればsource_countを増やす）
export async function sendQuestion(targetUserId, questionText) {
  try {
    // 同じ質問が既にあるか確認
    const { data: existing } = await supabase
      .from('user_questions')
      .select('id, source_count')
      .eq('target_user_id', targetUserId)
      .eq('question_text', questionText)
      .single();

    if (existing) {
      await supabase
        .from('user_questions')
        .update({ source_count: (existing.source_count || 1) + 1 })
        .eq('id', existing.id);
      return true;
    }

    const { error } = await supabase
      .from('user_questions')
      .insert({
        target_user_id: targetUserId,
        question_text: questionText,
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
