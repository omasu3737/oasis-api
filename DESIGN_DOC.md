# OASIS 完全実装設計書

> 最終更新: 2026-03-27
> 対象リポジトリ: oasis3 (React Native + Expo SDK54)
> 開発者: おます（ソロ開発）

---

## 現状のコードベース概要

### 技術スタック
- **Frontend**: React Native 0.81.5 + Expo SDK 54
- **Navigation**: @react-navigation/native-stack 7.14.8 + bottom-tabs 7.15.6
- **DB**: Supabase (PostgreSQL + pgvector)
- **API**: Vercel Serverless Functions (api/chat.js, api/ask.js)
- **AI**: Gemini 2.5 Flash (開発中)
- **State管理**: React useState/useEffect（Context未使用）

### 現在のカラーパレット (src/theme.js)
```
C.p   = '#6a1fc8'  // primary（濃い紫）
C.pl  = '#8b45e0'  // primary light
C.pp  = '#f0e8ff'  // primary pale
C.pm  = '#c09ef8'  // primary muted
C.t1  = '#1a0a40'  // text primary
C.t2  = '#6b4a9e'  // text secondary
C.tm  = '#a498c0'  // text muted
C.bg  = '#fcfbff'  // background
C.bd  = '#e8dfff'  // border
C.bs  = '#f6f2ff'  // background subtle
C.bm  = '#d4c4f5'  // border muted
```

### 現在のファイル構成
```
oasis3/
  App.js                          # ルート（認証分岐）
  app.json                        # Expo設定
  package.json                    # 依存関係
  api/
    chat.js                       # メインAIチャットAPI（Gemini + RAG + 人格分析 + 深層分析）
    ask.js                        # デジタル分身API
  src/
    theme.js                      # カラーパレット
    constants.js                  # API_URL, SYSTEM_PROMPT
    supabase.js                   # Supabaseクライアント
    navigation/
      AppNavigator.js             # Stack + Tab Navigator
    screens/
      LoginScreen.js              # ログイン/新規登録
      MeScreen.js                 # わたしタブ（人格データ表示）
      TalkScreen.js               # トークタブ（AIチャット + フレンドリスト）
      ResonanceScreen.js          # 共鳴タブ（ユーザー検索 + 共鳴スコア）
      AIChatScreen.js             # AIチャット画面
      DMScreen.js                 # DM画面
      UserProfileScreen.js        # 他ユーザーのプロフィール
      AskAIScreen.js              # デジタル分身に質問
      TermsScreen.js              # 利用規約・プライバシーポリシー
    services/
      auth.js                     # 認証（signIn, signUp, signOut, getSession）
      messages.js                 # AI会話（loadMessages, saveMessage, sendToAI）
      persona.js                  # 人格データ（loadPersona, getConversationCount）
      profile.js                  # プロフィール（loadProfile, saveProfile）
      friends.js                  # フレンド（request, accept, reject, getFriends）
      dm.js                       # DM（sendDM, loadDMs, getLatestDMs）
      resonance.js                # 共鳴スコア計算（5軸ユークリッド距離）
      questions.js                # 質問機能（sendQuestion, getMyQuestions, answerQuestion）
      report.js                   # 通報・ブロック（reportUser, blockUser, unblockUser）
    components/
      RadarChart.js               # 5軸レーダーチャート（SVG）
      TraitBar.js                 # 特性スコアバー
      UserIcon.js                 # ユーザーアイコン（頭文字表示）
      EmptyCard.js                # 空状態カード
```

### 現在のDBテーブル
- `users`: id, name, comment, bio, age, birthday, gender, icon_url, element_type, type_name, created_at
- `profiles`: id, display_name, bio, gender, age, birthday, comment, private_topics, avatar_url, updated_at
- `persona_data`: user_id, depth, will, action, resonance, stability, persona_type, element_type, style_profile, values_profile, compatibility_text, values_priority, attachment_style, stress_response, energy_source, thinking_style, conversation_count, updated_at
- `ai_messages`: id, user_id, role, content, created_at
- `conversation_summaries`: id, user_id, summary, message_from, message_to, embedding (vector), created_at
- `friends`: id, requester_id, receiver_id, status (pending/accepted/blocked), created_at
- `direct_messages`: id, sender_id, receiver_id, content, created_at
- `groups`: (作成済み、未使用)
- `group_members`: (作成済み、未使用)
- `group_messages`: (作成済み、未使用)
- `user_questions`: id, target_user_id, question_text, answer_text, source_count, status (pending/answered), created_at
- `user_reports`: id, reporter_id, reported_user_id, reason, detail, created_at

### 現在のナビゲーション構造
```
Stack.Navigator (headerShown: false)
  ├─ Main (TabNavigator)
  │   ├─ わたし → MeScreen
  │   ├─ トーク → TalkScreen
  │   └─ 共鳴   → ResonanceScreen
  ├─ AIChat → AIChatScreen
  ├─ DM → DMScreen
  ├─ UserProfile → UserProfileScreen
  ├─ AskAI → AskAIScreen
  └─ Terms → TermsScreen
```

---

## Phase 1: 基盤 + 見た目（7項目）

### 1-1. ダークモード対応（手動切替）

#### 1-1-A. theme.js の変更

**現在のファイル**: `src/theme.js`

ライトテーマはそのまま維持し、ダークテーマパレットを追加する。

```js
// src/theme.js

// ライトテーマ（現在のC）
export const lightTheme = {
  p: '#6a1fc8',
  pl: '#8b45e0',
  pp: '#f0e8ff',
  pm: '#c09ef8',
  t1: '#1a0a40',
  t2: '#6b4a9e',
  tm: '#a498c0',
  bg: '#fcfbff',
  bd: '#e8dfff',
  bs: '#f6f2ff',
  bm: '#d4c4f5',
  card: '#ffffff',
  modalBg: '#ffffff',
  overlay: 'rgba(0,0,0,0.35)',
  bubble: '#ffffff',
  statusBar: 'dark-content',
};

// ダークテーマ
export const darkTheme = {
  p: '#a87cef',      // primary（明るめの紫で視認性確保）
  pl: '#c4a6f5',     // primary light
  pp: '#2a1a4a',     // primary pale（暗い紫背景）
  pm: '#5a3a8a',     // primary muted
  t1: '#f0eaf8',     // text primary（白に近い薄紫）
  t2: '#c0a8e0',     // text secondary
  tm: '#7a6a98',     // text muted
  bg: '#0f0a1a',     // background（深い紫黒）
  bd: '#2a1a4a',     // border
  bs: '#1a1028',     // background subtle
  bm: '#3a2860',     // border muted
  card: '#1a1028',   // カード背景
  modalBg: '#1a1028', // モーダル背景
  overlay: 'rgba(0,0,0,0.6)',
  bubble: '#1a1028',
  statusBar: 'light-content',
};

// ELEMENT_COLORSのダーク版
export const ELEMENT_COLORS_DARK = {
  Fire:  { bg: '#2a1510', border: '#8a4030', text: '#ff8070', emoji: '\uD83D\uDD25' },
  Water: { bg: '#101828', border: '#3060a0', text: '#70a8ff', emoji: '\uD83D\uDCA7' },
  Wind:  { bg: '#102818', border: '#308050', text: '#70d890', emoji: '\uD83C\uDF2C' },
  Earth: { bg: '#281e10', border: '#907040', text: '#d0a060', emoji: '\uD83C\uDF0D' },
};

// 後方互換のためにCをexportし続ける（デフォルトはライト）
export const C = lightTheme;

export const ELEMENT_COLORS = {
  Fire:  { bg: '#fff1ee', border: '#ffb3a0', text: '#c0392b', emoji: '\uD83D\uDD25' },
  Water: { bg: '#eef4ff', border: '#a0c4ff', text: '#1a5fa8', emoji: '\uD83D\uDCA7' },
  Wind:  { bg: '#eefff4', border: '#a0ffca', text: '#1a8a4a', emoji: '\uD83C\uDF2C' },
  Earth: { bg: '#fdf6ee', border: '#f0d0a0', text: '#8a5a1a', emoji: '\uD83C\uDF0D' },
};
```

#### 1-1-B. ThemeContext 作成

**新規ファイル**: `src/context/ThemeContext.js`

