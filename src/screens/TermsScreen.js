import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme';

export default function TermsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>利用規約・プライバシーポリシー</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
        <Text style={s.h1}>OASIS 利用規約</Text>
        <Text style={s.date}>最終更新日：2026年3月27日</Text>

        <Text style={s.h2}>1. サービス概要</Text>
        <Text style={s.body}>
          OASIS（以下「本サービス」）は、AIとの会話を通じて自身の人格特性を分析し、他のユーザーとの共鳴（相性）を発見するSNSアプリケーションです。
        </Text>

        <Text style={s.h2}>2. アカウント</Text>
        <Text style={s.body}>
          本サービスの利用にはアカウント登録が必要です。ユーザーは正確な情報を提供し、アカウントの安全管理に責任を持つものとします。
        </Text>

        <Text style={s.h2}>3. 禁止事項</Text>
        <Text style={s.body}>
          以下の行為を禁止します。{'\n'}
          - 他のユーザーへの嫌がらせ、誹謗中傷{'\n'}
          - 虚偽の情報の投稿{'\n'}
          - 不正アクセスやシステムへの攻撃{'\n'}
          - 営利目的での無断利用{'\n'}
          - 法令に違反する行為{'\n'}
          - 18歳未満の方の利用
        </Text>

        <Text style={s.h2}>4. AI分析について</Text>
        <Text style={s.body}>
          本サービスのAI分析結果は参考情報であり、医学的・心理学的な診断ではありません。分析結果に基づく判断はユーザー自身の責任で行ってください。
        </Text>

        <Text style={s.h2}>5. デジタル分身について</Text>
        <Text style={s.body}>
          デジタル分身はAIが生成する応答であり、本人の発言ではありません。デジタル分身の発言について、対象ユーザーは責任を負いません。
        </Text>

        <Text style={s.h2}>6. コンテンツの権利</Text>
        <Text style={s.body}>
          ユーザーが投稿したコンテンツの著作権はユーザーに帰属します。ただし、サービス提供に必要な範囲で利用を許諾するものとします。
        </Text>

        <Text style={s.h2}>7. サービスの変更・停止</Text>
        <Text style={s.body}>
          運営者は事前通知なくサービスの内容変更、一時停止、終了を行う場合があります。
        </Text>

        <Text style={s.h2}>8. 免責事項</Text>
        <Text style={s.body}>
          本サービスは「現状のまま」提供されます。運営者はサービスの完全性、正確性、利用可能性について保証しません。
        </Text>

        <Text style={[s.h1, { marginTop: 30 }]}>プライバシーポリシー</Text>

        <Text style={s.h2}>1. 収集する情報</Text>
        <Text style={s.body}>
          - メールアドレス（認証用）{'\n'}
          - プロフィール情報（名前、年齢、自己紹介など）{'\n'}
          - AIとの会話内容（人格分析に使用）{'\n'}
          - ダイレクトメッセージ
        </Text>

        <Text style={s.h2}>2. 情報の利用目的</Text>
        <Text style={s.body}>
          - 人格分析とデジタル分身の生成{'\n'}
          - 共鳴スコアの計算{'\n'}
          - サービスの改善{'\n'}
          - ユーザーサポート
        </Text>

        <Text style={s.h2}>3. 情報の共有</Text>
        <Text style={s.body}>
          人格分析結果（5軸スコア、タイプ名）は他のユーザーに公開されます。AIとの会話内容自体は他のユーザーに公開されません。法令に基づく場合を除き、第三者に個人情報を提供しません。
        </Text>

        <Text style={s.h2}>4. データの保存</Text>
        <Text style={s.body}>
          データはSupabase（クラウドデータベース）に安全に保存されます。アカウント削除時にはユーザーデータを削除します。
        </Text>

        <Text style={s.h2}>5. お問い合わせ</Text>
        <Text style={s.body}>
          本規約およびプライバシーポリシーに関するお問い合わせは、アプリ内の設定画面からご連絡ください。
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.bd },
  back: { fontSize: 28, color: C.p, paddingRight: 4 },
  navTitle: { fontSize: 13, fontWeight: '500', color: C.t1 },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  h1: { fontSize: 18, fontWeight: '600', color: C.t1, marginBottom: 4 },
  date: { fontSize: 11, color: C.tm, marginBottom: 20 },
  h2: { fontSize: 14, fontWeight: '600', color: C.t1, marginTop: 18, marginBottom: 6 },
  body: { fontSize: 12, color: C.t2, lineHeight: 20 },
});
