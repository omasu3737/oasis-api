# OASIS - Claude Code Guidelines

## プロジェクト概要
AI人格分析×ソーシャルアプリ。React Native + Expo SDK54 + Supabase + Vercel serverless。

## 技術スタック
- **Frontend**: React Native + Expo SDK54
- **Navigation**: @react-navigation/native-stack + bottom-tabs
- **DB**: Supabase (PostgreSQL + pgvector + RLS)
- **API**: Vercel serverless (api/chat.js, api/ask.js, api/delete-account.js)
- **AI**: Gemini 2.5 Flash (開発中) → ハイブリッド (リリース時)
- **認証**: Supabase Auth (JWT)

## ファイル構成ルール
- `src/screens/` = 全画面コンポーネント（最新版）
- `src/services/` = Supabaseアクセス層
- `src/components/` = 再利用コンポーネント
- `src/navigation/` = ナビゲーション設定
- `src/i18n/` = 多言語対応 (ja.js / en.js)
- `api/` = Vercel serverless functions
- ルート直下の古いファイルは無視すること

## コーディング規約

### スタイル
- StyleSheetは必ず `function getStyles(C)` 形式で定義する
- `const C = colors` でテーマカラーを受け取る
- ハードコードの色は禁止。必ずC.xxxを使う
- ダークモード対応を常に意識する

### テーマカラー（colors オブジェクト）
```
bg: 背景色
card: カード背景
bm: ボーダー・区切り線
t1: メインテキスト
t2: サブテキスト
pp: プライマリパープル
tint: アクセントカラー
```

### i18n（多言語対応）
- UIに表示する文字列は必ず `t('key')` を使う
- ハードコードの日本語文字列は禁止
- 新しいキーを追加したら ja.js と en.js 両方に追記する

### セキュリティ
- APIエンドポイントは必ずJWT認証を確認する
- ユーザーIDはauth.uid()から取得する（クライアント送信値を信用しない）
- エラーメッセージに内部情報を含めない
- 入力値は必ずサニタイズする

### Supabase
- 全テーブルにRLSポリシーが設定済みであることを前提とする
- クエリは必ずエラーハンドリングを含める
- upsertを使う場合はonConflictを明示する

### APIレスポンス形式
```javascript
// 成功
res.status(200).json({ result: ... })
// エラー
res.status(400).json({ error: 'メッセージ' })
```

## 画面一覧
- `AIChatScreen` - AIとのチャット（メイン機能）
- `MeScreen` - 自分のプロフィール・分析結果
- `TalkScreen` - フレンドリスト・AIカード
- `ResonanceScreen` - 共鳴スコア・ユーザー発見
- `LoginScreen` - ログイン・新規登録・パスワードリセット
- `DMScreen` - ダイレクトメッセージ
- `UserProfileScreen` - 他ユーザーのプロフィール
- `AskAIScreen` - デジタル分身

## DBテーブル（全てRLS設定済み）
- `users` - 基本ユーザー情報
- `profiles` - 詳細プロフィール
- `persona_data` - 人格分析データ（5軸・32タイプ・深層分析）
- `conversation_summaries` - RAG用会話要約（pgvector）
- `friends` - フレンド関係
- `direct_messages` - DM
- `user_questions` - あなたへの質問
- `user_reports` - 通報データ

## 開発環境
- OS: Windows 11
- テスト端末: Galaxy S25 (Expo Go)
- ビルド: EAS Build (preview profile → APK)
- デプロイ: Vercel (git push で自動)

## 絶対にやってはいけないこと
- ルート直下の古いファイルを編集する
- RLSを無効化するSQL
- APIキーをコードにハードコードする
- console.logに個人情報・会話内容を出力する
- 認証なしでユーザーデータにアクセスする
