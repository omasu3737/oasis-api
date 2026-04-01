# OASIS 次作業設計書
> 新規チャットでこのファイルを読んで作業を開始してください。
> 読む前に CLAUDE.md も参照してください。

---

## プロジェクト概要（要約）

**OASIS** = AI人格分析 × ソーシャルアプリ（React Native + Expo SDK54）
- DB: Supabase (PostgreSQL + pgvector + RLS)
- API: Vercel serverless（`api/chat.js`, `api/ask.js`）
- AI: Gemini 2.5 Flash（全処理）
- ナビ: Stack + BottomTab

---

## 現在の実装済み機能

- STEP1-7: 基本構成・会話保存・人格分析・RAG・プロフィール・フレンド・DM・共鳴スコア
- サブスクリプション（free/standard/premium）・課金制限・プレミアムバッジ
- デジタル分身（api/ask.js + AskAIScreen）
- 深層分析6項目（相性/価値観/愛着/ストレス/エネルギー/思考）
- MeScreen折り畳みUI（←**今回実装する**）
- オンボーディング10質問（←**今回実装する**）

---

## 今回実装する2つの機能

---

## 機能① MeScreen 折り畳みカード

### 概要
MeScreenのカード（相性がいい人・価値観・愛着スタイル・ストレス反応・エネルギー源泉・思考スタイル、および人格レーダー・特性スコア）をすべて「デフォルト折り畳み状態」にする。
タップすると展開して詳細が見える。

### 折り畳み状態での見た目（解放済み）
```
[ アイコン ]  カードタイトル        テーマ文言（太字）        [ ˅ ]
```
- アイコン：各カードのアイコンと同じ（lock-closedではない）
- テーマ文言：AIが生成した短縮テキスト（下表参照）
- 右端：chevron-down（展開矢印）

### 折り畳み状態での見た目（未解放）
```
[ アイコン ]  カードタイトル        未解放ヒント              [ 🔒 ]
```
現在の LockedCard と同じ内容。タップ不可（または何も起きない）。

### 各カードの「テーマ文言」マッピング
| カード | source | 表示例 |
|--------|--------|--------|
| 人格レーダー | `"解析済み"` または最高軸名 | "解析済み" |
| 特性スコア | `"解析済み"` | "解析済み" |
| 相性がいい人 | `personaData.compatibility_text` の最初の25文字 + "…" | "誠実で落ち着いた雰囲気の人…" |
| 価値観 | `personaData.values_priority?.order` | "自由 › 成長 › 意味 › 安定" |
| 愛着スタイル | `personaData.attachment_style?.type` | "回避・不安混合型" |
| ストレス反応 | `personaData.stress_response?.pattern` | "回避→内省→再構築" |
| エネルギー源泉 | `"充電: " + personaData.energy_source?.recharge` の最初の20文字 | "充電: 一人での読書…" |
| 思考スタイル | `personaData.thinking_style?.pattern` | "大局→直感→構造化" |

### 実装方法

**MeScreen.js に追加するもの：**
```javascript
const [expandedCards, setExpandedCards] = useState(new Set());

function toggleCard(cardId) {
  setExpandedCards(prev => {
    const next = new Set(prev);
    if (next.has(cardId)) next.delete(cardId);
    else next.add(cardId);
    return next;
  });
}
```

**新コンポーネント `CollapsibleCard`（MeScreen.js 内に定義）：**
```javascript
function CollapsibleCard({ cardId, icon, label, themeText, isLocked, hint, isDeepAnalysis, userTier, children }) {
  // isLocked = true → LockedCard相当（展開不可）
  // isLocked = false + children → 折り畳み可能
}
```

**折り畳みRow（解放済み）：**
- `TouchableOpacity` で全体をタップ可能
- `Animated.View` で展開アニメーション（高さを0→auto）
- または `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` でシンプルに