```js
import { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lightTheme, darkTheme,
  ELEMENT_COLORS, ELEMENT_COLORS_DARK,
} from '../theme';

const ThemeContext = createContext();
const STORAGE_KEY = 'oasis_dark_mode';

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  // 起動時にAsyncStorageから読み込み
  // useEffect(() => { ... }, []);

  const toggleTheme = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [isDark]);

  const colors = isDark ? darkTheme : lightTheme;
  const elementColors = isDark ? ELEMENT_COLORS_DARK : ELEMENT_COLORS;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors, elementColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

#### 1-1-C. 各画面の修正箇所

全画面で以下のパターンで修正する:
1. `import { C } from '../theme'` → `import { useTheme } from '../context/ThemeContext'`
2. 関数コンポーネント内で `const { colors: C, elementColors: ELEMENT_COLORS } = useTheme()`
3. StyleSheet.create の静的スタイルで `C.xxx` を使っている箇所は、インラインスタイルまたは `useMemo` で動的スタイルに変更

**修正対象ファイル一覧**:

| ファイル | 修正内容 |
|---------|---------|
| `App.js` | ThemeProvider でラップ、StatusBar を isDark で切替 |
| `src/screens/MeScreen.js` | 設定モーダルにダークモードトグル追加、全スタイルをテーマ対応 |
| `src/screens/TalkScreen.js` | 背景色・テキスト色・カード色をテーマ対応 |
| `src/screens/ResonanceScreen.js` | 同上 |
| `src/screens/AIChatScreen.js` | バブル色・入力欄をテーマ対応 |
| `src/screens/DMScreen.js` | 同上 |
| `src/screens/LoginScreen.js` | 背景・入力欄・ボタンをテーマ対応 |
| `src/screens/UserProfileScreen.js` | カード・テキスト・モーダルをテーマ対応 |
| `src/screens/AskAIScreen.js` | 同上 |
| `src/screens/TermsScreen.js` | テキスト・背景をテーマ対応 |
| `src/navigation/AppNavigator.js` | タブバー色・アイコン色をテーマ対応 |
| `src/components/RadarChart.js` | グリッド線色・データ色をテーマ対応 |
| `src/components/TraitBar.js` | バー色をテーマ対応 |
| `src/components/UserIcon.js` | アイコン背景・ボーダーをテーマ対応 |
| `src/components/EmptyCard.js` | カード背景・ボーダーをテーマ対応 |

#### 1-1-D. StatusBar 切替

`App.js` を以下のように修正:

```js
// App.js の return 内
<SafeAreaProvider>
  <StatusBar
    barStyle={isDark ? 'light-content' : 'dark-content'}
    backgroundColor={colors.bg}
  />
  <AppNavigator />
</SafeAreaProvider>
```

#### 1-1-E. 設定モーダルへのダークモードトグル追加

`MeScreen.js` の `SettingsModal` コンポーネント内に追加:

```jsx
<TouchableOpacity style={s.menuItem} onPress={toggleTheme}>
  <View style={s.menuIcon}>
    <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
  </View>
  <View style={{ flex: 1 }}>
    <Text style={s.menuLabel}>ダークモード</Text>
  </View>
  <View style={{
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: isDark ? C.p : C.bm,
    justifyContent: 'center',
    paddingHorizontal: 2,
  }}>
    <View style={{
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: '#fff',
      alignSelf: isDark ? 'flex-end' : 'flex-start',
    }} />
  </View>
</TouchableOpacity>
```

---

### 1-2. アプリアイコン + スプラッシュ

#### 1-2-A. 必要なアセットファイル

現在の `app.json` の設定:
- `icon`: `./assets/images/icon.png` (1024x1024 PNG)
- `android.adaptiveIcon.foregroundImage`: `./assets/images/android-icon-foreground.png` (1024x1024 PNG, 余白付き)
- `android.adaptiveIcon.backgroundImage`: `./assets/images/android-icon-background.png`
- `android.adaptiveIcon.monochromeImage`: `./assets/images/android-icon-monochrome.png`
- `splash-screen.image`: `./assets/images/splash-icon.png`

#### 1-2-B. PNG変換手順

1. デザインツール（Figma等）でOASISロゴを作成
2. 以下のサイズでPNG書き出し:
   - `icon.png`: 1024x1024px（角丸なし、iOS/Android共通）
   - `android-icon-foreground.png`: 1024x1024px（中央432x432pxにロゴ、周囲は透過）
   - `android-icon-background.png`: 1024x1024px（背景色 `#6a1fc8` のソリッド）
   - `android-icon-monochrome.png`: 1024x1024px（白黒版、Android 13+ テーマアイコン用）
   - `splash-icon.png`: 288x288px（スプラッシュ中央のロゴ）
   - `favicon.png`: 48x48px（Web用）

#### 1-2-C. app.json 設定（既に正しく設定済み）

現在の設定で問題なし。確認ポイント:
- `splash-screen.backgroundColor`: ライト `#fcfbff`、ダーク `#1a0a40` → 設定済み
- `android.adaptiveIcon.backgroundColor`: `#6a1fc8` → 設定済み

---

### 1-3. 共鳴タブUI改善（カード型 + 共鳴レベル右側）

#### 1-3-A. ResonanceScreen.js の変更

**現状**: リスト形式で `UserCard` を横一列に表示。スコアバッジは右端に円形で表示。

**変更後**: カード型UIに変更し、共鳴レベルのラベルを追加。

UserCard コンポーネントを以下のように変更:

```jsx
function UserCard({ user, personaData, profile, score, bestCategory, onPress }) {
  const elementInfo = personaData?.element_type ? ELEMENT_COLORS[personaData.element_type] : null;
  const displayName = profile?.display_name || user.name || 'ユーザー';

  // スコアに応じたレベルラベル
  const getLevel = (s) => {
    if (s >= 85) return { label: '最高の共鳴', color: '#e05050', bg: '#fff0f0' };
    if (s >= 70) return { label: '強い共鳴', color: '#d06020', bg: '#fff5ee' };
    if (s >= 55) return { label: '共鳴あり', color: C.p, bg: C.pp };
    return { label: 'ゆるい共鳴', color: C.tm, bg: '#f5f5f5' };
  };

  const level = score != null ? getLevel(score) : null;

  return (
    <TouchableOpacity style={st.cardContainer} onPress={onPress}>
      {/* 左: アイコン + 情報 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <UserIcon name={displayName} size={50} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={st.cardName} numberOfLines={1}>{displayName}</Text>
            {bestCategory ? <CategoryTag label={bestCategory} /> : null}
          </View>
          {personaData ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <Text style={st.cardType}>{personaData.persona_type}</Text>
              {elementInfo && (
                <Text style={{ fontSize: 10, color: elementInfo.text }}>
                  {elementInfo.emoji} {personaData.element_type}
                </Text>
              )}
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: C.tm, marginTop: 2 }}>分析中...</Text>
          )}
        </View>
      </View>

      {/* 右: スコア + レベルラベル */}
      {score != null && level ? (
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[st.scoreBadge, { backgroundColor: level.bg, borderColor: level.color + '30' }]}>
            <Text style={[st.scoreNum, { color: level.color }]}>{score}</Text>
            <Text style={[st.scorePct, { color: level.color }]}>%</Text>
          </View>
          <Text style={{ fontSize: 9, color: level.color, fontWeight: '500' }}>{level.label}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
```

カードスタイルの変更:

```js
cardContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  marginHorizontal: 16,
  marginBottom: 10,
  padding: 14,
  backgroundColor: '#fff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.bd,
  // shadow (iOS)
  shadowColor: '#6a1fc8',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  // shadow (Android)
  elevation: 2,
},
```

---

### 1-4. UI磨き（設定アイコン等）

#### 1-4-A. MeScreen 設定モーダルの改善

現在の設定モーダル (`SettingsModal`) には以下のメニューがある:
- プロフィール編集
- 通知設定（準備中）
- アカウント設定（準備中）
- 利用規約・プライバシー
- ログアウト

**改善項目**:

1. **設定アイコンをSVGに変更**: 現在は絵文字 `⚙️` だが、SVGの歯車アイコンに置き換えてデザインの一貫性を確保
2. **「準備中」ラベルの削除**: 未実装の機能は非表示にするか、Phase 2以降で実装されるものは先行UIを用意
3. **アカウント設定を有効化**: Phase 2のアカウント削除機能へのリンクとして使用
4. **バージョン表示追加**: モーダル下部に `OASIS v1.0.0` を表示

```jsx
// 設定モーダルの下部に追加
<Text style={{
  fontSize: 10, color: C.tm, textAlign: 'center',
  marginTop: 16,
}}>OASIS v1.0.0</Text>
```

#### 1-4-B. ヘッダーアイコンのSVG化

`MeScreen.js` のヘッダーの `⚙️` をSVGに変更:

```jsx
import Svg, { Path } from 'react-native-svg';

function GearIcon({ size = 15, color = C.t2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke={color} strokeWidth="1.5"
      />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={color} strokeWidth="1.5"
      />
    </Svg>
  );
}
```

---

### 1-5. ローディングスケルトン

#### 1-5-A. SkeletonLoader コンポーネント設計

