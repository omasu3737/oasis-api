import { waitUntil } from '@vercel/functions';
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

// --- STEP4: RAG Memory Functions ---

async function generateEmbedding(text) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
        }),
      }
    );
    const data = await response.json();
    return data?.embedding?.values || null;
  } catch {
    return null;
  }
}

async function retrieveMemories(userId, queryText, limit = 5) {
  try {
    const embedding = await generateEmbedding(queryText);
    if (!embedding) return [];

    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: embedding,
      match_user_id: userId,
      match_threshold: 0.3,
      match_count: limit,
    });

    if (error || !data) return [];
    return data.map(d => d.summary);
  } catch {
    return [];
  }
}

async function createSummaryIfNeeded(userId) {
  try {
    const { count: totalMessages } = await supabase
      .from('ai_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: summaryCount } = await supabase
      .from('conversation_summaries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const CHUNK_SIZE = 20;
    const covered = (summaryCount || 0) * CHUNK_SIZE;

    if ((totalMessages || 0) - covered < CHUNK_SIZE) return;

    const { data: msgs } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(covered, covered + CHUNK_SIZE - 1);

    if (!msgs || msgs.length < CHUNK_SIZE) return;

    const text = msgs
      .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
      .join('\n');

    const summary = await callGemini(
      'あなたは会話要約の専門家です。ユーザーの性格・関心事・重要な出来事・感情の変化が分かるように要約してください。箇条書きで200文字以内。',
      text
    );

    if (!summary) return;

    const embedding = await generateEmbedding(summary);
    if (!embedding) return;

    await supabase.from('conversation_summaries').insert({
      user_id: userId,
      summary,
      message_from: covered + 1,
      message_to: covered + CHUNK_SIZE,
      embedding,
    });
  } catch (err) {
    console.error('createSummary error:', err);
  }
}

// --- Personality Analysis (v3.0: 正しい5軸) ---

async function analyzePersonality(userId) {
  // 過去の要約 + 直近の会話を使って分析
  const { data: summaries } = await supabase
    .from('conversation_summaries')
    .select('summary')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const { data: recentMsgs } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(40);

  if (!recentMsgs || recentMsgs.length === 0) return null;

  const summaryText = summaries?.length > 0
    ? '【過去の会話要約】\n' + summaries.map(s => s.summary).join('\n---\n') + '\n\n'
    : '';

  const recentText = [...recentMsgs].reverse()
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n');

  const conversationText = summaryText + '【最近の会話】\n' + recentText;

  const result1 = await callGemini(
    `あなたは人格分析の専門家です。必ずJSON形式のみで返答してください。説明文は一切不要です。`,
    `以下の会話データを分析して0-100のスコアで評価してください。

深さ（depth）：内側を掘る力・本質を問う傾向（高=内省的・哲学的、低=外側・現実的）
意思（will）：やり遂げる力・自己規律（高=計画的・粘り強い、低=柔軟・即興的）
行動（action）：外に向かう衝動・積極性（高=社交的・行動的、低=内省的・静か）

会話データ：
${conversationText}

以下のJSON形式のみで返答：
{"depth": 数値, "will": 数値, "action": 数値}`
  );

  const result2 = await callGemini(
    `あなたは人格分析の専門家です。必ずJSON形式のみで返答してください。説明文は一切不要です。`,
    `以下の会話データを分析して0-100のスコアで評価してください。

共鳴（resonance）：他者との繋がり方・共感の深さ（高=共感的・調和的、低=独立的・客観的）
安定（stability）：感情の土台・感受性（高=安定・動じない、低=感受性豊か・感情の波あり）

会話データ：
${conversationText}

以下のJSON形式のみで返答：
{"resonance": 数値, "stability": 数値}`
  );

  const result3 = await callGemini(
    `あなたは人格分析の専門家です。必ずJSON形式のみで返答してください。説明文は一切不要です。`,
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

  const depth = scores1.depth ?? 50;
  const will = scores1.will ?? 50;
  const action = scores1.action ?? 50;
  const resonance = scores2.resonance ?? 50;
  const stability = scores2.stability ?? 50;

  const H = (s) => s >= 50;
  const key = [depth, will, action, resonance, stability]
    .map(s => H(s) ? 'H' : 'L').join('');

  // キー順序: depth, will, action, resonance, stability
  // Fire型 = 深さH×行動H, Water型 = 深さH×行動L
  // Wind型 = 深さL×行動H, Earth型 = 深さL×行動L
  const typeMap = {
    'HHHHH': { name: '深淵の預言者', element: 'Fire' },
    'HHHHL': { name: '燃える殉教者', element: 'Fire' },
    'HHHLH': { name: '冷徹な征服者', element: 'Fire' },
    'HHHLL': { name: '裂けた闘士', element: 'Fire' },
    'HLHHH': { name: '無垢な探検家', element: 'Fire' },
    'HLHHL': { name: '流浪の吟遊詩人', element: 'Fire' },
    'HLHLH': { name: '風来の放浪者', element: 'Fire' },
    'HLHLL': { name: '野生の狩人', element: 'Fire' },
    'HHLHH': { name: '静かな賢者', element: 'Water' },
    'HHLHL': { name: '繊細な詩人', element: 'Water' },
    'HHLLH': { name: '不動の哲学者', element: 'Water' },
    'HHLLL': { name: '嵐の修道士', element: 'Water' },
    'HLLHH': { name: '無言の聖人', element: 'Water' },
    'HLLHL': { name: '揺れる霊媒師', element: 'Water' },
    'HLLLH': { name: '霧深い隠者', element: 'Water' },
    'HLLLL': { name: '覚醒した幻視者', element: 'Water' },
    'LHHHH': { name: '揺るぎない君主', element: 'Wind' },
    'LHHHL': { name: '沸騰する革命家', element: 'Wind' },
    'LHHLH': { name: '無敗の将軍', element: 'Wind' },
    'LHHLL': { name: '激烈な戦士', element: 'Wind' },
    'LLHHH': { name: '明るい使者', element: 'Wind' },
    'LLHHL': { name: '陽気な祝祭者', element: 'Wind' },
    'LLHLH': { name: '軽やかな冒険者', element: 'Wind' },
    'LLHLL': { name: '衝動の奔走者', element: 'Wind' },
    'LHLHH': { name: '忠実な守護者', element: 'Earth' },
    'LHLHL': { name: '温かい癒し手', element: 'Earth' },
    'LHLLH': { name: '寡黙な職人', element: 'Earth' },
    'LHLLL': { name: '不屈の巡礼者', element: 'Earth' },
    'LLLHH': { name: '穏やかな調停者', element: 'Earth' },
    'LLLHL': { name: '素朴な共感者', element: 'Earth' },
    'LLLLH': { name: '泰然たる観察者', element: 'Earth' },
    'LLLLL': { name: '気ままな旅人', element: 'Earth' },
  };

  const personaType = typeMap[key] || { name: '霧深い隠者', element: 'Water' };

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

// --- Main Handler ---

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, system, userId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'invalid request' });
  }

  // STEP4: Retrieve relevant memories for context
  let memoryContext = '';
  if (userId) {
    try {
      const latestUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      if (latestUserMsg) {
        const memories = await retrieveMemories(userId, latestUserMsg);
        if (memories.length > 0) {
          memoryContext = '\n\n【過去の会話から覚えていること】\n' + memories.join('\n---\n');
        }
      }
    } catch {
      // Memory retrieval failed, continue without memories
    }
  }

  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: (system || '') + memoryContext + '\n\n重要：マークダウン記号（**、*、#など）は絶対に使わないこと。プレーンテキストのみで回答すること。簡潔に3文以内で答えること。'
            }]
          },
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 1000 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'もう一度試してください';
    text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '').trim();

    // Background tasks: summary creation + personality analysis
    // waitUntilでVercelにバックグラウンド処理の完了を待たせる
    if (userId) {
      waitUntil((async () => {
        try {
          // Count user messages in DB for personality trigger
          const { count } = await supabase
            .from('ai_messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('role', 'user');

          // Personality analysis every 10 user messages
          if (count > 0 && count % 10 === 0) {
            const result = await analyzePersonality(userId);
            if (result) {
              await supabase
                .from('persona_data')
                .upsert({
                  user_id: userId,
                  ...result,
                  conversation_count: count,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            }
          }

          // STEP4: Create conversation summary if enough new messages
          await createSummaryIfNeeded(userId);
        } catch (err) {
          console.error('background task error:', err);
        }
      })());
    }

    res.status(200).json({ content: [{ text }] });
  } catch (e) {
    console.error('handler error:', e);
    res.status(200).json({ content: [{ text: 'もう一度試してください' }] });
  }
}