**現在の各カードをCollapsibleCardに置き換える：**
```jsx
{/* 現在 */}
{personaData?.attachment_style ? (
  <AnalysisCard mainText={...} ... />
) : (
  <LockedCard ... />
)}

{/* 変更後 */}
<CollapsibleCard
  cardId="attachment"
  icon="heart-outline"
  label={t('me_attachment')}
  themeText={personaData?.attachment_style?.type}
  isLocked={!personaData?.attachment_style}
  isDeepAnalysis
  userTier={userTier}
>
  <AnalysisCard mainText={...} ... />
</CollapsibleCard>
```

### 注意点
- `C.t3` は theme.js に存在しない。`C.t2` または `C.tm` を使う。
- LockedCard の中の `isDark ? C.t1 : C.t3` は `C.t1` に修正済みかを確認すること。
- アニメーションは `LayoutAnimation` を使うのが最もシンプル（Animatedは複雑）。
- Radar と TraitBars もCollapsibleCardで包む（children に RadarChart/TraitBar を入れる）。

---

## 機能② オンボーディング10質問

### 概要
アカウント作成直後の初回チャット開始時、AIが自動で10個の質問を一つずつ行い、10問終えたら通常会話に移行する。

### ユーザー体験フロー
1. アプリ初回起動 → ログイン → 「まずAIと話してみよう」CTA
2. AIChatScreen を開く → AIから自動で挨拶+Q1が届く
3. ユーザーが答える → AIがQ2を聞く（雑談は優しくリダイレクト）
4. Q10まで繰り返す
5. 10問完了 → AIが「ありがとうございます。これからは自由に話しましょう」
6. 以降は通常の会話モード

### 10個の質問リスト（決定版）
```
Q1: 最近、心が動いた出来事や体験を教えてもらえますか？
Q2: 人と話すとき、どんな会話が一番楽しいと感じますか？
Q3: 一人の時間と誰かといる時間、どちらが好きですか？その理由も聞かせてください。
Q4: 悩んでいるとき、あなたはどうすることが多いですか？
Q5: 仕事や日常の中で、どんな瞬間にやりがいや充実感を感じますか？
Q6: 大切な決断をするとき、何を一番重視しますか？
Q7: ストレスを感じたとき、どう対処することが多いですか？
Q8: 「この人と気が合う」と感じる人は、どんなタイプですか？
Q9: 理想の一日を自由に過ごせるとしたら、どう過ごしますか？
Q10: 自分のことをどんな人間だと思いますか？
```

### DB変更（必要なSQL）
```sql
-- profiles テーブルに追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;
```

### api/chat.js の変更

**① profiles から onboarding_complete を取得する（既存のprofile取得部分に追加）：**
```javascript
const { data: profileData } = await supabase
  .from('profiles')
  .select('onboarding_complete')
  .eq('id', userId)
  .maybeSingle();
const onboardingComplete = profileData?.onboarding_complete === true;
```

**② ユーザーメッセージ数を取得（convCount既存ロジックを活用）：**
```javascript
// 既存の todayMsgCount の他に全体のuser msg数も取る
const { count: totalUserMsgCount } = await supabase
  .from('ai_messages')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('role', 'user');
const userMsgCount = totalUserMsgCount || 0;
```

**③ システムプロンプトに注入するオンボーディング設定：**
```javascript
const ONBOARDING_QUESTIONS = [
  'Q1: 最近、心が動いた出来事や体験を教えてもらえますか？',
  // ... Q2〜Q10
];

let onboardingSystemInject = '';
if (!onboardingComplete && userMsgCount < 10) {
  const currentQ = ONBOARDING_QUESTIONS[userMsgCount]; // 0-indexed
  onboardingSystemInject = `
【オンボーディングモード - 厳守】
あなたは今、ユーザーと初めて会話しています。以下の質問を1つずつ聞いてください。
現在は ${currentQ} を聞く番です。
ユーザーが関係のない話をしてきた場合は「なるほど！では、続けて聞かせてください。${currentQ}」のように優しく戻してください。
分析や感想は不要です。質問を聞くことだけに集中してください。
`;
}

// userMsgCount === 9（10問目の答えが来た時点）→ 完了メッセージ
if (!onboardingComplete && userMsgCount === 10) {
  // 完了マーク
  await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', userId);
  onboardingSystemInject = `