**新規ファイル**: `src/components/SkeletonLoader.js`

```jsx
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// 基本スケルトンアイテム
function SkeletonItem({ width, height, borderRadius = 8, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width, height, borderRadius,
          backgroundColor: '#e8dfff', // C.bd
          opacity,
        },
        style,
      ]}
    />
  );
}

// プロフィールカード型スケルトン
export function ProfileSkeleton() {
  return (
    <View style={{ padding: 24, gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <SkeletonItem width={72} height={72} borderRadius={36} />
        <View style={{ gap: 8 }}>
          <SkeletonItem width={80} height={12} />
          <SkeletonItem width={120} height={16} />
          <SkeletonItem width={100} height={10} />
        </View>
      </View>
      <SkeletonItem width="100%" height={60} borderRadius={14} />
      <SkeletonItem width="100%" height={200} borderRadius={16} />
    </View>
  );
}

// チャットリスト型スケルトン
export function ChatListSkeleton({ count = 5 }) {
  return (
    <View style={{ gap: 0 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingHorizontal: 18, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: '#e8dfff',
        }}>
          <SkeletonItem width={46} height={46} borderRadius={23} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonItem width={100} height={14} />
            <SkeletonItem width="70%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ユーザーカード型スケルトン（共鳴タブ用）
export function UserCardSkeleton({ count = 4 }) {
  return (
    <View style={{ gap: 10, paddingTop: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          marginHorizontal: 16, padding: 14,
          backgroundColor: '#fff', borderRadius: 16,
          borderWidth: 1, borderColor: '#e8dfff',
        }}>
          <SkeletonItem width={50} height={50} borderRadius={25} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonItem width={120} height={14} />
            <SkeletonItem width={80} height={11} />
          </View>
          <SkeletonItem width={48} height={48} borderRadius={24} />
        </View>
      ))}
    </View>
  );
}

export default SkeletonItem;
```

#### 1-5-B. 適用画面リスト

| 画面 | スケルトン種類 | 適用タイミング |
|------|-------------|--------------|
| MeScreen | `ProfileSkeleton` | `loading === true` の初回読み込み時 |
| TalkScreen | `ChatListSkeleton` | フレンドリスト読み込み中 |
| ResonanceScreen | `UserCardSkeleton` | 検索実行中 |
| UserProfileScreen | `ProfileSkeleton` | プロフィールデータ読み込み中 |
| AIChatScreen | なし | 既存の `ActivityIndicator` を維持 |

---

### 1-6. Pull to Refresh

#### 1-6-A. RefreshControl 適用

React Native の `RefreshControl` を `ScrollView` に追加する。

**適用画面リスト**:

| 画面 | ScrollView 位置 | リフレッシュ関数 |
|------|---------------|--------------|
| MeScreen | メインScrollView | `loadData()` |
| TalkScreen | メインScrollView | `loadData()` |
| ResonanceScreen | メインScrollView | `doSearch()` |
| DMScreen | メッセージScrollView | `init()` (DM再読み込み) |

**実装パターン** (TalkScreenの例):

```jsx
import { RefreshControl } from 'react-native';

// state追加
const [refreshing, setRefreshing] = useState(false);

async function onRefresh() {
  setRefreshing(true);
  await loadData();
  setRefreshing(false);
}

// ScrollView に追加
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={C.p}
      colors={[C.p]}
    />
  }
>
```

---

### 1-7. エラーリトライUI

#### 1-7-A. ErrorRetry コンポーネント設計

**新規ファイル**: `src/components/ErrorRetry.js`

```jsx
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../theme';

export default function ErrorRetry({ message, onRetry }) {
  return (
    <View style={s.container}>
      <Text style={s.icon}>⚠</Text>
      <Text style={s.message}>{message || 'データの取得に失敗しました'}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
        <Text style={s.retryTxt}>再試行</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 40, paddingHorizontal: 24,
  },
  icon: { fontSize: 32, marginBottom: 12, color: C.tm },
  message: {
    fontSize: 13, color: C.t2, textAlign: 'center',
    lineHeight: 20, marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: C.p, borderRadius: 20,
  },
  retryTxt: { fontSize: 13, color: '#fff', fontWeight: '500' },
});
```

**適用箇所**: 各画面のcatch文でエラー状態を管理し、`loading` の代わりに `error` 状態で `ErrorRetry` を表示。

```jsx
const [error, setError] = useState(false);

// catch 内
setError(true);

// 表示
{error ? (
  <ErrorRetry message="読み込みに失敗しました" onRetry={() => { setError(false); loadData(); }} />
) : loading ? (
  <ProfileSkeleton />
) : (
  // 通常表示
)}
```

---

## Phase 2: 必須機能 Google Play要件（5項目）

### 2-1. アカウント削除

#### 2-1-A. Supabase側の処理

Google Play ポリシーではアプリ内からアカウント削除ができることが必須。

**新規API**: `api/delete-account.js`

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // 削除順序（外部キー制約を考慮）
    // 1. user_reports (reporter_id, reported_user_id)
    await supabase.from('user_reports')
      .delete().or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`);

    // 2. user_questions (target_user_id)
    await supabase.from('user_questions')
      .delete().eq('target_user_id', userId);

    // 3. direct_messages (sender_id, receiver_id)
    await supabase.from('direct_messages')
      .delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    // 4. group_messages (sender_id)
    await supabase.from('group_messages')
      .delete().eq('sender_id', userId);

    // 5. group_members (user_id)
    await supabase.from('group_members')
      .delete().eq('user_id', userId);

    // 6. friends (requester_id, receiver_id)
    await supabase.from('friends')
      .delete().or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    // 7. conversation_summaries (user_id)
    await supabase.from('conversation_summaries')
      .delete().eq('user_id', userId);

    // 8. ai_messages (user_id)
    await supabase.from('ai_messages')
      .delete().eq('user_id', userId);

    // 9. persona_data (user_id)
    await supabase.from('persona_data')
      .delete().eq('user_id', userId);

    // 10. profiles (id)
    await supabase.from('profiles')
      .delete().eq('id', userId);

    // 11. users (id)
    await supabase.from('users')
      .delete().eq('id', userId);

    // 12. Supabase Auth ユーザー削除
    await supabase.auth.admin.deleteUser(userId);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('delete account error:', error);
    res.status(500).json({ error: 'deletion failed' });
  }
}
```

#### 2-1-B. フロントエンド

**新規サービス関数**: `src/services/account.js`

```js
const API_URL = 'https://oasis-api-nine.vercel.app/api/delete-account';

export async function deleteAccount(userId) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

**UI**: MeScreen の設定モーダル「アカウント設定」から遷移するか、設定モーダル内にアカウント削除ボタンを追加。

削除フロー:
1. 「アカウントを削除」ボタンをタップ
2. Alert.alert で確認ダイアログ1回目: 「本当に削除しますか？全てのデータが失われます」
3. 確認後、テキスト入力で `DELETE` と入力させる2段階確認
4. 削除実行 → signOut → LoginScreen に戻る

```jsx
// 設定モーダル内
<TouchableOpacity style={s.menuItem} onPress={() => {
  onClose();
  Alert.alert(
    'アカウント削除',
    '全てのデータ（会話履歴、人格分析、フレンド情報）が完全に削除されます。この操作は取り消せません。',
    [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する', style: 'destructive',
        onPress: async () => {
          const ok = await deleteAccount(currentUserId);
          if (ok) {
            await signOut();
          } else {
            Alert.alert('エラー', '削除に失敗しました。時間をおいて再度お試しください。');
          }
        }
      },
    ]
  );
}}>
  <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>🗑️</Text></View>
  <Text style={[s.menuLabel, { color: '#e05050' }]}>アカウントを削除</Text>
