import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const delay = (ms) => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, targetUserId } = req.body;

  if (!messages || !Array.isArray(messages) || !targetUserId) {
    return res.status(400).json({ error: 'invalid request' });
  }

  try {
    // ターゲットユーザーの人格データを取得
    const { data: persona } = await supabase
      .from('persona_data')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (!persona) {
      return res.status(200).json({
        content: [{ text: 'この人はまだAIとの会話が少ないため、デジタル分身が生成されていません。' }]
      });
    }

    // ターゲットユーザーのプロフィール
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, bio, comment')
      .eq('id', targetUserId)
      .single();

    // ターゲットユーザーの会話要約を取得（人格の再現に使う）
    const { data: summaries } = await supabase
      .from('conversation_summaries')
      .select('summary')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(8);

    const name = profile?.display_name || 'この人';

    // 人格特性からシステムプロンプトを構築
    const traits = [];
    if (persona.depth >= 60) traits.push('内省的で深い思考を持つ');
    if (persona.depth < 40) traits.push('実践的で現実的な視点を持つ');
    if (persona.will >= 60) traits.push('意志が強く計画的');
    if (persona.will < 40) traits.push('柔軟で即興的');
    if (persona.action >= 60) traits.push('社交的で行動的');
    if (persona.action < 40) traits.push('静かで思慮深い');
    if (persona.resonance >= 60) traits.push('共感力が高い');
    if (persona.resonance < 40) traits.push('独立した判断を大切にする');
    if (persona.stability >= 60) traits.push('感情的に安定している');
    if (persona.stability < 40) traits.push('感受性が豊か');

    const styleInfo = persona.style_profile
      ? `話し方: ${persona.style_profile.tone || '自然体'}、文の長さ: ${persona.style_profile.sentence_length || '中程度'}`
      : '';

    const valuesInfo = persona.values_profile
      ? `大切にしていること: ${persona.values_profile.core || ''}、行動の動機: ${persona.values_profile.motivation || ''}`
      : '';

    const deepInfo = [];
    if (persona.attachment_style?.type) deepInfo.push(`愛着スタイル: ${persona.attachment_style.type}`);
    if (persona.thinking_style?.pattern) deepInfo.push(`思考パターン: ${persona.thinking_style.pattern}`);
    if (persona.energy_source?.recharge) deepInfo.push(`エネルギー源: ${persona.energy_source.recharge}`);

    const summaryText = summaries?.length > 0
      ? '\n\n【この人の過去の会話から分かった特徴】\n' + summaries.map(s => s.summary).join('\n')
      : '';

    const systemPrompt = `あなたは「${name}」というユーザーのデジタル分身です。
${name}の人格データに基づき、${name}本人が答えるように会話してください。

【人格タイプ】${persona.persona_type}（${persona.element_type}型）
【人格特性】${traits.join('、')}
【5軸スコア】深さ${persona.depth} / 意思${persona.will} / 行動${persona.action} / 共鳴${persona.resonance} / 安定${persona.stability}
${styleInfo ? '【文体】' + styleInfo : ''}
${valuesInfo ? '【価値観】' + valuesInfo : ''}
${deepInfo.length > 0 ? '【深層特性】' + deepInfo.join('、') : ''}
${profile?.bio ? '【自己紹介】' + profile.bio : ''}
${profile?.comment ? '【一言】' + profile.comment : ''}
${summaryText}

重要なルール：
- ${name}本人として一人称で話してください
- マークダウン記号（**、*、#など）は使わないでください
- プレーンテキストのみで回答してください
- 2-4文程度で自然に答えてください
- 分からない質問には「うーん、それはまだあまり考えたことないかな」のように自然にかわしてください
- ${name}の人格データにない情報を作り出さないでください`;

    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    let text = '';
    for (let attempt = 0; attempt <= 2; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 500 },
          }),
        }
      );

      if (response.status === 429 || response.status === 503) {
        if (attempt < 2) { await delay(3000 * (attempt + 1)); continue; }
        throw new Error(`Gemini API error: ${response.status}`);
      }
      if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

      const data = await response.json();
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'もう一度試してください';
      text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '').trim();
      break;
    }

    res.status(200).json({ content: [{ text }] });
  } catch (e) {
    console.error('ask handler error:', e);
    res.status(200).json({ content: [{ text: 'もう一度試してください' }] });
  }
}