ユーザーが10個の質問すべてに答えてくれました。
「ありがとうございます！10個の質問に答えてくれて嬉しいです。これからは自由に話しかけてください。あなたのことがよくわかってきました😊」と言って、通常の会話モードに移行してください。
`;
}
```

### AIChatScreen.js の変更

**初回挨拶を自動送信する：**
```javascript
// initScreen の中で
const history = await loadMessages(user.id);
if (history.length === 0) {
  // 初回：自動でAIに挨拶+Q1を送らせる
  setMessages([]);
  setTyping(true);
  const greeting = await sendToAI([{ role: 'user', content: '__ONBOARDING_START__' }], user.id);
  const aiMsg = { role: 'assistant', content: greeting };
  setMessages([aiMsg]);
  await saveMessage(user.id, 'assistant', greeting);
  setTyping(false);
} else {
  setMessages(history);
}
```

**api/chat.js で `__ONBOARDING_START__` を処理：**
```javascript
const lastUserMsg = messages[messages.length - 1]?.content;
if (lastUserMsg === '__ONBOARDING_START__') {
  // この特殊メッセージはDBに保存しない（クライアントも保存しない）
  // AIに最初の挨拶+Q1を生成させる
  onboardingSystemInject = `
はじめてのユーザーです。以下の挨拶をしてください：
「はじめまして！私はOASISのAIです。まずはあなたのことを知りたいので、10個の質問をさせてください😊
1つ目：最近、心が動いた出来事や体験を教えてもらえますか？」
余計なことは言わず、この文章だけを返してください。
`;
}
```

### 雑談防止の有効な手段（回答）
1. **システムプロンプト制御**（上記の実装）：最も確実。質問に戻すリダイレクト文を含める。
2. **convCount < 10 を常に監視**：API側でuserMsgCountを見て毎回オンボーディング注入。
3. **前の質問を再提示**：「まだQ1に答えてもらっていないのですが…」とAIに言わせる。
4. **完全ロック（非推奨）**：入力を制限するUIを作る（UX的にストレス）。
→ 1+2 の組み合わせで十分機能する。

---

## テスト太郎のデジタル分身設定

### 概要
テスト太郎（テスト用アカウント）の人格データをDBに手動挿入し、
誰でもAskAIScreen でテスト太郎の分身と会話できるようにする。

### 必要なSQL（Supabase SQL Editorで実行）
```sql
-- テスト太郎のUUIDを確認（先にこれで調べる）
SELECT id, email FROM auth.users WHERE email LIKE '%テスト%' OR email LIKE '%test%';

-- または profiles テーブルから
SELECT id, display_name FROM profiles WHERE display_name LIKE '%テスト%' OR display_name LIKE '%太郎%';
```

UUIDが判明したら以下を実行（`<テスト太郎のUUID>` を実際のUUIDに置換）：