</TouchableOpacity>
```

---

### 2-2. プライバシーポリシーWebページ

Google Play ではプライバシーポリシーのURLが必須。

#### 2-2-A. Vercel API設計

**新規ファイル**: `api/privacy.js`

```js
export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OASIS プライバシーポリシー</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; color: #1a0a40; line-height: 1.8; }
    h1 { color: #6a1fc8; font-size: 24px; }
    h2 { color: #6a1fc8; font-size: 18px; margin-top: 32px; }
    .date { color: #a498c0; font-size: 14px; }
  </style>
</head>
<body>
  <h1>OASIS プライバシーポリシー</h1>
  <p class="date">最終更新日：2026年3月27日</p>
  <!-- 内容はTermsScreen.jsのプライバシーポリシーセクションと同じ -->
  <h2>1. 収集する情報</h2>
  <p>メールアドレス（認証用）、プロフィール情報（名前、年齢、自己紹介など）、AIとの会話内容（人格分析に使用）、ダイレクトメッセージ</p>
  <!-- 以下TermsScreenの内容をHTML化 -->
</body>
</html>`);
}
```

**URL**: `https://oasis-api-nine.vercel.app/api/privacy`

このURLをGoogle Play Console のプライバシーポリシーURLに設定する。

---

### 2-3. 年齢確認（13歳未満制限）

#### 2-3-A. LoginScreen への追加UI

`signUp` 関数の実行前に年齢確認チェックボックスを追加する。

```jsx
// LoginScreen に state追加
const [ageConfirmed, setAgeConfirmed] = useState(false);

// アカウント作成ボタンの上に追加
<TouchableOpacity
  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}
  onPress={() => setAgeConfirmed(!ageConfirmed)}
>
  <View style={{
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1.5, borderColor: ageConfirmed ? C.p : C.bm,
    backgroundColor: ageConfirmed ? C.p : 'transparent',
    alignItems: 'center', justifyContent: 'center',
  }}>
    {ageConfirmed && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
  </View>
  <Text style={{ fontSize: 11, color: C.t2, flex: 1 }}>
    13歳以上であることを確認します
  </Text>
</TouchableOpacity>

// handleSignUp 関数の先頭に追加
if (!ageConfirmed) {
  setMsg('年齢確認にチェックを入れてください');
  setIsError(true);
  return;
}
```

---

### 2-4. メール認証

#### 2-4-A. Supabase Auth 設定

Supabase ダッシュボードで以下を設定:

1. **Authentication > Email Templates**:
   - Confirm signup テンプレートをカスタマイズ
   - Subject: 「OASIS - メールアドレスの確認」
   - Body: ブランドカラーを使ったHTML

2. **Authentication > Settings**:
   - `Enable email confirmations`: ON（既にONの可能性が高い）
   - `Minimum password length`: 6（既に設定済み）

3. **フロント側の対応**:
   - `signUp` 後にメール確認を促すメッセージを表示（既に実装済み: 「確認メールを送信しました。メールをご確認ください」）
   - 確認完了後に自動ログインされる（Supabase Authの標準動作）

現在の `LoginScreen.js` は既に確認メール送信後のメッセージ表示に対応しているため、追加修正は最小限。

#### 2-4-B. メール認証リマインダー（オプション）

ログイン時にメール未確認の場合のエラーハンドリング:

```js
async function handleSignIn() {
  // ... 既存のバリデーション
  const { error } = await signIn(email, password);
  if (error) {
    if (error.message?.includes('Email not confirmed')) {
      setMsg('メールアドレスが未確認です。確認メールをご確認ください。');
    } else {
      setMsg('ログインに失敗しました。メールアドレスとパスワードを確認してください');
    }
    setIsError(true);
  }
  setLoading(false);
}
```

---

### 2-5. パスワードリセット

#### 2-5-A. UIフロー

**LoginScreen.js に「パスワードをお忘れですか？」リンクを追加**:

```jsx
// ログインボタンとアカウント作成ボタンの間に追加
<TouchableOpacity onPress={handlePasswordReset} style={{ marginBottom: 10 }}>
  <Text style={{ fontSize: 12, color: C.p, textAlign: 'center' }}>
    パスワードをお忘れですか？
  </Text>
</TouchableOpacity>
```

**パスワードリセット関数**:

```js
async function handlePasswordReset() {
  if (!email) {
    setMsg('メールアドレスを入力してください');
    setIsError(true);
    return;
  }
  setLoading(true);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'oasis3://reset-password',
  });
  if (error) {
    setMsg('リセットメールの送信に失敗しました');
    setIsError(true);
  } else {
    setMsg('パスワードリセットメールを送信しました');
    setIsError(false);
  }
  setLoading(false);
}
```

`src/services/auth.js` に追加:

```js
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'oasis3://reset-password',
  });
  return { error };
}
```

---

## Phase 3: SNS基本機能（8項目）

### 3-1. プロフィールアイコン画像アップロード

#### 3-1-A. Supabase Storage 設定

Supabase ダッシュボードで:

1. **Storage > New bucket**:
   - Name: `avatars`
   - Public: ON
   - File size limit: 2MB
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

2. **RLS ポリシー**:
```sql
-- avatars バケットのアップロードポリシー
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 読み取りは全員可能
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 自分のアバターのみ更新可能
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 自分のアバターのみ削除可能
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### 3-1-B. 必要なライブラリ

```bash
npx expo install expo-image-picker expo-image-manipulator
```

- `expo-image-picker`: ギャラリー/カメラから画像選択
- `expo-image-manipulator`: リサイズ・クロップ

#### 3-1-C. アップロードサービス

**新規ファイル**: `src/services/avatar.js`

```js
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../supabase';

export async function pickAndUploadAvatar(userId) {
  // 画像選択
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) return null;

  // リサイズ（256x256に統一）
  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 256, height: 256 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  // アップロード
  const filename = `${userId}/avatar.jpg`;
  const response = await fetch(manipulated.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filename, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) return null;

  // Public URL取得
  const { data } = supabase.storage.from('avatars').getPublicUrl(filename);
  const avatarUrl = data.publicUrl + '?t=' + Date.now(); // キャッシュバスト

  // profiles テーブルに保存
  await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return avatarUrl;
}
```

#### 3-1-D. UserIcon コンポーネントの変更

`src/components/UserIcon.js` を画像対応に変更:

```jsx
import { Image, Text, View } from 'react-native';
import { C } from '../theme';

export default function UserIcon({ name = 'ユ', size = 72, avatarUrl }) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size, height: size, borderRadius: size / 2,
          borderWidth: 2, borderColor: C.bm,
        }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.pp, borderWidth: 2, borderColor: C.bm,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Text style={{ fontSize: size * 0.32, color: C.p, fontWeight: '500' }}>
        {name?.[0] || '?'}
      </Text>
    </View>
  );
}
```

---

### 3-2. フレンド追加（ID検索）

#### 3-2-A. ユニークID生成方式

`profiles` テーブルに `unique_id` カラムを追加する。

**SQL**:
```sql
ALTER TABLE profiles ADD COLUMN unique_id TEXT UNIQUE;

-- 既存ユーザーにIDを生成
UPDATE profiles SET unique_id = LOWER(SUBSTR(MD5(id::text), 1, 8))
WHERE unique_id IS NULL;

