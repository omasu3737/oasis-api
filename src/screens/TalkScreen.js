import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserIcon from '../components/UserIcon';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { getCurrentUser } from '../services/auth';
import {
  acceptFriendRequest, getFriends, getPendingRequests,
  rejectFriendRequest, sendFriendRequest,
} from '../services/friends';
import { loadProfile } from '../services/profile';
import { supabase } from '../supabase';

const ELEMENT_COLORS = { Fire: '#E85D3A', Water: '#3B82F6', Wind: '#10B981', Earth: '#8B6914' };
const ELEMENT_EMOJIS = { Fire: '🔥', Water: '💧', Wind: '🌬', Earth: '🌍' };

function scoreQuestion(q, currentElement) {
  const hoursSince = (Date.now() - new Date(q.created_at).getTime()) / 3600000;
  const recency = Math.exp(-hoursSince / 72);
  const boost = q.element_type === currentElement ? 1.5 : 1;
  return ((q.answer_count * 2) + q.likes_count + recency * 5) * boost;
}

function formatRelativeTime(dateStr, t) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return t('time_just_now');
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('time_min_ago')}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t('time_hour_ago')}`;
  return `${Math.floor(diff / 86400)}${t('time_day_ago')}`;
}

export default function TalkScreen() {
  const { colors: C } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();

  const [friends, setFriends]             = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [soulQuestions, setSoulQuestions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentElement, setCurrentElement] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [showMenu, setShowMenu]           = useState(false);
  const [showRequests, setShowRequests]   = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showPostQ, setShowPostQ]         = useState(false);
  const [refreshing, setRefreshing]       = useState(false);

  const s = getStyles(C);

  const loadData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [friendsList, requests, { data: userData }] = await Promise.all([
        getFriends(user.id),
        getPendingRequests(user.id),
        supabase.from('users').select('element_type').eq('id', user.id).maybeSingle(),
      ]);

      const element = userData?.element_type ?? null;
      setCurrentElement(element);

      const [friendsWithProfiles, requestsWithProfiles] = await Promise.all([
        Promise.all(friendsList.map(async (f) => {
          const profile = await loadProfile(f.friendId);
          return { ...f, name: profile?.display_name || t('talk_default_user') };
        })),
        Promise.all(requests.map(async (r) => {
          const profile = await loadProfile(r.requester_id);
          return { ...r, name: profile?.display_name || t('talk_default_user') };
        })),
      ]);
      setFriends(friendsWithProfiles);
      setPendingRequests(requestsWithProfiles);

      // 魂の問答フィード
      const { data: questions } = await supabase
        .from('soul_questions')
        .select('id, content, answer_count, likes_count, personality_type, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(50);

      if (questions?.length) {
        const userIds = [...new Set(questions.map(q => q.user_id))];
        const { data: profiles } = await supabase
          .from('profiles').select('id, display_name').in('id', userIds);
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

        const enriched = questions.map(q => ({
          ...q,
          display_name: profileMap[q.user_id]?.display_name || t('talk_default_user'),
          element_type: q.personality_type, // personality_type にelement_typeを格納
        }));
        enriched.sort((a, b) => scoreQuestion(b, element) - scoreQuestion(a, element));
        setSoulQuestions(enriched);
      } else {
        setSoulQuestions([]);
      }
    } catch (e) {
      console.log('TalkScreen loadData error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  async function handleAccept(requestId) {
    const ok = await acceptFriendRequest(requestId);
    if (ok) { setPendingRequests(prev => prev.filter(r => r.id !== requestId)); loadData(); }
  }
  async function handleReject(requestId) {
    const ok = await rejectFriendRequest(requestId);
    if (ok) setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ヘッダー */}
      <View style={s.header}>
        <Text style={s.title}>{t('tab_talk')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {pendingRequests.length > 0 && (
            <TouchableOpacity style={s.notifBtn} onPress={() => setShowRequests(true)}>
              <Ionicons name="notifications-outline" size={22} color={C.t1} />
              <View style={s.notifDot}>
                <Text style={{ fontSize: 8, color: C.white }}>{pendingRequests.length}</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.menuBtn} onPress={() => setShowMenu(true)}>
            <View style={s.dot} /><View style={s.dot} /><View style={s.dot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.p} colors={[C.p]} />}
      >
        {/* AIチャットカード */}
        <TouchableOpacity style={s.aiCard} onPress={() => navigation.navigate('AIChat')}>
          <View style={s.aiOrb}>
            <Ionicons name="water-outline" size={22} color={C.t1} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiName}>{t('talk_ai_name')}</Text>
            <Text style={s.aiSub}>{t('talk_ai_sub')}</Text>
          </View>
          <View style={s.aiBadge}><Text style={s.aiBadgeTxt}>AI</Text></View>
        </TouchableOpacity>

        {/* フレンドストーリーバー */}
        <Text style={s.sectionSep}>{t('talk_friends')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.storyBar}
          contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 8, gap: 16 }}
        >
          {/* フレンド追加ボタン */}
          <TouchableOpacity style={s.storyItem} onPress={() => setShowAddFriend(true)}>
            <View style={[s.storyRing, { borderColor: C.p, borderStyle: 'dashed' }]}>
              <View style={[s.storyInner, { backgroundColor: C.pp }]}>
                <Ionicons name="person-add-outline" size={20} color={C.p} />
              </View>
            </View>
            <Text style={s.storyName}>{t('talk_add_friend_short')}</Text>
          </TouchableOpacity>

          {loading ? (
            [1, 2, 3].map(i => (
              <View key={i} style={s.storyItem}>
                <View style={[s.storyRing, { borderColor: C.bd }]}>
                  <View style={[s.storyInner, { backgroundColor: C.pp }]} />
                </View>
                <View style={{ width: 36, height: 8, backgroundColor: C.pp, borderRadius: 4, marginTop: 4 }} />
              </View>
            ))
          ) : (
            friends.map(f => (
              <TouchableOpacity
                key={f.friendId}
                style={s.storyItem}
                onPress={() => navigation.navigate('DM', { friendId: f.friendId, friendName: f.name })}
              >
                <View style={[s.storyRing, { borderColor: C.p }]}>
                  <View style={s.storyInner}>
                    <UserIcon name={f.name} size={44} />
                  </View>
                </View>
                <Text style={s.storyName} numberOfLines={1}>{f.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* 魂の問答セクション */}
        <View style={s.soulHeader}>
          <Text style={s.sectionSep}>{t('soul_section')}</Text>
          <TouchableOpacity style={s.postBtn} onPress={() => setShowPostQ(true)}>
            <Ionicons name="add" size={15} color={C.p} />
            <Text style={s.postBtnTxt}>{t('soul_post')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator color={C.p} />
          </View>
        ) : soulQuestions.length === 0 ? (
          <View style={s.soulEmpty}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>✨</Text>
            <Text style={s.emptyTitle}>{t('soul_empty')}</Text>
            <Text style={s.emptySub}>{t('soul_empty_sub')}</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowPostQ(true)}>
              <Text style={s.emptyBtnTxt}>{t('soul_post')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          soulQuestions.map(q => {
            const elColor = ELEMENT_COLORS[q.element_type] || C.tm;
            const elEmoji = ELEMENT_EMOJIS[q.element_type] || '';
            const elKey = (q.element_type || '').toLowerCase();
            return (
              <TouchableOpacity
                key={q.id}
                style={s.soulCard}
                onPress={() => navigation.navigate('SoulQuestion', {
                  questionId: q.id,
                  currentElement,
                })}
                activeOpacity={0.85}
              >
                <View style={s.soulCardTop}>
                  <View style={[s.elBadge, { backgroundColor: elColor + '22' }]}>
                    <Text style={{ fontSize: 11 }}>{elEmoji}</Text>
                    <Text style={[s.elBadgeTxt, { color: elColor }]}>{t('element_' + elKey)}</Text>
                  </View>
                  <Text style={s.soulTime}>{formatRelativeTime(q.created_at, t)}</Text>
                </View>
                <Text style={s.soulUser}>{q.display_name}</Text>
                <Text style={s.soulContent}>{q.content}</Text>
                <View style={s.soulFooter}>
                  <Ionicons name="chatbubble-outline" size={13} color={C.tm} />
                  <Text style={s.soulAnswerCount}>{q.answer_count}{t('soul_answers_unit')}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* メニューモーダル */}
      <Modal transparent visible={showMenu} animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={s.modalContent}>
            <View style={s.mhandle} />
            <Text style={s.modalTitle}>{t('talk_menu')}</Text>
            <TouchableOpacity style={s.modalItem} onPress={() => { setShowMenu(false); setTimeout(() => setShowAddFriend(true), 300); }}>
              <View style={s.modalIcon}><Ionicons name="person-add-outline" size={18} color={C.t2} /></View>
              <View>
                <Text style={s.modalLabel}>{t('talk_add_friend')}</Text>
                <Text style={s.modalSub}>{t('talk_add_friend_sub')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* フレンドリクエスト通知 */}
      <Modal transparent visible={showRequests} animationType="fade" onRequestClose={() => setShowRequests(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowRequests(false)}>
          <View style={s.modalContent}>
            <View style={s.mhandle} />
            <Text style={s.modalTitle}>{t('talk_friend_request')}</Text>
            {pendingRequests.map((r) => (
              <View key={r.id} style={s.reqItem}>
                <UserIcon name={r.name} size={44} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.t1 }}>{r.name}</Text>
                  <Text style={{ fontSize: 11, color: C.tm }}>{t('talk_friend_request')}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(r.id)}>
                    <Text style={{ fontSize: 12, color: C.white }}>{t('talk_accept')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(r.id)}>
                    <Text style={{ fontSize: 12, color: C.t2 }}>{t('talk_reject')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {pendingRequests.length === 0 && (
              <Text style={{ fontSize: 12, color: C.tm, textAlign: 'center', paddingVertical: 16 }}>
                {t('talk_no_requests')}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <AddFriendModal
        visible={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        currentUserId={currentUserId}
        onRequestSent={loadData}
        C={C} t={t} s={s}
      />

      <PostQuestionModal
        visible={showPostQ}
        onClose={() => setShowPostQ(false)}
        currentUserId={currentUserId}
        currentElement={currentElement}
        onPosted={() => { setShowPostQ(false); loadData(); }}
        C={C} t={t} s={s}
      />
    </SafeAreaView>
  );
}

// ────────── フレンド追加モーダル ──────────
function AddFriendModal({ visible, onClose, currentUserId, onRequestSent, C, t, s }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState([]);

  async function doSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .ilike('display_name', `%${query.trim()}%`)
        .neq('id', currentUserId)
        .limit(10);
      setResults(data || []);
    } catch { setResults([]); } finally { setSearching(false); }
  }

  async function handleSendRequest(userId) {
    const ok = await sendFriendRequest(currentUserId, userId);
    if (ok) { setSentIds(prev => [...prev, userId]); onRequestSent(); }
    else Alert.alert(t('error'), t('user_send_failed'));
  }

  function handleClose() { setQuery(''); setResults([]); setSentIds([]); onClose(); }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={handleClose}>
        <View style={[s.modalContent, { maxHeight: '75%' }]} onStartShouldSetResponder={() => true}>
          <View style={s.mhandle} />
          <Text style={s.modalTitle}>{t('talk_add_friend')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TextInput
              style={[s.searchInput, { flex: 1 }]}
              placeholder={t('talk_search_placeholder')}
              placeholderTextColor={C.tm}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={doSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={s.searchBtn} onPress={doSearch}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.white }}>{t('search')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {searching ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator color={C.p} />
              </View>
            ) : results.length > 0 ? (
              results.map(u => (
                <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.bd }}>
                  <UserIcon name={u.display_name} size={42} imageUrl={u.avatar_url} />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: C.t1 }}>{u.display_name}</Text>
                  {sentIds.includes(u.id) ? (
                    <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.pp, borderRadius: 10 }}>
                      <Text style={{ fontSize: 12, color: C.tm }}>{t('user_pending_sent')}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.p, borderRadius: 10 }}
                      onPress={() => handleSendRequest(u.id)}
                    >
                      <Text style={{ fontSize: 12, color: C.white }}>{t('user_add_friend')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : query.trim() ? (
              <Text style={{ fontSize: 13, color: C.tm, textAlign: 'center', paddingVertical: 20 }}>
                {t('resonance_no_users')}
              </Text>
            ) : (
              <Text style={{ fontSize: 12, color: C.tm, textAlign: 'center', paddingVertical: 20 }}>
                {t('talk_search_hint')}
              </Text>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ────────── 魂の問答投稿モーダル ──────────
function PostQuestionModal({ visible, onClose, currentUserId, currentElement, onPosted, C, t, s }) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  async function handlePost() {
    if (!text.trim() || posting) return;
    if (!currentElement) {
      Alert.alert(t('error'), t('soul_no_type_error'));
      return;
    }
    setPosting(true);
    try {
      const { error } = await supabase.from('soul_questions').insert({
        user_id: currentUserId,
        personality_type: currentElement, // element_typeを格納
        content: text.trim(),
      });
      if (!error) { setText(''); onPosted(); }
    } finally { setPosting(false); }
  }

  function handleClose() { setText(''); onClose(); }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={handleClose}>
        <View style={[s.modalContent, { paddingBottom: 40 }]} onStartShouldSetResponder={() => true}>
          <View style={s.mhandle} />
          <Text style={s.modalTitle}>{t('soul_post_title')}</Text>
          <TextInput
            style={s.postInput}
            placeholder={t('soul_post_placeholder')}
            placeholderTextColor={C.tm}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={300}
            autoFocus
          />
          <Text style={{ fontSize: 11, color: C.tm, textAlign: 'right', marginBottom: 12 }}>
            {text.length}/300
          </Text>
          <TouchableOpacity
            style={[s.ctaBtn, (!text.trim() || posting) && { opacity: 0.5 }]}
            onPress={handlePost}
            disabled={!text.trim() || posting}
          >
            <Text style={s.ctaBtnTxt}>{posting ? t('soul_posting') : t('soul_post_submit')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ────────── スタイル ──────────
function getStyles(C) {
  return StyleSheet.create({
    header: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 26, fontWeight: '500', color: C.t1, letterSpacing: -0.5 },
    menuBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center', gap: 3 },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.p },
    notifBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    notifDot: { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: C.err, alignItems: 'center', justifyContent: 'center' },

    aiCard: { marginHorizontal: 18, marginBottom: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.bm, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    aiOrb: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.pp, borderWidth: 2, borderColor: C.bm, alignItems: 'center', justifyContent: 'center' },
    aiName: { fontSize: 15, fontWeight: '500', color: C.t1 },
    aiSub: { fontSize: 11, color: C.tm, marginTop: 2 },
    aiBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: C.p },
    aiBadgeTxt: { fontSize: 10, color: C.white },

    sectionSep: { paddingHorizontal: 24, paddingVertical: 6, fontSize: 10, color: C.tm, textTransform: 'uppercase', letterSpacing: 1 },

    // フレンドストーリーバー
    storyBar: { marginBottom: 4 },
    storyItem: { alignItems: 'center', width: 62 },
    storyRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, padding: 2, marginBottom: 4 },
    storyInner: { flex: 1, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    storyName: { fontSize: 10, color: C.t2, textAlign: 'center', maxWidth: 58 },

    // 魂の問答
    soulHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 18 },
    postBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: C.p },
    postBtnTxt: { fontSize: 12, color: C.p, fontWeight: '600' },

    soulCard: { marginHorizontal: 18, marginBottom: 10, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.bd },
    soulCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    elBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    elBadgeTxt: { fontSize: 11, fontWeight: '600' },
    soulTime: { fontSize: 11, color: C.tm },
    soulUser: { fontSize: 12, color: C.t2, marginBottom: 6 },
    soulContent: { fontSize: 15, color: C.t1, lineHeight: 22, fontWeight: '500', marginBottom: 10 },
    soulFooter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    soulAnswerCount: { fontSize: 12, color: C.tm },

    soulEmpty: { paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: C.t2, marginBottom: 6 },
    emptySub: { fontSize: 12, color: C.tm, lineHeight: 18, textAlign: 'center', marginBottom: 16 },
    emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.p, borderRadius: 20 },
    emptyBtnTxt: { fontSize: 13, fontWeight: '600', color: C.white },

    // モーダル共通
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    mhandle: { width: 36, height: 4, backgroundColor: C.bm, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
    modalTitle: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 14 },
    modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bd },
    modalIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center' },
    modalLabel: { fontSize: 14, color: C.t1 },
    modalSub: { fontSize: 11, color: C.tm },
    reqItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    acceptBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.p, borderRadius: 10 },
    rejectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.bm, borderRadius: 10 },

    // 投稿モーダル
    postInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.bd, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.t1, minHeight: 100, textAlignVertical: 'top', marginBottom: 6 },
    ctaBtn: { backgroundColor: C.p, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    ctaBtnTxt: { fontSize: 15, fontWeight: '700', color: C.white },

    // フレンド追加検索
    searchInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.bd, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: C.t1 },
    searchBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.p, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  });
}
