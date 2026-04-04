import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PaywallModal from '../components/PaywallModal';
import RadarChart from '../components/RadarChart';
import TraitBar from '../components/TraitBar';
import UserIcon from '../components/UserIcon';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { getCurrentUser } from '../services/auth';
import { sendFriendRequest, getFriendshipStatus } from '../services/friends';
import { loadProfile } from '../services/profile';
import { getAnsweredQuestions, sendQuestion } from '../services/questions';
import { reportUser, blockUser } from '../services/report';
import { ELEMENT_COLORS } from '../theme';
import { supabase } from '../supabase';

function calcResonanceDetail(a, b) {
  if (!a || !b) return null;
  const axes = [
    { key: 'depth', labelKey: 'trait_depth' },
    { key: 'will', labelKey: 'trait_will' },
    { key: 'action', labelKey: 'trait_action' },
    { key: 'resonance', labelKey: 'trait_resonance' },
    { key: 'stability', labelKey: 'trait_stability' },
  ];
  const scores = axes.map(ax => ({
    ...ax,
    score: Math.round(100 - Math.abs((a[ax.key] || 50) - (b[ax.key] || 50))),
  }));
  const overall = Math.round(scores.reduce((s, v) => s + v.score, 0) / scores.length);
  return { overall, axes: scores };
}