```sql
INSERT INTO persona_data (
  user_id,
  depth, will, action, resonance, stability,
  persona_type, element_type,
  style_profile,
  values_profile,
  compatibility_text,
  values_priority,
  attachment_style,
  stress_response,
  energy_source,
  thinking_style,
  updated_at
) VALUES (
  '<テスト太郎のUUID>',
  72, 58, 65, 80, 63,
  '穏やかな調停者', 'Earth',
  '{"keywords": ["共感力高め", "マイペース", "好奇心旺盛", "話し上手"], "style": "丁寧で温かみのある言葉を好む。相手の気持ちを大切にする。"}',
  '{"core": "人との繋がり", "motivation": "誰かの役に立てたとき喜びを感じる", "worldview": "みんなが少しずつ幸せになればいい"}',
  '誠実で落ち着いていて、人の話をちゃんと聞いてくれる人。自分のペースを乱さない安心感がある人。',
  '{"order": "愛情 › 安定 › 成長 › 意味 › 自由", "description": "人との繋がりを最も大切にし、安心できる環境の中で少しずつ成長していきたいタイプ。", "tags": ["共感型", "安定志向", "つながり重視"]}',
  '{"type": "安定型", "description": "人との距離感が自然で、適度な依存と自立のバランスが取れている。信頼関係を築くのが得意。", "tags": ["安定型", "信頼感高い", "適度な距離感"]}',
  '{"pattern": "受容→整理→前進", "description": "ストレスを感じても感情的にならず、まず状況を受け止めてから冷静に対処しようとする。", "tags": ["受容力高い", "冷静", "立ち直りが早い"]}',
  '{"recharge": "友人と気軽に話す時間・好きなコンテンツをゆっくり楽しむ", "drain": "複雑な人間関係・明確でない状況が続くとき"}',
  '{"pattern": "全体把握→共感→結論", "description": "まず全体像を把握してから、相手の立場に立って物事を考え、自分なりの答えを出す。", "tags": ["バランス型", "共感思考", "慎重"]}',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  depth = EXCLUDED.depth,
  will = EXCLUDED.will,
  action = EXCLUDED.action,
  resonance = EXCLUDED.resonance,
  stability = EXCLUDED.stability,
  persona_type = EXCLUDED.persona_type,
  element_type = EXCLUDED.element_type,
  style_profile = EXCLUDED.style_profile,
  values_profile = EXCLUDED.values_profile,
  compatibility_text = EXCLUDED.compatibility_text,
  values_priority = EXCLUDED.values_priority,
  attachment_style = EXCLUDED.attachment_style,
  stress_response = EXCLUDED.stress_response,
  energy_source = EXCLUDED.energy_source,
  thinking_style = EXCLUDED.thinking_style,
  updated_at = NOW();
```

また、テスト太郎の `profiles.twin_enabled = true` であることを確認：
```sql
UPDATE profiles SET twin_enabled = TRUE WHERE id = '<テスト太郎のUUID>';
```

---

## 実装順序（推奨）

### STEP A: DB準備（ユーザーが実行）
1. `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;`
2. テスト太郎の persona_data SQL実行（UUID確認後）

### STEP B: 機能① MeScreen 折り畳み（Claudeが実装）
1. `MeScreen.js` に `expandedCards` state と `toggleCard` 関数を追加
2. `CollapsibleCard` コンポーネントを定義
3. 各カード（Radar / Traits / Compatibility / Values / Attachment / Stress / Energy / Thinking）を `CollapsibleCard` に置き換え

### STEP C: 機能② オンボーディング（Claudeが実装）
1. `api/chat.js` に `onboarding_complete` 取得・注入ロジック追加
2. `AIChatScreen.js` の `initScreen` に初回自動挨拶ロジック追加
3. 10問完了時の完了マーク処理を追加

### STEP D: ビルド・テスト
1. `git add -A && git commit -m "feat: collapsible cards + onboarding questions"`
2. `eas build --platform android --profile preview`

---

## 忘れてはいけないこと

- `C.t3` は theme.js に**存在しない**。`C.t2` か `C.tm` を使う
- `LockedCard` 内の `isDark ? C.t1 : C.t3` はバグ → `C.t2` に修正すること
- i18n：新しい文字列は `ja.js` と `en.js` 両方に追加
- Vercel の API は Production にデプロイ済み。修正後は `git push` で自動デプロイ
- 分析トリガーは convCount が10の倍数（基本分析）/ 15か30の倍数（深層分析、tier依存）
- `api/ask.js`：targetUserId は UUID形式検証済み。persona_dataがなければエラーメッセージ返す

---

## 新規チャットへの指示文

```
NEXT_WORK.md と CLAUDE.md を読んで、今回の作業を開始してください。

作業内容は以下の2つです：
① MeScreen の折り畳みカード実装（機能①）
② オンボーディング10質問機能（機能②）

まず私（ユーザー）が以下のSQLを Supabase SQL Editor で実行します：
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

SQL実行完了を確認したら、STEP B → STEP C の順で実装してください。
テスト太郎のpersona_data SQLは私が別途確認して実行します。
```
