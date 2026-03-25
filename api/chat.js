import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function callGemini(systemPrompt, userPrompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 1000 },
      }),
    }
  );
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function analyzePersonality(userId, messages) {
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n');

  // 1回目：深さ・直感・創造
  const result1 = await callGemini(
    `あなたは人格分析の専門家です。会話データから人格特性をスコアリングします。
必ずJSON形式のみで返答してください。説明文は一切不要です。`,
    `以下の会話データを分析して、この人の特性を0-100のスコアで評価してください。

深さ：内側を掘る力・本質を問う傾向（高=内省的・哲学的、低=外側・現実的）
直感：パターンを先に掴む認知スタイル（高=全体把握・直感的、低=事実積み上げ・論理的）
創造：新しいアイデアを生む力（高=独創的・革新的、低=実用的・保守的）

会話データ：
${conversationText}

以下のJSON形式のみで返答：
{"depth": 数値, "intuition": 数値, "creativity": 数値}`
  );

  // 2回目：共鳴・行動・安定
  const result2 = await callGemini(
    `あなたは人格分析の専門家です。会話データから人格特性をスコアリングします。
必ずJSON形式のみで返答してください。説明文は一切不要です。`,
    `以下の会話データを分析して、この人の特性を0-100のスコアで評価してください。

共鳴：他者との繋がり方・共感の深さ（高=共感的・調和的、低=独立的・客観的）
行動：外に向かう衝動・積極性（高=社交的・行動的、低=内省的・静か）
安定：感情の土台・感受性（高=安定・動じない、低=感受性豊か・感情の波あり）

会話データ：
${conversationText}

以下のJSON形式のみで返答：
{"resonance": 数値, "action": 数値, "stability": 数値}`
  );

  // 3回目：文体プロファイルと価値観
  const result3 = await callGemini(
    `あなたは人格分析の専門家です。会話データから文体と価値観を分析します。
必ずJSON形式のみで返答してください。説明文は一切不要です。`,
    `以下の会話データからこの人の文体と価値観を分析してください。

会話データ：
${conversationText}

以下のJSON形式のみで返答：
{
  "style": {
    "tone": "話し方の特徴を一言で",
    "sentence_length": "短い/中程度/長い",
    "keywords": ["よく使う言葉1", "よく使う言葉2", "よく使う言葉3"]
  },
  "values": {
    "core": "最も大切にしていることを一言で",
    "motivation": "行動の動機を一言で",
    "worldview": "世界観を一言で"
  }
}`
  );

  // JSONパース
  const parseJSON = (text) => {
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  };

  const scores1 = parseJSON(result1);
  const scores2 = parseJSON(result2);
  const scores3 = parseJSON(result3);

  if (!scores1 || !scores2) return null;

  // 32タイプ判定
  const depth = scores1.depth || 50;
  const will = scores1.intuition || 50;
  const action = scores2.action || 50;
  const resonance = scores2.resonance || 50;
  const stability = scores2.stability || 50;

  const isHigh = (score) => score >= 50;
  const depthH = isHigh(depth);
  const willH = isHigh(will);
  const actionH = isHigh(action);
  const resonanceH = isHigh(resonance);
  const stabilityH = isHigh(stability);

  const typeMap = {
    'HHHHH': { name: '深淵の預言者', element: 'Fire' },
    'HHHHL': { name: '燃える殉教者', element: 'Fire' },
    'HHLHH': { name: '冷徹な征服者', element: 'Fire' },
    'HHLHL': { name: '裂けた闘士', element: 'Fire' },
    'HLHHH': { name: '無垢な探検家', element: 'Fire' },
    'HLHHL': { name: '流浪の吟遊詩人', element: 'Fire' },
    'HLLHH': { name: '風来の放浪者', element: 'Fire' },
    'HLLHL': { name: '野生の狩人', element: 'Fire' },
    'HHLHH': { name: '静かな賢者', element: 'Water' },
    'HHLLH': { name: '繊細な詩人', element: 'Water' },
    'HHLLL': { name: '不動の哲学者', element: 'Water' },
    'HHHLL': { name: '嵐の修道士', element: 'Water' },
    'HLHLH': { name: '無言の聖人', element: 'Water' },
    'HLHLL': { name: '揺れる霊媒師', element: 'Water' },
    'HLLLH': { name: '霧深い隠者', element: 'Water' },
    'HLLLL': { name: '覚醒した幻視者', element: 'Water' },
    'LHHHH': { name: '揺るぎない君主', element: 'Wind' },
    'LHHHL': { name: '沸騰する革命家', element: 'Wind' },
    'LHLHH': { name: '無敗の将軍', element: 'Wind' },
    'LHLHL': { name: '激烈な戦士', element: 'Wind' },
    'LLHHH': { name: '明るい使者', element: 'Wind' },
    'LLHHL': { name: '陽気な祝祭者', element: 'Wind' },
    'LLLHH': { name: '軽やかな冒険者', element: 'Wind' },
    'LLLHL': { name: '衝動の奔走者', element: 'Wind' },
    'LHHLH': { name: '忠実な守護者', element: 'Earth' },
    'LHHLL': { name: '温かい癒し手', element: 'Earth' },
    'LHLLH': { name: '寡黙な職人', element: 'Earth' },
    'LHLLL': { name: '不屈の巡礼者', element: 'Earth' },
    'LLHLH': { name: '穏やかな調停者', element: 'Earth' },
    'LLHLL': { name: '素朴な共感者', element: 'Earth' },
    'LLLLH': { name: '泰然たる観察者', element: 'Earth' },
    'LLLLL': { name: '気ままな旅人', element: 'Earth' },
  };

  const key = [depthH, willH, actionH, resonanceH, stabilityH]
    .map(h => h ? 'H' : 'L').join('');
  
  const personaType = typeMap[key] || { name: '静かな賢者', element: 'Water' };

  return {
    depth,
    will,
    action,
    resonance,
    stability,
    persona_type: personaType.name,
    element_type: personaType.element,
    style_profile: scores3?.style || null,
    values_profile: scores3?.values || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, system, userId } = req.body;

  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    // 通常の会話処理
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: (system || '') + '\n\n重要：マークダウン記号（**、*、#など）は絶対に使わないこと。プレーンテキストのみで回答すること。簡潔に3文以内で答えること。' }] },
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 1000 },
        }),
      }
    );
    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'もう一度試してください';
    text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '').trim();

    // 10回ごとに人格分析
    const userMessages = messages.filter(m => m.role === 'user');
    if (userId && userMessages.length > 0 && userMessages.length % 10 === 0) {
      analyzePersonality(userId, messages).then(async (result) => {
        if (!result) return;
        await supabase
          .from('persona_data')
          .upsert({
            user_id: userId,
            ...result,
            conversation_count: userMessages.length,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      });
    }

    res.status(200).json({ content: [{ text }] });
  } catch (e) {
    res.status(200).json({ content: [{ text: 'もう一度試してください' }] });
  }
}