-- 新規ユーザー用トリガー（自動生成）
CREATE OR REPLACE FUNCTION generate_unique_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unique_id IS NULL THEN
    NEW.unique_id := LOWER(SUBSTR(MD5(NEW.id::text || NOW()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_unique_id
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION generate_unique_id();

-- インデックス
CREATE INDEX idx_profiles_unique_id ON profiles(unique_id);
```

ユニークIDは8文字の英数字（例: `a3f2b1c8`）。MeScreen のプロフィール欄に表示し、コピー可能にする。

#### 3-2-B. 検索UI

**新規画面**: `src/screens/FriendSearchScreen.js`

TalkScreen のメニューモーダル「フレンドを追加」から遷移。

```jsx
// 画面構成:
// - ヘッダー: 「フレンドを追加」+ 戻るボタン
// - 検索バー: ユニークID入力欄 + 検索ボタン
// - 検索結果: UserIcon + 名前 + タイプ名 + フレンド申請ボタン
// - 自分のID表示欄: 「あなたのID: a3f2b1c8」+ コピーボタン

export default function FriendSearchScreen() {
  const [searchId, setSearchId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSearch() {
    if (!searchId.trim()) return;
    setLoading(true);
    // profiles テーブルから unique_id で検索
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('unique_id', searchId.trim().toLowerCase())
      .single();
    setResult(data || null);
    setLoading(false);
  }

  // ... UI実装
}
```

**AppNavigator.js に追加**:
```jsx
<Stack.Screen name="FriendSearch" component={FriendSearchScreen}
  options={{ animation: 'slide_from_right' }} />
```

---

### 3-3. フレンド追加（QRコード）

#### 3-3-A. ライブラリ選定

```bash
npx expo install expo-barcode-scanner react-native-qrcode-svg
```

- `expo-barcode-scanner`: QRコードスキャン（Expo互換）
- `react-native-qrcode-svg`: QRコード生成（SVG）

注: Expo SDK 54 では `expo-camera` に QRスキャン機能が内蔵されているので、そちらを使う選択肢もある。

```bash
npx expo install expo-camera
```

#### 3-3-B. 画面設計

**新規画面**: `src/screens/QRScreen.js`

2つのタブ: 「マイQR」と「スキャン」

```jsx
export default function QRScreen() {
  const [tab, setTab] = useState('myqr'); // 'myqr' | 'scan'

  return (
    <SafeAreaView>
      {/* タブ切替 */}
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity onPress={() => setTab('myqr')}>
          <Text>マイQR</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('scan')}>
          <Text>スキャン</Text>
        </TouchableOpacity>
      </View>

      {tab === 'myqr' ? (
        // QRCodeSvg で oasis3://friend/{uniqueId} を表示
        <View style={{ alignItems: 'center' }}>
          <QRCode
            value={`oasis3://friend/${myUniqueId}`}
            size={200}
            color={C.p}
            backgroundColor="#fff"
          />
          <Text>ID: {myUniqueId}</Text>
        </View>
      ) : (
        // カメラでスキャン
        <CameraView
          onBarcodeScanned={({ data }) => {
            // oasis3://friend/{id} をパースしてフレンド申請
          }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
      )}
    </SafeAreaView>
  );
}
```

---

### 3-4. グループ作成

#### 3-4-A. グループ作成フロー

1. TalkScreen のメニュー「グループを作成」をタップ
2. `GroupCreateScreen` に遷移
3. フレンドリストからメンバーを選択（チェックボックス）
4. グループ名を入力
5. グループアイコンを選択（任意）
6. 「作成」ボタンで groups, group_members にinsert

**新規画面**: `src/screens/GroupCreateScreen.js`

```jsx
// 画面構成:
// - ヘッダー: 「グループを作成」
// - グループ名入力欄
// - フレンド選択リスト（チェックボックス付き）
// - 選択中メンバーの横スクロールプレビュー
// - 「作成」ボタン
```

#### 3-4-B. 既存テーブルの活用

`groups`, `group_members`, `group_messages` テーブルは作成済み。

**新規サービス**: `src/services/groups.js`

```js
import { supabase } from '../supabase';

export async function createGroup(name, creatorId, memberIds) {
  // 1. groups に insert
  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name, created_by: creatorId })
    .select('id')
    .single();

  if (error || !group) return null;

  // 2. 作成者 + メンバーを group_members に insert
  const members = [creatorId, ...memberIds].map(uid => ({
    group_id: group.id,
    user_id: uid,
    role: uid === creatorId ? 'admin' : 'member',
  }));

  await supabase.from('group_members').insert(members);

  return group.id;
}

export async function getMyGroups(userId) {
  const { data } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, created_at)')
    .eq('user_id', userId);
  return data || [];
}

export async function sendGroupMessage(groupId, senderId, content) {
  const { error } = await supabase
    .from('group_messages')
    .insert({ group_id: groupId, sender_id: senderId, content });
  return !error;
}

export async function loadGroupMessages(groupId, limit = 50) {
  const { data } = await supabase
    .from('group_messages')
    .select('id, sender_id, content, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return data || [];
}
```

**新規画面**: `src/screens/GroupChatScreen.js` (DMScreenと類似の構造)

---

### 3-5. フレンド申請動作確認

#### テスト項目

| # | テスト内容 | 確認方法 |
|---|----------|---------|
| 1 | フレンド申請送信 | UserProfileScreen の「フレンド申請」ボタン → friends テーブルに status='pending' のレコードが作成される |
| 2 | 受信側に通知表示 | TalkScreen のベルアイコンにバッジが表示される |
| 3 | 申請の承認 | 通知モーダルで「許可」→ status が 'accepted' に更新される |
| 4 | 申請の拒否 | 通知モーダルで「拒否」→ レコードが削除される |
| 5 | 承認後のフレンドリスト | TalkScreen のフレンドリストに相手が表示される |
| 6 | 重複申請の防止 | 既にpending/acceptedの相手に再度申請できないことを確認 |
| 7 | 自分自身への申請防止 | 自分のIDでフレンド申請できないことを確認 |
| 8 | ブロック済みユーザーへの申請 | ブロック中のユーザーにはフレンド申請ボタンが表示されないことを確認 |

---

### 3-6. 通知画面（アプリ内）

#### 3-6-A. NotificationScreen 設計

**新規テーブル**: `notifications`

```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'friend_request', 'friend_accepted', 'question_received', 'question_answered', 'group_invite'
  title TEXT NOT NULL,
  body TEXT,
  data JSONB, -- { fromUserId, friendshipId, questionId, groupId 等 }
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = false;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);
```

#### 3-6-B. 通知データ構造

```js
// 通知の型定義
{
  id: 'uuid',
  user_id: 'uuid',
  type: 'friend_request' | 'friend_accepted' | 'question_received' | 'question_answered' | 'group_invite',
  title: 'おますさんからフレンドリクエスト',
  body: null,
  data: { fromUserId: 'uuid', friendshipId: 'uuid' },
  read: false,
  created_at: '2026-03-27T...'
}
```

**新規画面**: `src/screens/NotificationScreen.js`

**新規サービス**: `src/services/notifications.js`

```js
import { supabase } from '../supabase';

export async function getNotifications(userId, limit = 50) {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getUnreadCount(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count || 0;
}

export async function markAsRead(notificationId) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
}

export async function markAllAsRead(userId) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}
```

---

### 3-7. 通知バッジ（未読数）

#### 3-7-A. タブアイコンへのバッジ表示

`AppNavigator.js` の TabNavigator を修正:

```jsx
// NotificationBadge コンテキスト
import { createContext, useContext, useState, useEffect } from 'react';

// AppNavigator 内で未読数を管理
function TabNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 初回読み込み
    loadUnreadCount();
    // Supabase Realtime で通知テーブルを監視
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
      }, () => {
        loadUnreadCount();
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  return (
    <Tab.Navigator ...>
      <Tab.Screen
        name="トーク"
        component={TalkScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon focused={focused} SvgIcon={IconTalk} label="トーク" />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute', top: 0, right: -6,
                  width: 16, height: 16, borderRadius: 8,
                  backgroundColor: '#e05050',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
```

#### 3-7-B. リアルタイム更新方式

Supabase Realtime の Postgres Changes を使用:

```js
const subscription = supabase
  .channel('user-notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      setUnreadCount(prev => prev + 1);
    }
  )
  .subscribe();
```

---

### 3-8. 招待機能

#### Share API 活用

```jsx
import { Share } from 'react-native';

async function handleInvite() {
  try {
    await Share.share({
      message: `OASISであなたの人格タイプを発見しよう！\n\nAIとの会話で人格が分析され、他のユーザーとの共鳴（相性）が分かります。\n\nダウンロード: https://play.google.com/store/apps/details?id=com.omasu.oasis`,
      title: 'OASIS - ありのままの自分を知る',
    });
  } catch (e) {
    // ユーザーがキャンセル
  }
}
```

**招待リンク形式**: `https://play.google.com/store/apps/details?id=com.omasu.oasis`

ResonanceScreen のユーザーが少ない場合に招待リンクを表示:

```jsx
{users.length === 0 && !loading && (
  <View style={st.emptyArea}>
    <Text style={{ fontSize: 36, marginBottom: 12 }}>🌊</Text>
    <Text style={st.emptyTitle}>まだユーザーが少ないです</Text>
    <Text style={st.emptySub}>友達を招待して共鳴を体験しましょう</Text>
    <TouchableOpacity style={st.inviteBtn} onPress={handleInvite}>
      <Text style={st.inviteBtnTxt}>友達を招待する</Text>
    </TouchableOpacity>
  </View>
)}
```

---

## Phase 4: DM・コミュニケーション強化（5項目）

### 4-1. 既読表示

#### 4-1-A. DBスキーマ変更

```sql
ALTER TABLE direct_messages ADD COLUMN read_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX idx_dm_read ON direct_messages(receiver_id, read_at)
WHERE read_at IS NULL;
```

#### 4-1-B. サービス変更

`src/services/dm.js` に追加:

```js
// メッセージを既読にする
export async function markDMsAsRead(userId, senderId) {
  await supabase
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('receiver_id', userId)
    .eq('sender_id', senderId)
    .is('read_at', null);
}

// 未読メッセージ数を取得
export async function getUnreadDMCount(userId) {
  const { count } = await supabase
    .from('direct_messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .is('read_at', null);
  return count || 0;
}
```

#### 4-1-C. DMScreen の変更

- 画面表示時に `markDMsAsRead` を呼び出し
- 各メッセージの下に既読状態を表示（自分が送ったメッセージのみ）

```jsx
// 自分のメッセージに既読表示
{isMe && m.read_at && (
  <Text style={{ fontSize: 9, color: C.tm, textAlign: 'right' }}>既読</Text>
)}
```

---

### 4-2. 入力中インジケーター

#### 4-2-A. Supabase Realtime 活用

Supabase Realtime の Presence 機能を使用:

```js
// DMScreen内
const channelRef = useRef(null);

useEffect(() => {
  // チャンネル作成
  const channel = supabase.channel(`dm:${[currentUser.id, friendId].sort().join('-')}`);

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      // 相手が typing: true を送信しているか確認
      const friendState = Object.values(state).flat().find(
        s => s.userId === friendId && s.typing
      );
      setFriendTyping(!!friendState);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId: currentUser.id, typing: false });
      }
    });

  channelRef.current = channel;
  return () => { channel.unsubscribe(); };
}, []);

// 入力状態の更新
function handleTextChange(text) {
  setInput(text);
  channelRef.current?.track({ userId: currentUser.id, typing: text.length > 0 });
  // 3秒後に自動でtyping: false
  clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    channelRef.current?.track({ userId: currentUser.id, typing: false });
  }, 3000);
}
```

UI表示:

```jsx
{friendTyping && (
  <View style={{ paddingHorizontal: 18, paddingBottom: 4 }}>
    <Text style={{ fontSize: 11, color: C.tm }}>{friendName}が入力中...</Text>
  </View>
)}
```

---

### 4-3. DM内画像送信

#### 4-3-A. Storage + メッセージ種別追加

```sql
ALTER TABLE direct_messages ADD COLUMN message_type TEXT DEFAULT 'text';
-- message_type: 'text' | 'image'

ALTER TABLE direct_messages ADD COLUMN image_url TEXT;
```

#### 4-3-B. 画像送信フロー

```js
// src/services/dm.js に追加
export async function sendImageDM(senderId, receiverId, imageUri) {
  // 1. 画像をリサイズ
  // 2. Supabase Storage にアップロード（dm-images バケット）
  const filename = `${senderId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('dm-images')
    .upload(filename, blob, { contentType: 'image/jpeg' });

  if (error) return false;

  const { data } = supabase.storage.from('dm-images').getPublicUrl(filename);

  // 3. direct_messages に insert
  await supabase.from('direct_messages').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    content: '',
    message_type: 'image',
    image_url: data.publicUrl,
  });

  return true;
}
```

DMScreen の入力欄に画像添付ボタンを追加:

```jsx
<TouchableOpacity
  style={{ padding: 8 }}
  onPress={async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      await sendImageDM(currentUser.id, friendId, result.assets[0].uri);
    }
  }}
