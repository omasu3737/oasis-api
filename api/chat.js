import { waitUntil } from '@vercel/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// シンプルなインメモリレート制限（1分間に60リクエストまで）
const rateLimitMap = new Map();
function checkRateLimit(key, maxRequests = 60, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  rateLimitMap.set(key, entry);
  // メモリリーク防止：古いエントリを定期削除
  if (rateLimitMap.size > 5000) {
    for (const [k, v] of rateLimitMap) { if (now > v.resetAt) rateLimitMap.delete(k); }
  }
  return entry.count <= maxRequests;
}

async function callGemini(systemPrompt, userPrompt, retries = 2) {
  for (let i = 0; i <= retries; i++) {
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
    if (response.status === 429 || response.status === 503) {
      if (i < retries) { await delay(3000 * (i + 1)); continue; }
      return '';
    }
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  return '';
}

// --- STEP4: RAG Memory Functions ---

async function generateEmbedding(text, retries = 2) {
  for (let i = 0; i <= retries; i++) {
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
      if (response.status === 429 || response.status === 503) {
        if (i < retries) { await delay(3000 * (i + 1)); continue; }
        return null;
      }
      const data = await response.json();
      return data?.embedding?.values || null;
    } catch {
      if (i < retries) { await delay(2000); continue; }
      return null;
    }
  }
  return null;
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
    console.error('createSummary error:', err?.message || 'Unknown error');
  }
}

// --- Personality Analysis (v3.0: 正しい5軸) ---

async function analyzePersonality(userId) {
  // 過去の要約 + 直近の会話を使って分析（最新20件に制限）
  const { data: summaries } = await supabase
    .from('conversation_summaries')
    .select('summary')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

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

  // レート制限回避: 各呼び出しの間に3秒の間隔
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

  await delay(3000);

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

  await delay(3000);

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
      console.warn('Failed to parse AI JSON response');
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

// --- Deep Personality Analysis (会話30回以上で実行) ---

async function analyzeDeepPersonality(userId, conversationCount, qaAnswers = [], dmMessages = [], minCount = 30) {
  if (conversationCount < minCount) return null;

  // 過去の要約 + 直近の会話を取得（最新20件に制限）
  const { data: summaries } = await supabase
    .from('conversation_summaries')
    .select('summary')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: recentMsgs } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);

  if (!recentMsgs || recentMsgs.length < 20) return null;

  const summaryText = summaries?.length > 0
    ? '【過去の会話要約】\n' + summaries.map(s => s.summary).join('\n---\n') + '\n\n'
    : '';

  const recentText = [...recentMsgs].reverse()
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n');

  const qaText = qaAnswers?.length > 0
    ? '\n\n【Q&A回答（本人の言葉）】\n' + qaAnswers.map(q => `Q: ${q.question_text}\nA: ${q.answer_text}`).join('\n---\n')
    : '';
  const dmText = dmMessages?.length > 0
    ? '\n\n【フレンドへのメッセージ（本人の発言のみ）】\n' + dmMessages.map(m => m.content).join('\n')
    : '';
  const ctx = summaryText + '【最近の会話】\n' + recentText + qaText + dmText;

  const parseJSON = (text) => {
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      console.warn('Failed to parse AI JSON response');
      return null;
    }
  };

  // 1回目: 相性 + 価値観優先順位
  const deep1 = await callGemini(
    'あなたは心理分析の専門家です。必ずJSON形式のみで返答してください。',
    `以下の会話データからこの人の「相性がいい人の特徴」と「価値観の優先順位」を分析してください。

会話データ：
${ctx}

以下のJSON形式のみで返答：
{
  "compatibility": "この人と相性がいい人の特徴を3-4文で具体的に記述",
  "values_priority": {
    "order": "最重要な価値観 › 2番目 › 3番目 › 4番目 › 5番目（自由,意味,安定,承認,貢献,成長,愛情,独立から選択）",
    "description": "この優先順位になる理由を2文で",
    "tags": ["特徴タグ1", "特徴タグ2", "特徴タグ3"]
  }
}`
  );

  await delay(3000);

  // 2回目: 愛着スタイル + ストレス反応
  const deep2 = await callGemini(
    'あなたは心理分析の専門家です。必ずJSON形式のみで返答してください。',
    `以下の会話データからこの人の「愛着スタイル」と「ストレス反応パターン」を分析してください。

会話データ：
${ctx}

以下のJSON形式のみで返答：
{
  "attachment": {
    "type": "安定型/不安型/回避型/回避・不安混合型 のいずれか",
    "description": "この人の対人関係の特徴を2文で",
    "tags": ["特徴タグ1", "特徴タグ2", "特徴タグ3"]
  },
  "stress": {
    "pattern": "ストレス時の行動パターンを矢印で表現（例：回避→内省→再構築）",
    "description": "ストレス反応の特徴を2文で",
    "tags": ["特徴タグ1", "特徴タグ2", "特徴タグ3"]
  }
}`
  );

  await delay(3000);

  // 3回目: エネルギー源泉 + 思考スタイル
  const deep3 = await callGemini(
    'あなたは心理分析の専門家です。必ずJSON形式のみで返答してください。',
    `以下の会話データからこの人の「エネルギーの源泉」と「思考スタイル」を分析してください。

会話データ：
${ctx}

以下のJSON形式のみで返答：
{
  "energy": {
    "recharge": "エネルギーが充電される活動・状況を具体的に",
    "drain": "エネルギーが消耗する活動・状況を具体的に"
  },
  "thinking": {
    "pattern": "思考の流れを矢印で表現（例：大局→直感→構造化）",
    "description": "思考スタイルの特徴を2文で",
    "tags": ["特徴タグ1", "特徴タグ2", "特徴タグ3"]
  }
}`
  );

  const d1 = parseJSON(deep1);
  const d2 = parseJSON(deep2);
  const d3 = parseJSON(deep3);

  if (!d1 && !d2 && !d3) return null;

  return {
    compatibility_text: d1?.compatibility || null,
    values_priority: d1?.values_priority || null,
    attachment_style: d2?.attachment || null,
    stress_response: d2?.stress || null,
    energy_source: d3?.energy || null,
    thinking_style: d3?.thinking || null,
  };
}

