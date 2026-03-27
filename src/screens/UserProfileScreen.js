import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RadarChart from '../components/RadarChart';
import TraitBar from '../components/TraitBar';
import UserIcon from '../components/UserIcon';
import { getCurrentUser } from '../services/auth';
import { sendFriendRequest, getFriendshipStatus } from '../services/friends';
import { loadProfile } from '../services/profile';
import { getAnsweredQuestions, sendQuestion } from '../services/questions';
import { reportUser, blockUser } from '../services/report';
import { C, ELEMENT_COLORS } from '../theme';
import { supabase } from '../supabase';

const SUGGEST_QUESTIONS = [
  'どんなことに興味がありますか？',
  '大切にしている価値観は？',
  '最近ハマっていることは？',
  '休日はどう過ごしていますか？',
  'おすすめの本や映画はありますか？',
];

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userName: initialName } = route.params;

  const [profile, setProfile] = useState(null);
  const [persona, setPersona] = useState(null);
  const [friendship, setFriendship] = useState({ status: 'none' });
  const [answeredQs, setAnsweredQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showQModal, setShowQModal] = useState(false);
  const [qText, setQText] = useState('');
  const [qSending, setQSending] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const me = await getCurrentUser();
      if (me) setCurrentUserId(me.id);

      const [p, fs, aqs] = await Promise.all([
        loadProfile(userId),
        me ? getFriendshipStatus(me.id, userId) : { status: 'none' },
        getAnsweredQuestions(userId),
      ]);
      setProfile(p);
      setFriendship(fs);
      setAnsweredQs(aqs);

      const { data: pd } = await supabase
        .from('persona_data')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (pd) setPersona(pd);
    } catch (e) {
      console.log('UserProfile loadData error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleFriendRequest() {
    if (!currentUserId) return;
    const ok = await sendFriendRequest(currentUserId, userId);
    if (ok) {
      setFriendship({ status: 'pending', isSender: true });
    } else {
      Alert.alert('エラー', '送信に失敗しました');
    }
  }

  async function handleSendQuestion() {
    if (!qText.trim()) return;
    setQSending(true);
    const ok = await sendQuestion(userId, qText.trim());
    setQSending(false);
    if (ok) {
      setQText('');
      setShowQModal(false);
      Alert.alert('送信完了', '質問を送りました');
    } else {
      Alert.alert('エラー', '送信に失敗しました');
    }
  }

  const displayName = profile?.display_name || initialName || 'ユーザー';
  const elementInfo = persona ? ELEMENT_COLORS[persona.element_type] : null;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.p} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ヘッダー */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { flex: 1 }]}>{displayName}</Text>
        <TouchableOpacity style={s.moreBtn} onPress={() => setShowMoreMenu(true)}>
          <Text style={s.moreDots}>···</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ヒーロー */}
        <View style={s.hero}>
          <UserIcon name={displayName} size={60} />
          <View style={{ marginLeft: 14 }}>
            {elementInfo ? (
              <View style={[s.elBadge, { backgroundColor: elementInfo.bg, borderColor: elementInfo.border }]}>
                <Text style={[s.elBadgeTxt, { color: elementInfo.text }]}>
                  {elementInfo.emoji} {persona.element_type}型
                </Text>
              </View>
            ) : null}
            <Text style={s.name}>{displayName}</Text>
            {persona?.persona_type ? (
              <Text style={s.typeName}>{persona.persona_type}</Text>
            ) : null}
          </View>
        </View>

        {/* 共鳴ポイント（相性テキスト） */}
        {persona?.compatibility_text ? (
          <View style={s.resonanceCard}>
            <Text style={s.resonanceTitle}>✦ あなたとの共鳴ポイント</Text>
            <Text style={s.resonanceText}>{persona.compatibility_text}</Text>
          </View>
        ) : null}

        {/* ○○のAIに聞いてみる */}
        <TouchableOpacity
          style={s.askBtn}
          onPress={() => navigation.navigate('AskAI', { userId, userName: displayName, persona })}
        >
          <Text style={s.askBtnTxt}>{displayName} の AI に聞いてみる</Text>
        </TouchableOpacity>

        {/* 質問する + フレンドリクエスト */}
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 24, marginBottom: 14 }}>
          <TouchableOpacity style={[s.subBtn, { flex: 1 }]} onPress={() => setShowQModal(true)}>
            <Text style={s.subBtnTxt}>質問する</Text>
          </TouchableOpacity>
          {friendship.status === 'none' ? (
            <TouchableOpacity style={[s.subBtn, { flex: 1 }]} onPress={handleFriendRequest}>
              <Text style={s.subBtnTxt}>フレンド申請</Text>
            </TouchableOpacity>
          ) : friendship.status === 'pending' ? (
            <View style={[s.subBtn, { flex: 1, opacity: 0.5 }]}>
              <Text style={s.subBtnTxt}>{friendship.isSender ? '申請済み ✓' : '受信中'}</Text>
            </View>
          ) : friendship.status === 'accepted' ? (
            <TouchableOpacity
              style={[s.subBtn, { flex: 1 }]}
              onPress={() => navigation.navigate('DM', { friendId: userId, friendName: displayName })}
            >
              <Text style={s.subBtnTxt}>メッセージ</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 回答済みの質問 */}
        {answeredQs.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sLabel}>Q&A</Text>
            {answeredQs.map((q) => (
              <View key={q.id} style={s.qaCard}>
                <Text style={s.qaQ}>Q. {q.question_text}</Text>
                <Text style={s.qaA}>{q.answer_text}</Text>
                {q.source_count > 1 ? (
                  <Text style={s.qaCount}>{q.source_count}人がこの質問をしました</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ビジョン（自己紹介） */}
        {profile?.bio ? (
          <View style={s.section}>
            <Text style={s.sLabel}>ビジョン</Text>
            <View style={s.visionCard}>
              <Text style={s.visionText}>{profile.bio}</Text>
            </View>
          </View>
        ) : null}

        {/* 人格レーダー */}
        {persona ? (
          <>
            <View style={s.section}>
              <Text style={s.sLabel}>人格レーダー</Text>
              <RadarChart scores={persona} />
            </View>
            <View style={s.section}>
              <Text style={s.sLabel}>特性スコア</Text>
              <View style={{ paddingHorizontal: 24 }}>
                {[
                  ['深さ', persona.depth],
                  ['意思', persona.will],
                  ['行動', persona.action],
                  ['共鳴', persona.resonance],
                  ['安定', persona.stability],
                ].map(([label, val]) => (
                  <TraitBar key={label} label={label} value={val || 0} />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {/* 価値観バッジ */}
        {persona?.values_priority?.tags ? (
          <View style={s.section}>
            <Text style={s.sLabel}>価値観</Text>
            <View style={s.badgeRow}>
              {persona.values_priority.tags.map((t, i) => (
                <View key={i} style={s.badge}><Text style={s.badgeTxt}>{t}</Text></View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* 質問モーダル */}
      <Modal transparent visible={showQModal} animationType="fade" onRequestClose={() => setShowQModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowQModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.mhandle} />
            <Text style={s.modalTitle}>{displayName} に質問する</Text>
            <Text style={s.modalSub}>匿名で質問が送られます。相手が回答するとプロフィールに表示されます。</Text>

            <TextInput
              style={s.qInput}
              value={qText}
              onChangeText={setQText}
              placeholder="質問を入力..."
              placeholderTextColor={C.tm}
              multiline
              maxLength={200}
            />

            <Text style={s.suggestLabel}>おすすめの質問</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {SUGGEST_QUESTIONS.map((q, i) => (
                  <TouchableOpacity key={i} style={s.suggestChip} onPress={() => setQText(q)}>
                    <Text style={s.suggestChipTxt}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[s.qSendBtn, (!qText.trim() || qSending) && { opacity: 0.5 }]}
              onPress={handleSendQuestion}
              disabled={!qText.trim() || qSending}
            >
              <Text style={s.qSendTxt}>{qSending ? '送信中...' : '質問を送る'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 通報・ブロックメニュー */}
      <Modal transparent visible={showMoreMenu} animationType="fade" onRequestClose={() => setShowMoreMenu(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowMoreMenu(false)}>
          <View style={s.modalContent}>
            <View style={s.mhandle} />
            <TouchableOpacity
              style={s.moreItem}
              onPress={() => {
                setShowMoreMenu(false);
                Alert.alert(
                  'ブロック',
                  `${displayName}をブロックしますか？\nブロックすると相手はあなたのプロフィールを見られなくなります。`,
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                      text: 'ブロックする', style: 'destructive',
                      onPress: async () => {
                        if (!currentUserId) return;
                        const ok = await blockUser(currentUserId, userId);
                        if (ok) {
                          Alert.alert('完了', 'ブロックしました');
                          navigation.goBack();
                        }
                      }
                    },
                  ]
                );
              }}
            >
              <Text style={{ fontSize: 16 }}>🚫</Text>
              <Text style={s.moreItemTxt}>ブロックする</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.moreItem}
              onPress={() => {
                setShowMoreMenu(false);
                Alert.alert(
                  '通報',
                  '通報する理由を選んでください',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                      text: '不適切なコンテンツ',
                      onPress: async () => {
                        if (!currentUserId) return;
                        await reportUser(currentUserId, userId, '不適切なコンテンツ');
                        Alert.alert('完了', '通報を受け付けました。ご報告ありがとうございます。');
                      }
                    },
                    {
                      text: '嫌がらせ・迷惑行為',
                      onPress: async () => {
                        if (!currentUserId) return;
                        await reportUser(currentUserId, userId, '嫌がらせ・迷惑行為');
                        Alert.alert('完了', '通報を受け付けました。ご報告ありがとうございます。');
                      }
                    },
                    {
                      text: 'なりすまし',
                      onPress: async () => {
                        if (!currentUserId) return;
                        await reportUser(currentUserId, userId, 'なりすまし');
                        Alert.alert('完了', '通報を受け付けました。ご報告ありがとうございます。');
                      }
                    },
                  ]
                );
              }}
            >
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <Text style={[s.moreItemTxt, { color: '#e05050' }]}>通報する</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.bd },
  back: { fontSize: 28, color: C.p, paddingRight: 4 },
  navTitle: { fontSize: 14, fontWeight: '500', color: C.t1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 14 },
  elBadge: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 4 },
  elBadgeTxt: { fontSize: 10, fontWeight: '500' },
  name: { fontSize: 20, fontWeight: '500', color: C.t1, marginBottom: 2 },
  typeName: { fontSize: 12, color: C.p },
  resonanceCard: { marginHorizontal: 24, marginBottom: 14, borderRadius: 16, padding: 14, backgroundColor: '#f5f0ff', borderWidth: 1, borderColor: C.pm },
  resonanceTitle: { fontSize: 10, color: C.p, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  resonanceText: { fontSize: 12, color: C.t1, lineHeight: 20 },
  askBtn: { marginHorizontal: 24, marginBottom: 10, padding: 14, backgroundColor: C.p, borderRadius: 16, alignItems: 'center' },
  askBtnTxt: { fontSize: 14, fontWeight: '500', color: '#fff' },
  subBtn: { padding: 12, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 16, alignItems: 'center' },
  subBtnTxt: { fontSize: 13, color: C.p },
  section: { marginBottom: 14 },
  sLabel: { fontSize: 10, color: C.tm, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 24, marginBottom: 7 },
  visionCard: { marginHorizontal: 24, backgroundColor: C.bs, borderRadius: 12, padding: 11 },
  visionText: { fontSize: 12, color: C.t2, lineHeight: 18 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingHorizontal: 24 },
  badge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12, backgroundColor: C.bs, borderWidth: 1, borderColor: C.bd },
  badgeTxt: { fontSize: 11, color: C.t2 },
  // Q&A
  qaCard: { marginHorizontal: 24, marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bd, borderRadius: 14, padding: 12 },
  qaQ: { fontSize: 12, fontWeight: '500', color: C.p, marginBottom: 6 },
  qaA: { fontSize: 12, color: C.t1, lineHeight: 18 },
  qaCount: { fontSize: 10, color: C.tm, marginTop: 6 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  mhandle: { width: 36, height: 4, backgroundColor: C.bm, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 4 },
  modalSub: { fontSize: 11, color: C.tm, marginBottom: 14, lineHeight: 18 },
  qInput: { backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: C.t1, height: 80, textAlignVertical: 'top', marginBottom: 12 },
  suggestLabel: { fontSize: 10, color: C.tm, marginBottom: 6 },
  suggestChip: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.bs, borderWidth: 1, borderColor: C.bd, borderRadius: 14 },
  suggestChipTxt: { fontSize: 11, color: C.t2 },
  qSendBtn: { padding: 14, backgroundColor: C.p, borderRadius: 16, alignItems: 'center' },
  qSendTxt: { fontSize: 14, fontWeight: '500', color: '#fff' },
  // More menu
  moreBtn: { padding: 6 },
  moreDots: { fontSize: 20, fontWeight: '700', color: C.t2, letterSpacing: 2 },
  moreItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bd },
  moreItemTxt: { fontSize: 15, color: C.t1 },
});