>
  <Text style={{ fontSize: 20, color: C.p }}>📷</Text>
</TouchableOpacity>
```

---

### 4-4. 最終オンライン表示

#### 4-4-A. DBスキーマ変更

```sql
ALTER TABLE users ADD COLUMN last_online_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX idx_users_last_online ON users(last_online_at);
```

#### 4-4-B. オンライン状態の更新

`App.js` でアプリがフォアグラウンドにある間、定期的に `last_online_at` を更新:

```js
import { AppState } from 'react-native';

// App.js内
useEffect(() => {
  const interval = setInterval(async () => {
    if (AppState.currentState === 'active' && session) {
      await supabase
        .from('users')
        .update({ last_online_at: new Date().toISOString() })
        .eq('id', session.user.id);
    }
  }, 60000); // 1分ごとに更新

  return () => clearInterval(interval);
}, [session]);
```

#### 4-4-C. 表示

DMScreen ヘッダーやUserProfileScreen に表示:

```js
function formatLastOnline(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 300000) return 'オンライン'; // 5分以内
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
  return `${Math.floor(diff / 86400000)}日前`;
}
```

---

### 4-5. プロフィールリンク共有

#### 4-5-A. ディープリンク設計

`app.json` の `scheme: "oasis3"` を活用。

**リンク形式**: `oasis3://profile/{uniqueId}`

**Expo Linking でハンドリング**:

```js
// App.js または AppNavigator.js
import * as Linking from 'expo-linking';

useEffect(() => {
  const handleDeepLink = ({ url }) => {
    const parsed = Linking.parse(url);
    if (parsed.path === 'profile' && parsed.queryParams?.id) {
      // UserProfileScreen に遷移
      navigation.navigate('UserProfile', { userId: parsed.queryParams.id });
    }
    if (parsed.path === 'friend' && parsed.queryParams?.id) {
      // FriendSearchScreen でID検索
      navigation.navigate('FriendSearch', { searchId: parsed.queryParams.id });
    }
  };

  const subscription = Linking.addEventListener('url', handleDeepLink);
  return () => subscription.remove();
}, []);
```

**NavigationContainer にlinking設定を追加**:

```jsx
const linking = {
  prefixes: ['oasis3://'],
  config: {
    screens: {
      Main: {
        screens: { /* tabs */ },
      },
      UserProfile: 'profile/:userId',
      FriendSearch: 'friend/:searchId',
    },
  },
};

<NavigationContainer linking={linking}>
```

---

## Phase 5: 体験向上（10項目）

### 5-1. 詳細レポート画面（シェア機能）

#### 5-1-A. PersonalityReportScreen 設計

**新規画面**: `src/screens/PersonalityReportScreen.js`

**必要ライブラリ**:
```bash
npx expo install react-native-view-shot expo-sharing
```

画面構成:
- レポートヘッダー（ロゴ + ユーザー名 + 日付）
- 人格タイプカード（タイプ名 + エレメント + 説明）
- レーダーチャート（RadarChart再利用）
- 5軸スコア詳細
- 深層分析サマリー（相性、価値観、愛着、ストレス、エネルギー、思考）
- 「シェアする」ボタン

**シェア機能**:

```js
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const reportRef = useRef();

async function handleShare() {
  try {
    const uri = await captureRef(reportRef, {
      format: 'png',
      quality: 1,
    });
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'OASISレポートをシェア',
    });
  } catch (e) {
    Alert.alert('エラー', 'シェアに失敗しました');
  }
}
```

---

### 5-2. オンボーディング画面

**新規画面**: `src/screens/OnboardingScreen.js`

3-4スライドのページビュー:

| スライド | タイトル | 内容 | ビジュアル |
|---------|---------|------|----------|
| 1 | AIと会話しよう | AIと自然に話すだけ。あなたの性格が浮かび上がります。 | チャット画面のイラスト |
| 2 | 人格が見える | 5つの軸であなたの人格を可視化。32タイプの中からあなたのタイプが判明。 | レーダーチャートのイラスト |
| 3 | 共鳴を発見 | 相性の良い人を見つけて、新しいつながりを。 | 共鳴スコアのイラスト |
| 4 | はじめよう | 「まずAIと10回話してみよう」ボタン | CTAボタン |

**表示条件**: AsyncStorageに `onboarding_done` が無い場合のみ表示。

```js
// App.js で制御
const [onboarded, setOnboarded] = useState(null);

useEffect(() => {
  AsyncStorage.getItem('oasis_onboarding_done').then(val => {
    setOnboarded(val === 'true');
  });
}, []);

// session あり + onboarding 未完了 → OnboardingScreen
// session あり + onboarding 完了 → AppNavigator
```

---

### 5-3. プッシュ通知

#### 5-3-A. Expo Notifications 設定

```bash
npx expo install expo-notifications expo-device
```

**app.json に追加**:
```json
{
  "expo": {
    "plugins": [
      "expo-notifications"
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

**トークン登録**: `src/services/pushNotification.js`

```js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '../supabase';

