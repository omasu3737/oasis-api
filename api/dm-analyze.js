/**
 * api/dm-analyze.js
 *
 * DM分析エンドポイント（プレミアム限定）
 * DMScreen.js から sendDM 後に呼ばれる。
 * 自分が送信したDMが20通の倍数に達したとき、
 * 自分の発言のみをGeminiで分析して persona_data の5軸スコアに反映する。
 *
 * POST /api/dm-analyze
 * Header: Authorization: Bearer <JWT>
 * Body: {} (空でOK)
 *
 * Response:
 *   200 { analyzed: true }   分析実行
 *   200 { analyzed: false }  20通未達 or 非premium → 何もしない
 *   401                      認証エラー
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DM_TRIGGER_COUNT = 20; // 何通ごとに分析するか
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function callGemini(systemPrompt, userPrompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 300 },
      }),
    }
  );
  if (!response.ok) return '';
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseJSON(text) {
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // JWT認証
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;

  try {
    // プレミアムチェック
    let userTier = 'free';
    if (userId === process.env.ADMIN_USER_ID) {
      userTier = 'premium';
    } else {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('tier, expires_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (subData && (!subData.expires_at || new Date(subData.expires_at) > new Date())) {
        userTier = subData.tier || 'free';
      }
    }

    if (userTier !== 'premium') {
      return res.status(200).json({ analyzed: false, reason: 'not_premium' });
    }

    // 自分が送信したDM総数を取得
    const { count: sentCount } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId);

    // 20の倍数でなければ何もしない
    if (!sentCount || sentCount % DM_TRIGGER_COUNT !== 0) {
      return res.status(200).json({ analyzed: false, reason: 'not_trigger_count', count: sentCount });
    }

    // 直近40件の自分の送信メッセージを取得
    const { data: dmMessages } = await supabase
      .from('direct_messages')
      .select('content, created_at')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(40);

    if (!dmMessages || dmMessages.length < 5) {
      return res.status(200).json({ analyzed: false, reason: 'insufficient_messages' });
    }

    const dmText = [...dmMessages].reverse().map(m => m.content).join('\n');

    // Gemini分析: DMの文体から5軸の補正値を算出（-15〜+15）
    const result = await callGemini(
      'あなたは人格分析の専門家です。必ずJSON形式のみで返答してください。説明文は一切不要です。',
      `以下はあるユーザーが友人に送ったメッセージの一覧です。
このメッセージの文体・内容から、以下の5つの性格軸について
「-15〜+15」の範囲で補正値を算出してください。

深さ（depth）：内省的・本質を掘り下げる傾向
意思（will）：目標達成への粘り強さ・計画性
行動（action）：社交的・積極的に動く傾向
共鳴（resonance）：他者への共感・調和を大切にする傾向
安定（stability）：感情の安定・動じにくさ

メッセージ一覧：
${dmText}

以下のJSON形式のみで返答：
{"depth": 数値, "will": 数値, "action": 数値, "resonance": 数値, "stability": 数値}`
    );

    const adjustments = parseJSON(result);
    if (!adjustments) {
      return res.status(200).json({ analyzed: false, reason: 'parse_failed' });
    }

    // 既存のpersona_dataを取得
    const { data: existing } = await supabase
      .from('persona_data')
      .select('depth, will, action, resonance, stability')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      return res.status(200).json({ analyzed: false, reason: 'no_persona_data' });
    }

    // 80%既存 + 20%DM補正 でブレンド（スコアは0-100にクランプ）
    const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
    const blend = (base, adj) => clamp(base * 0.8 + (base + adj) * 0.2);

    const updated = {
      depth:     blend(existing.depth     ?? 50, adjustments.depth     ?? 0),
      will:      blend(existing.will      ?? 50, adjustments.will      ?? 0),
      action:    blend(existing.action    ?? 50, adjustments.action    ?? 0),
      resonance: blend(existing.resonance ?? 50, adjustments.resonance ?? 0),
      stability: blend(existing.stability ?? 50, adjustments.stability ?? 0),
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('persona_data')
      .update(updated)
      .eq('user_id', userId);

    return res.status(200).json({ analyzed: true });
  } catch (err) {
    console.error('dm-analyze error:', err?.message || 'unknown');
    return res.status(200).json({ analyzed: false, reason: 'error' });
  }
}