// --- Main Handler ---

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // JWT認証（必須）
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // userIdはJWTから取得（クライアント送信値は使わない）
  const userId = user.id;

  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'invalid request' });
  }
  // メッセージ数・文字数制限（DoS対策）
  if (messages.length > 100) {
    return res.status(400).json({ error: 'too many messages' });
  }
  for (const msg of messages) {
    if (!msg.role || typeof msg.content !== 'string' || msg.content.length > 3000) {
      return res.status(400).json({ error: 'invalid message format' });
    }
  }
  // systemプロンプトの長さ制限
  if (system && typeof system === 'string' && system.length > 5000) {
    return res.status(400).json({ error: 'system prompt too long' });
  }
  // レート制限チェック（ユーザー単位）
  if (!checkRateLimit(userId, 60, 60000)) {
    return res.status(429).json({ error: 'Too many requests. Please wait.' });
  }

  // オンボーディング状態取得
  let onboardingComplete = true;
  let userMsgCount = 0;
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', userId)
      .maybeSingle();
    onboardingComplete = profileData?.onboarding_complete === true;

    if (!onboardingComplete) {
      const { count: totalUserMsgCount } = await supabase
        .from('ai_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('role', 'user');
      userMsgCount = totalUserMsgCount || 0;
    }
  } catch { /* オンボーディング取得失敗は通常モードで続行 */ }

  // サブスクリプションtier取得（ADMIN_USER_ID → DB → free の優先順）
  let userTier = 'free';
  try {
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
  } catch { /* tier取得失敗はfreeとして続行 */ }

  // プラン別日次制限チェック
  const dailyLimits = { free: 15, standard: 40, premium: 200 };
  const dailyLimit = dailyLimits[userTier] ?? 15;
  let isSoftLimit = false;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: todayMsgCount } = await supabase
      .from('ai_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', todayStart.toISOString());
    const used = todayMsgCount || 0;
    if (userTier === 'premium') {
      isSoftLimit = used >= dailyLimit;
    } else if (used >= dailyLimit) {
      // free / standard はハードリミット
      const upgradeMsg = userTier === 'free'
        ? `今日の無料チャット（${dailyLimit}回）を使い切りました。スタンダードプランで40回/日に増やせます。`
        : `今日のチャット（${dailyLimit}回）を使い切りました。プレミアムプランで無制限になります。`;
      return res.status(429).json({ error: 'daily_limit_reached', tier: userTier, limit: dailyLimit, message: upgradeMsg });
    }
  } catch { /* 制限チェック失敗は続行 */ }

  // オンボーディングシステムプロンプト構築
  const ONBOARDING_QUESTIONS = [
    'Q1: 最近、心が動いた出来事や体験を教えてもらえますか？',
    'Q2: 人と話すとき、どんな会話が一番楽しいと感じますか？',
    'Q3: 一人の時間と誰かといる時間、どちらが好きですか？その理由も聞かせてください。',
    'Q4: 悩んでいるとき、あなたはどうすることが多いですか？',
    'Q5: 仕事や日常の中で、どんな瞬間にやりがいや充実感を感じますか？',
    'Q6: 大切な決断をするとき、何を一番重視しますか？',
    'Q7: ストレスを感じたとき、どう対処することが多いですか？',
    'Q8: 「この人と気が合う」と感じる人は、どんなタイプですか？',
    'Q9: 理想の一日を自由に過ごせるとしたら、どう過ごしますか？',
    'Q10: 自分のことをどんな人間だと思いますか？',
  ];

  const lastUserMsg = messages[messages.length - 1]?.content;
  let onboardingSystemInject = '';

  if (lastUserMsg === '__ONBOARDING_START__') {
    onboardingSystemInject = `
はじめてのユーザーです。以下の挨拶をしてください：
「はじめまして！私はOASISのAIです。まずはあなたのことを知りたいので、10個の質問をさせてください😊
1つ目：最近、心が動いた出来事や体験を教えてもらえますか？」
余計なことは言わず、この文章だけを返してください。
`;
  } else if (!onboardingComplete) {
    if (userMsgCount < 10) {
      const currentQ = ONBOARDING_QUESTIONS[userMsgCount];
      onboardingSystemInject = `
【オンボーディングモード - 厳守】
あなたは今、ユーザーと初めて会話しています。以下の質問を1つずつ聞いてください。
現在は ${currentQ} を聞く番です。
ユーザーが関係のない話をしてきた場合は「なるほど！では、続けて聞かせてください。${currentQ}」のように優しく戻してください。
分析や感想は不要です。質問を聞くことだけに集中してください。
`;
    } else if (userMsgCount === 10) {
      // 10問完了：完了マークをバックグラウンドで実行
      supabase.from('profiles').update({ onboarding_complete: true }).eq('id', userId).then(() => {}).catch(() => {});
      onboardingSystemInject = `
ユーザーが10個の質問すべてに答えてくれました。
「ありがとうございます！10個の質問に答えてくれて嬉しいです。これからは自由に話しかけてください。あなたのことがよくわかってきました😊」と言って、通常の会話モードに移行してください。
`;
    }
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

  // __ONBOARDING_START__ はGeminiに送らない（ダミーメッセージ）
  const filteredMessages = messages.filter(m => m.content !== '__ONBOARDING_START__');
  const geminiMessages = filteredMessages.length > 0
    ? filteredMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    : [{ role: 'user', parts: [{ text: 'こんにちは' }] }];

  try {
    // メインチャット応答（429リトライ付き）
    let text = '';
    for (let attempt = 0; attempt <= 2; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{
                text: (system || '') + memoryContext + onboardingSystemInject + '\n\n重要：マークダウン記号（**、*、#など）は絶対に使わないこと。プレーンテキストのみで回答すること。簡潔に3文以内で答えること。' +
                  (isSoftLimit ? '\n\n【今日の締めくくり】今日はたくさん話してくれた。この返答をしっかりした後、会話の流れの中で自然に「今日はここまでにしようか」「続きはまた明日聞かせて」という雰囲気で締めくくること。システムメッセージのように言わず、あくまで会話として自然に。' : '')
              }]
            },
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 1000 },
          }),
        }
      );

      if (response.status === 429 || response.status === 503) {
        if (attempt < 2) { await delay(3000 * (attempt + 1)); continue; }
        throw new Error(`Gemini API error: ${response.status}`);
      }
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'もう一度試してください';
      text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '');
      // Gemini 2.5 thinking mode leak cleanup
      text = text.replace(/SPECIAL INSTRUCTION:.*?(\n|$)/gi, '');
      text = text.replace(/\[INST\][\s\S]*?\[\/INST\]/gi, '');
      text = text.replace(/^(Note|IMPORTANT|WARNING):.*?(\n|$)/gm, '');
      text = text.trim();
      break;
    }

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

            // プラン別深層分析間隔（premium:15回, その他:30回）
            const deepInterval = userTier === 'premium' ? 15 : 30;
            if (count >= deepInterval && count % deepInterval === 0) {
              // Q&Aブロック管理（5件ごとに分析に含める）
              const { data: personaRow } = await supabase
                .from('persona_data').select('qa_analyzed_count').eq('user_id', userId).maybeSingle();
              const qaAnalyzedCount = personaRow?.qa_analyzed_count || 0;
              const { data: qaAnswers } = await supabase
                .from('user_questions').select('question_text, answer_text')
                .eq('target_user_id', userId).eq('status', 'answered')
                .order('updated_at', { ascending: false }).limit(50);
              const newAnswerCount = qaAnswers?.length || 0;
              const shouldIncludeQA = newAnswerCount - qaAnalyzedCount >= 5;

              // DM自分の発言（直近30件）
              const { data: dmMessages } = await supabase
                .from('direct_messages').select('content, created_at')
                .eq('sender_id', userId)
                .order('created_at', { ascending: false }).limit(30);

              const deepResult = await analyzeDeepPersonality(
                userId, count,
                shouldIncludeQA ? (qaAnswers || []) : [],
                dmMessages || [],
                deepInterval
              );
              if (deepResult) {
                const updateData = { ...deepResult, updated_at: new Date().toISOString() };
                if (shouldIncludeQA) updateData.qa_analyzed_count = newAnswerCount;
                await supabase.from('persona_data').update(updateData).eq('user_id', userId);
              }
            }
          }

          // STEP4: Create conversation summary if enough new messages
          await createSummaryIfNeeded(userId);
        } catch (err) {
          console.error('background task error:', err?.message || 'Unknown error');
        }
      })());
    }

    res.status(200).json({ content: [{ text }] });
  } catch (e) {
    // 内部エラーをログに残すが、詳細をクライアントには返さない
    console.error('handler error:', e?.message || 'unknown');
    res.status(500).json({ content: [{ text: 'もう一度試してください' }] });
  }
}