export async function registerForPushNotifications(userId) {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: '42b75a0b-7df2-4f76-aa9f-80c9095b1d16',
  })).data;

  // DBに保存
  await supabase.from('push_tokens').upsert({
    user_id: userId,
    token,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}
```

#### 5-3-B. 新規テーブル

```sql
CREATE TABLE push_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  token TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5-3-C. Supabase Edge Function

**新規ファイル**: Supabase Edge Function `send-push-notification`

トリガー: `notifications` テーブルへのINSERT時

```sql
-- Database Webhook or Trigger
CREATE OR REPLACE FUNCTION notify_push()
RETURNS TRIGGER AS $$
BEGIN
  -- Edge Functionを呼び出し（pg_net拡張利用）
  PERFORM net.http_post(
    url := 'https://zuyhhygoqxkbzcdzoxch.supabase.co/functions/v1/send-push',
    body := json_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.body
    )::text,
    headers := json_build_object('Content-Type', 'application/json')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_notification_insert
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION notify_push();
```

---

### 5-4. 会話履歴管理

MeScreen の設定モーダルまたは専用画面で以下を提供:

- 会話履歴の閲覧（AIChatScreenの過去ログ）
- 会話履歴のエクスポート（テキスト形式）
- 会話履歴のリセット（全削除）

**新規画面**: `src/screens/ChatHistoryScreen.js`

```jsx
// 日付ごとにグルーピングされた会話一覧
// 各日をタップ → その日の会話を展開表示
// 「全削除」ボタン（確認ダイアログ付き）
```

---

### 5-5. 分析変化トラッキング

#### 5-5-A. persona_history テーブル設計

```sql
CREATE TABLE persona_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  depth INTEGER,
  will INTEGER,
  action INTEGER,
  resonance INTEGER,
  stability INTEGER,
  persona_type TEXT,
  element_type TEXT,
  conversation_count INTEGER,
  analyzed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_persona_history_user ON persona_history(user_id, analyzed_at DESC);
```

`api/chat.js` の人格分析後に履歴を保存:

```js
// analyzePersonality 成功後に追加
await supabase.from('persona_history').insert({
  user_id: userId,
  depth: result.depth,
  will: result.will,
  action: result.action,
  resonance: result.resonance,
  stability: result.stability,
  persona_type: result.persona_type,
  element_type: result.element_type,
  conversation_count: count,
});
```

MeScreen に「変化の推移」セクションを追加:
- 折れ線グラフで5軸の時系列変化を表示
- ライブラリ: `react-native-chart-kit` または `victory-native`

---

### 5-6. 通知設定（個別ON/OFF）

**新規テーブル**:

```sql
CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  friend_request BOOLEAN DEFAULT true,
  dm_received BOOLEAN DEFAULT true,
  question_received BOOLEAN DEFAULT true,
  analysis_complete BOOLEAN DEFAULT true,
  weekly_report BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

MeScreen の設定モーダル → 「通知設定」画面:

```jsx
// 各項目のスイッチ
<View style={s.settingRow}>
  <Text>フレンドリクエスト</Text>
  <Switch value={settings.friend_request} onValueChange={...} />
</View>
```

---

### 5-7. 振動フィードバック（Haptics）

`expo-haptics` は既にpackage.jsonに含まれている。

適用箇所:

| アクション | Haptics種類 |
|-----------|-----------|
| メッセージ送信 | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` |
| フレンド申請承認 | `Haptics.notificationAsync(NotificationFeedbackType.Success)` |
| ボタンタップ | `Haptics.selectionAsync()` |
| エラー発生 | `Haptics.notificationAsync(NotificationFeedbackType.Error)` |
| Pull to Refresh | `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` |

```js
import * as Haptics from 'expo-haptics';

// 例: 送信ボタン
async function handleSend() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // ... 既存処理
}
```

---

### 5-8. チュートリアル/ツールチップ

初回表示時のみツールチップを表示する仕組み:

**新規コンポーネント**: `src/components/Tooltip.js`

```jsx
export default function Tooltip({ visible, text, position, onDismiss }) {
  if (!visible) return null;
  return (
    <TouchableOpacity
      style={[s.tooltip, position]}
      onPress={onDismiss}
    >
      <View style={s.arrow} />
      <Text style={s.tooltipText}>{text}</Text>
    </TouchableOpacity>
  );
}
```

AsyncStorage で表示済みフラグを管理:

```js
const TIPS = {
  me_radar: 'AIと10回話すとレーダーが表示されます',
  talk_ai: 'ここからAIと会話できます',
  resonance_search: '他のユーザーを検索して共鳴を発見しましょう',
};
```

---

### 5-9. 週次レポート通知

Supabase の Cron Job (pg_cron) を使用:

```sql
-- pg_cron で毎週月曜 9:00 JST に実行
SELECT cron.schedule(
  'weekly-report',
  '0 0 * * 1', -- UTC 0:00 = JST 9:00
  $$
  INSERT INTO notifications (user_id, type, title, body)
  SELECT
    u.id,
    'weekly_report',
    '週次レポート',
    '今週の会話: ' || COALESCE(msg_count.cnt, 0) || '回'
  FROM auth.users u
  LEFT JOIN (
    SELECT user_id, COUNT(*) as cnt
    FROM ai_messages
    WHERE role = 'user'
    AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY user_id
  ) msg_count ON msg_count.user_id = u.id;
  $$
);
```

---

### 5-10. 共鳴マッチ通知

新しいユーザーが登録し人格分析が完了した時、共鳴スコア75%以上のユーザーに通知を送る。

`api/chat.js` の人格分析完了後に追加:

```js
// 人格分析完了後
if (result) {
  // 高共鳴ユーザーを検出して通知
  const { data: otherPersonas } = await supabase
    .from('persona_data')
    .select('user_id, depth, will, action, resonance, stability')
    .neq('user_id', userId);

  for (const other of (otherPersonas || [])) {
    const score = calcScore(result, other); // サーバーサイドスコア計算
    if (score >= 75) {
      await supabase.from('notifications').insert({
        user_id: other.user_id,
        type: 'resonance_match',
        title: '高い共鳴を発見！',
        body: `共鳴スコア${score}%のユーザーが見つかりました`,
        data: { matchUserId: userId, score },
      });
    }
  }
}
```

---

## Phase 6: リリース（4項目）

### 6-1. APIキープラン変更

開発中: Gemini 2.5 Flash 無料枠
リリース時: Gemini API 有料プラン + Claude API（スタンダード以上のプラン向け）

#### 環境変数の追加（Vercel）

```
GEMINI_API_KEY=<有料プランキー>
CLAUDE_API_KEY=<Claude APIキー>
```

#### api/chat.js の変更

ユーザープランに応じてモデルを切り替え:

```js
// ユーザーのプランを取得
const { data: userPlan } = await supabase
  .from('user_subscriptions')
  .select('plan')
  .eq('user_id', userId)
  .single();

const plan = userPlan?.plan || 'free';

// プランに応じたモデル選択
if (plan === 'premium') {
  // Claude Sonnet で応答
} else if (plan === 'standard') {
  // 分析のみClaude、チャットはGemini
} else {
  // Gemini Flash（無料枠）
}
```

**新規テーブル**:

```sql
CREATE TABLE user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  plan TEXT DEFAULT 'free', -- 'free', 'standard', 'premium'
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  daily_count INTEGER DEFAULT 0,
  daily_reset_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 6-2. EAS本番ビルド

```bash
# EAS CLI インストール
npm install -g eas-cli

# eas.json 設定（プロジェクトルートに作成）
```

**新規ファイル**: `eas.json`

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

ビルドコマンド:

```bash
# プレビュービルド（APK）
eas build --platform android --profile preview

# 本番ビルド（AAB）
eas build --platform android --profile production
```

---

### 6-3. Google Play 申請

#### 必要な準備物

| 項目 | 内容 |
|------|------|
| Google Play Developer アカウント | $25 登録料 |
| アプリ名 | OASIS |
| 短い説明 | AIと会話して自分の人格を発見。他のユーザーとの共鳴を体験しよう。 |
| 詳しい説明 | 機能説明文（4000文字以内） |
| スクリーンショット | 最低2枚（1080x1920推奨）、最大8枚 |
| フィーチャーグラフィック | 1024x500px |
| プライバシーポリシーURL | https://oasis-api-nine.vercel.app/api/privacy |
| コンテンツレーティング | IARC アンケート回答 |
| ターゲットオーディエンス | 18歳以上 |
| アプリカテゴリ | ソーシャル |
| アプリ内購入 | あり（Phase 6以降） |

#### データセーフティセクション

| データ種類 | 収集 | 共有 | 目的 |
|-----------|------|------|------|
| メールアドレス | Yes | No | アカウント管理 |
| 名前 | Yes | Yes (他ユーザー) | ソーシャル機能 |
| メッセージ | Yes | No | AI分析、DM |
| 分析結果 | Yes | Yes (他ユーザー) | 共鳴スコア |

---

### 6-4. アプリ更新促進機能

**新規API**: `api/version.js`

```js
export default function handler(req, res) {
  res.status(200).json({
    latestVersion: '1.0.0',
    minVersion: '1.0.0',
    updateUrl: 'https://play.google.com/store/apps/details?id=com.omasu.oasis',
    forceUpdate: false,
  });
}
```

`App.js` で起動時にバージョンチェック:

```js
import Constants from 'expo-constants';

useEffect(() => {
  checkForUpdate();
}, []);

async function checkForUpdate() {
  try {
    const res = await fetch('https://oasis-api-nine.vercel.app/api/version');
    const data = await res.json();
    const currentVersion = Constants.expoConfig.version;

    if (data.forceUpdate && currentVersion < data.minVersion) {
      Alert.alert(
        'アップデートが必要です',
        '新しいバージョンが利用可能です。アップデートしてください。',
        [{ text: 'アップデート', onPress: () => Linking.openURL(data.updateUrl) }],
        { cancelable: false }
      );
    }
  } catch {}
}
```

---

## DBスキーマ変更一覧

全Phaseで必要なテーブル作成・変更SQLをまとめる。

### 新規テーブル

```sql
-- Phase 3-6: 通知
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = false;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Phase 5-3: プッシュ通知トークン
CREATE TABLE push_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  token TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 5-5: 分析履歴
CREATE TABLE persona_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  depth INTEGER,
  will INTEGER,
  action INTEGER,
  resonance INTEGER,
  stability INTEGER,
  persona_type TEXT,
  element_type TEXT,
  conversation_count INTEGER,
  analyzed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_persona_history_user ON persona_history(user_id, analyzed_at DESC);

-- Phase 5-6: 通知設定
CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  friend_request BOOLEAN DEFAULT true,
  dm_received BOOLEAN DEFAULT true,
  question_received BOOLEAN DEFAULT true,
  analysis_complete BOOLEAN DEFAULT true,
  weekly_report BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 6-1: サブスクリプション
CREATE TABLE user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  plan TEXT DEFAULT 'free',
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  daily_count INTEGER DEFAULT 0,
  daily_reset_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 既存テーブルの変更

```sql
-- Phase 3-2: ユニークID
ALTER TABLE profiles ADD COLUMN unique_id TEXT UNIQUE;
UPDATE profiles SET unique_id = LOWER(SUBSTR(MD5(id::text), 1, 8)) WHERE unique_id IS NULL;
CREATE INDEX idx_profiles_unique_id ON profiles(unique_id);

-- unique_id 自動生成トリガー
CREATE OR REPLACE FUNCTION generate_unique_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unique_id IS NULL THEN
    NEW.unique_id := LOWER(SUBSTR(MD5(NEW.id::text || NOW()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_unique_id BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION generate_unique_id();

-- Phase 4-1: DM既読
ALTER TABLE direct_messages ADD COLUMN read_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX idx_dm_read ON direct_messages(receiver_id, read_at) WHERE read_at IS NULL;

-- Phase 4-3: DM画像送信
ALTER TABLE direct_messages ADD COLUMN message_type TEXT DEFAULT 'text';
ALTER TABLE direct_messages ADD COLUMN image_url TEXT;

-- Phase 4-4: 最終オンライン
ALTER TABLE users ADD COLUMN last_online_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX idx_users_last_online ON users(last_online_at);
```

### Storage バケット

```
-- Phase 3-1: avatars バケット（Public, 2MB上限, image/jpeg, image/png, image/webp）
-- Phase 4-3: dm-images バケット（Public, 5MB上限, image/jpeg, image/png）
```

---

## 新規ファイル一覧

```
src/
  context/
    ThemeContext.js                    # Phase 1-1: テーマコンテキスト

  screens/
    FriendSearchScreen.js             # Phase 3-2: フレンドID検索
    QRScreen.js                       # Phase 3-3: QRコード表示/スキャン
    GroupCreateScreen.js              # Phase 3-4: グループ作成
    GroupChatScreen.js                # Phase 3-4: グループチャット
    NotificationScreen.js             # Phase 3-6: 通知一覧
    PersonalityReportScreen.js        # Phase 5-1: 詳細レポート
    OnboardingScreen.js               # Phase 5-2: オンボーディング
    ChatHistoryScreen.js              # Phase 5-4: 会話履歴管理
    NotificationSettingsScreen.js     # Phase 5-6: 通知設定

  services/
    account.js                        # Phase 2-1: アカウント削除
    avatar.js                         # Phase 3-1: アバターアップロード
    groups.js                         # Phase 3-4: グループ機能
    notifications.js                  # Phase 3-6: 通知サービス
    pushNotification.js               # Phase 5-3: プッシュ通知

  components/
    SkeletonLoader.js                 # Phase 1-5: スケルトンローダー
    ErrorRetry.js                     # Phase 1-7: エラーリトライ
    Tooltip.js                        # Phase 5-8: ツールチップ

api/
  delete-account.js                   # Phase 2-1: アカウント削除API
  privacy.js                          # Phase 2-2: プライバシーポリシーHTML
  version.js                          # Phase 6-4: バージョンチェックAPI

eas.json                              # Phase 6-2: EASビルド設定
```

---

## 既存ファイル変更一覧

| ファイル | Phase | 変更概要 |
|---------|-------|---------|
| `src/theme.js` | 1-1 | ダークテーマパレット追加、lightTheme/darkTheme export |
| `App.js` | 1-1, 4-4, 5-2, 5-3, 6-4 | ThemeProvider追加、StatusBar切替、オンボーディング分岐、last_online_at更新、バージョンチェック |
| `app.json` | 1-2, 5-3 | アイコンパス確認、expo-notifications plugin追加 |
| `package.json` | 3-1, 3-3, 5-1, 5-3 | expo-image-picker, expo-image-manipulator, expo-camera, react-native-qrcode-svg, react-native-view-shot, expo-sharing, expo-notifications, expo-device 追加 |
| `src/navigation/AppNavigator.js` | 1-1, 3-2, 3-3, 3-4, 3-6, 3-7, 4-5, 5-1, 5-2, 5-4, 5-6 | テーマ対応、新画面のStackScreen追加、タブバッジ追加、deep linking設定 |
| `src/screens/MeScreen.js` | 1-1, 1-4, 1-5, 1-6, 2-1, 3-1, 5-5, 5-7 | テーマ対応、設定アイコンSVG化、スケルトン追加、Pull to Refresh、アカウント削除UI、アバター対応、分析履歴リンク、Haptics |
| `src/screens/TalkScreen.js` | 1-1, 1-5, 1-6, 3-4, 3-7, 5-7 | テーマ対応、スケルトン追加、Pull to Refresh、グループリスト表示、未読バッジ、Haptics |
| `src/screens/ResonanceScreen.js` | 1-1, 1-3, 1-5, 1-6, 3-8, 5-7 | テーマ対応、カード型UI変更、スケルトン追加、Pull to Refresh、招待機能、Haptics |
| `src/screens/AIChatScreen.js` | 1-1, 1-7, 5-7 | テーマ対応、エラーリトライ、Haptics |
| `src/screens/DMScreen.js` | 1-1, 1-6, 4-1, 4-2, 4-3, 5-7 | テーマ対応、Pull to Refresh、既読表示、入力中インジケーター、画像送信ボタン、Haptics |
| `src/screens/LoginScreen.js` | 1-1, 2-3, 2-4, 2-5 | テーマ対応、年齢確認チェックボックス、メール確認エラー対応、パスワードリセットリンク |
| `src/screens/UserProfileScreen.js` | 1-1, 1-5, 4-4, 4-5, 5-7 | テーマ対応、スケルトン追加、最終オンライン表示、プロフィールリンク共有、Haptics |
| `src/screens/AskAIScreen.js` | 1-1, 5-7 | テーマ対応、Haptics |
| `src/screens/TermsScreen.js` | 1-1 | テーマ対応 |
| `src/components/RadarChart.js` | 1-1 | テーマ対応（グリッド色・データ色） |
| `src/components/TraitBar.js` | 1-1 | テーマ対応（バー色） |
| `src/components/UserIcon.js` | 1-1, 3-1 | テーマ対応、avatarUrl prop追加・画像表示 |
| `src/components/EmptyCard.js` | 1-1 | テーマ対応 |
| `src/services/auth.js` | 2-5 | resetPassword関数追加 |
| `src/services/dm.js` | 4-1, 4-3 | markDMsAsRead、getUnreadDMCount、sendImageDM 追加 |
| `src/services/profile.js` | 3-1, 3-2 | avatar_url対応、unique_id取得 |
| `src/services/friends.js` | 3-5 | 重複申請防止、ブロック済みチェック |
| `src/supabase.js` | なし | 変更なし |
| `src/constants.js` | なし | 変更なし（API_URLはそのまま） |
| `api/chat.js` | 5-5, 5-10, 6-1 | persona_history保存、共鳴マッチ通知、プラン別モデル切替 |
| `api/ask.js` | 6-1 | プラン別モデル切替（オプション） |

---

## 実装優先度サマリー

| 優先度 | Phase | 推定工数 | 依存関係 |
|-------|-------|---------|---------|
| 最高 | Phase 2 (Google Play要件) | 3-4日 | なし |
| 高 | Phase 1-2 (アイコン+スプラッシュ) | 1日 | アセット準備 |
| 高 | Phase 1-1 (ダークモード) | 3-4日 | なし |
| 高 | Phase 3-1 (アバター) | 1-2日 | Supabase Storage設定 |
| 高 | Phase 3-2, 3-3 (フレンド追加) | 2-3日 | profiles.unique_id |
| 中 | Phase 1-3~1-7 (UI改善) | 2-3日 | なし |
| 中 | Phase 3-4~3-8 (SNS機能) | 4-5日 | Phase 3-1~3-3 |
| 中 | Phase 4 (DM強化) | 3-4日 | Phase 3 |
| 低 | Phase 5 (体験向上) | 7-10日 | Phase 1-4 |
| 最後 | Phase 6 (リリース) | 3-5日 | Phase 1-5 全完了 |

**合計推定工数**: 約30-40日（ソロ開発、1日4-6時間として）