export default function UserProfileScreen() {
  const { colors: C, elementColors } = useTheme();
  const { t } = useI18n();
  const s = useMemo(() => getStyles(C), [C]);
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userName: initialName } = route.params;

  const SUGGEST_QUESTIONS = [
    t('user_suggest_q1'),
    t('user_suggest_q2'),
    t('user_suggest_q3'),
    t('user_suggest_q4'),
    t('user_suggest_q5'),
  ];

  const [profile, setProfile] = useState(null);
  const [persona, setPersona] = useState(null);
  const [myPersona, setMyPersona] = useState(null);
  const [friendship, setFriendship] = useState({ status: 'none' });
  const [answeredQs, setAnsweredQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showQModal, setShowQModal] = useState(false);
  const [qText, setQText] = useState('');
  const [qSending, setQSending] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isTheirPremium, setIsTheirPremium] = useState(false);
  const [myTier, setMyTier] = useState('free');
  const [showPaywall, setShowPaywall] = useState(false);

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

      // 自分のpersona_dataを読み込む
      if (me) {
        const { data: myPd } = await supabase
          .from('persona_data')
          .select('depth, will, action, resonance, stability, element_type, persona_type')
          .eq('user_id', me.id)
          .single();
        if (myPd) setMyPersona(myPd);
      }

      // 相手・自分のサブスクリプション確認
      const [{ data: theirSub }, { data: mySub }] = await Promise.all([
        supabase.from('subscriptions').select('tier, expires_at').eq('user_id', userId).maybeSingle(),
        me ? supabase.from('subscriptions').select('tier, expires_at').eq('user_id', me.id).maybeSingle() : { data: null },
      ]);
      const premiumActive = theirSub && theirSub.tier === 'premium' && (!theirSub.expires_at || new Date(theirSub.expires_at) > new Date());
      setIsTheirPremium(!!premiumActive);
      if (mySub && (!mySub.expires_at || new Date(mySub.expires_at) > new Date())) {
        setMyTier(mySub.tier || 'free');
      }
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
      Alert.alert(t('error'), t('user_send_failed'));
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
      Alert.alert(t('user_send_complete'), t('user_question_sent'));
    } else {
      Alert.alert(t('error'), t('user_send_failed'));
    }
  }

  const displayName = profile?.display_name || initialName || t('user_default_name');
  const elementInfo = persona ? elementColors[persona.element_type] : null;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.p} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={C.t1} />
        </TouchableOpacity>
        <Text style={[s.navTitle, { flex: 1 }]}>{displayName}</Text>
        <TouchableOpacity style={s.moreBtn} onPress={() => setShowMoreMenu(true)}>
          <Ionicons name="ellipsis-vertical" size={22} color={C.t1} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <UserIcon name={displayName} size={60} imageUrl={profile?.avatar_url || null} />
          <View style={{ marginLeft: 14 }}>
            {elementInfo ? (
              <View style={[s.elBadge, { backgroundColor: elementInfo.bg, borderColor: elementInfo.border }]}>
                <Text style={[s.elBadgeTxt, { color: elementInfo.text }]}>
                  {elementInfo.emoji} {persona.element_type}{t('user_element_suffix')}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={s.name}>{displayName}</Text>
              {isTheirPremium ? (
                <Ionicons name="water" size={14} color="#FFD700" />
              ) : null}
            </View>
            {persona?.persona_type ? (
              <Text style={s.typeName}>{persona.persona_type}</Text>
            ) : null}
          </View>
        </View>

        {/* 共鳴ポイントカード */}
        {persona && myPersona && persona.compatibility_text && (() => {
          const res = calcResonanceDetail(myPersona, persona);
          if (!res) return null;
          return (
            <View style={s.resonanceCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Text style={{ color: C.p, fontSize: 10 }}>◆</Text>
                <Text style={s.resonanceTitle}>{t('user_resonance')}</Text>
              </View>
              <Text style={s.resonanceText}>{persona.compatibility_text}</Text>
            </View>
          );
        })()}

        <TouchableOpacity
          style={s.askBtn}
          onPress={() => {
            if (myTier === 'free') { setShowPaywall(true); return; }
            navigation.navigate('AskAI', { userId, userName: displayName, persona });
          }}
        >
          {myTier === 'free' && (
            <Ionicons name="lock-closed" size={13} color={C.white} style={{ marginRight: 4 }} />
          )}
          <Text style={s.askBtnTxt}>{t('user_ask_ai', { name: displayName })}</Text>
        </TouchableOpacity>

        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          featureKey="twin"
        />

        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 24, marginBottom: 14 }}>
          <TouchableOpacity style={[s.subBtn, { flex: 1 }]} onPress={() => setShowQModal(true)}>
            <Text style={s.subBtnTxt}>{t('user_question')}</Text>
          </TouchableOpacity>
          {friendship.status === 'none' ? (
            <TouchableOpacity style={[s.subBtn, { flex: 1 }]} onPress={handleFriendRequest}>
              <Text style={s.subBtnTxt}>{t('user_add_friend')}</Text>
            </TouchableOpacity>
          ) : friendship.status === 'pending' ? (
            <View style={[s.subBtn, { flex: 1, opacity: 0.5 }]}>
              <Text style={s.subBtnTxt}>{friendship.isSender ? t('user_pending_sent') : t('user_pending_received')}</Text>
            </View>
          ) : friendship.status === 'accepted' ? (
            <TouchableOpacity
              style={[s.subBtn, { flex: 1 }]}
              onPress={() => navigation.navigate('DM', { friendId: userId, friendName: displayName })}
            >
              <Text style={s.subBtnTxt}>{t('user_message')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {answeredQs.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sLabel}>Q&A</Text>
            {answeredQs.map((q) => (
              <View key={q.id} style={s.qaCard}>
                <Text style={s.qaQ}>Q. {q.question_text}</Text>
                <Text style={s.qaA}>{q.answer_text}</Text>
                {q.source_count > 1 ? (
                  <Text style={s.qaCount}>{t('user_qa_count', { count: q.source_count })}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {profile?.bio ? (
          <View style={s.section}>
            <Text style={s.sLabel}>{t('user_vision')}</Text>
            <View style={s.visionCard}>
              <Text style={s.visionText}>{profile.bio}</Text>
            </View>
          </View>
        ) : null}

        {persona ? (
          <>
            <View style={s.section}>
              <Text style={s.sLabel}>{t('user_radar')}</Text>
              <RadarChart scores={persona} />
            </View>
            <View style={s.section}>
              <Text style={s.sLabel}>{t('user_trait_scores')}</Text>
              <View style={{ paddingHorizontal: 24 }}>
                {[
                  [t('trait_depth'), persona.depth],
                  [t('trait_will'), persona.will],
                  [t('trait_action'), persona.action],
                  [t('trait_resonance'), persona.resonance],
                  [t('trait_stability'), persona.stability],
                ].map(([label, val]) => (
                  <TraitBar key={label} label={label} value={val || 0} />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {persona?.values_priority?.tags ? (
          <View style={s.section}>
            <Text style={s.sLabel}>{t('user_values')}</Text>
            <View style={s.badgeRow}>
              {persona.values_priority.tags.map((tag, i) => (
                <View key={i} style={s.badge}><Text style={s.badgeTxt}>{tag}</Text></View>
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
            <Text style={s.modalTitle}>{t('user_question_modal_title', { name: displayName })}</Text>
            <Text style={s.modalSub}>{t('user_question_modal_sub')}</Text>

            <TextInput
              style={s.qInput}
              value={qText}
              onChangeText={setQText}
              placeholder={t('user_question_placeholder')}
              placeholderTextColor={C.tm}
              multiline
              maxLength={200}
            />

            <Text style={s.suggestLabel}>{t('user_suggest_label')}</Text>
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
              <Text style={s.qSendTxt}>{qSending ? t('user_sending') : t('user_send_question')}</Text>
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
                  t('user_block'),
                  t('user_block_confirm', { name: displayName }),
                  [
                    { text: t('cancel'), style: 'cancel' },
                    {
                      text: t('user_block_action'), style: 'destructive',
                      onPress: async () => {
                        if (!currentUserId) return;
                        const ok = await blockUser(currentUserId, userId);
                        if (ok) {
                          Alert.alert(t('done'), t('user_blocked'));
                          navigation.goBack();
                        }
                      }
                    },
                  ]
                );
              }}
            >
              <Ionicons name="close-circle-outline" size={18} color={C.red || '#ef4444'} />
              <Text style={s.moreItemTxt}>{t('user_block_action')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.moreItem}
              onPress={() => {
                setShowMoreMenu(false);
                Alert.alert(
                  t('user_report'),
                  t('user_report_reason'),
                  [
                    { text: t('cancel'), style: 'cancel' },
                    {
                      text: t('user_report_inappropriate'),
                      onPress: async () => {
                        if (!currentUserId) return;
                        await reportUser(currentUserId, userId, t('user_report_inappropriate'));
                        Alert.alert(t('done'), t('user_report_thanks'));
                      }
                    },
                    {
                      text: t('user_report_harassment'),
                      onPress: async () => {
                        if (!currentUserId) return;
                        await reportUser(currentUserId, userId, t('user_report_harassment'));
                        Alert.alert(t('done'), t('user_report_thanks'));
                      }
                    },
                    {
                      text: t('user_report_impersonation'),
                      onPress: async () => {
                        if (!currentUserId) return;
                        await reportUser(currentUserId, userId, t('user_report_impersonation'));
                        Alert.alert(t('done'), t('user_report_thanks'));
                      }
                    },
                  ]
                );
              }}
            >
              <Ionicons name="alert-circle-outline" size={18} color={C.t2} />
              <Text style={[s.moreItemTxt, { color: C.err }]}>{t('user_report_action')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (C) => StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.bd },
  back: { fontSize: 28, color: C.p, paddingRight: 4 },
  navTitle: { fontSize: 14, fontWeight: '500', color: C.t1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 14 },
  elBadge: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 4 },
  elBadgeTxt: { fontSize: 10, fontWeight: '500' },
  name: { fontSize: 20, fontWeight: '500', color: C.t1, marginBottom: 2 },
  typeName: { fontSize: 12, color: C.p },
  resonanceCard: { marginHorizontal: 24, marginBottom: 14, borderRadius: 16, padding: 14, backgroundColor: C.pp, borderWidth: 1, borderColor: C.pm },
  resonanceTitle: { fontSize: 10, color: C.p, textTransform: 'uppercase', letterSpacing: 1 },
  resonanceText: { fontSize: 12, color: C.t1, lineHeight: 20 },
  askBtn: { marginHorizontal: 24, marginBottom: 10, padding: 14, backgroundColor: C.p, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  askBtnTxt: { fontSize: 14, fontWeight: '500', color: C.white },
  subBtn: { padding: 12, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 16, alignItems: 'center' },
  subBtnTxt: { fontSize: 13, color: C.p },
  section: { marginBottom: 14 },
  sLabel: { fontSize: 10, color: C.tm, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 24, marginBottom: 7 },
  visionCard: { marginHorizontal: 24, backgroundColor: C.bs, borderRadius: 12, padding: 11 },
  visionText: { fontSize: 12, color: C.t2, lineHeight: 18 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingHorizontal: 24 },
  badge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12, backgroundColor: C.bs, borderWidth: 1, borderColor: C.bd },
  badgeTxt: { fontSize: 11, color: C.t2 },
  qaCard: { marginHorizontal: 24, marginBottom: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.bd, borderRadius: 14, padding: 12 },
  qaQ: { fontSize: 12, fontWeight: '500', color: C.p, marginBottom: 6 },
  qaA: { fontSize: 12, color: C.t1, lineHeight: 18 },
  qaCount: { fontSize: 10, color: C.tm, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.modalBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  mhandle: { width: 36, height: 4, backgroundColor: C.bm, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 4 },
  modalSub: { fontSize: 11, color: C.tm, marginBottom: 14, lineHeight: 18 },
  qInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.bm, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: C.t1, height: 80, textAlignVertical: 'top', marginBottom: 12 },
  suggestLabel: { fontSize: 10, color: C.tm, marginBottom: 6 },
  suggestChip: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.bs, borderWidth: 1, borderColor: C.bd, borderRadius: 14 },
  suggestChipTxt: { fontSize: 11, color: C.t2 },
  qSendBtn: { padding: 14, backgroundColor: C.p, borderRadius: 16, alignItems: 'center' },
  qSendTxt: { fontSize: 14, fontWeight: '500', color: C.white },
  moreBtn: { padding: 6 },
  moreDots: { fontSize: 20, fontWeight: '700', color: C.t2, letterSpacing: 2 },
  moreItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bd },
  moreItemTxt: { fontSize: 15, color: C.t1 },
});
