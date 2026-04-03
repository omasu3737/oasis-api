import { Ionicons } from '@expo/vector-icons';
import PaywallModal from '../components/PaywallModal';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  RefreshControl, ScrollView, Share, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserCardSkeleton } from '../components/SkeletonCard';
import UserIcon from '../components/UserIcon';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { getCurrentUser } from '../services/auth';
import { calcCategoryScores, calcResonanceScore, getBestCategory } from '../services/resonance';
import { supabase } from '../supabase';

// Category tag chip
function CategoryChip({ label, catKey, isDark }) {
  const colors = isDark
    ? {
        friend: { bg: '#1a2840', color: '#80b8ff' },
        romance: { bg: '#2d1a1a', color: '#ff9090' },
        work: { bg: '#2a2418', color: '#e0b070' },
      }
    : {
        friend: { bg: '#eef4ff', color: '#1a5fa8' },
        romance: { bg: '#fff0f0', color: '#c0392b' },
        work: { bg: '#fdf6ee', color: '#8a5a1a' },
      };
  const c = colors[catKey] || { bg: '#f0f0f0', color: '#666' };
  return (
    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: c.color }}>{label}</Text>
    </View>
  );
}

// User card with card styling
function UserCard({ item, onPress, C, elementColors, isDark, t }) {
  const { user, personaData, profile, score, bestCategory, bestCategoryKey, isPremium } = item;
  const displayName = profile?.display_name || user.name || t('resonance_default_user');
  const elementInfo = personaData?.element_type ? elementColors[personaData.element_type] : null;

  return (
    <TouchableOpacity
      style={[st.card(C), { marginHorizontal: 16, marginBottom: 10 }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {/* Avatar */}
        <UserIcon name={displayName} size={50} />

        {/* User info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.t1, flexShrink: 1 }} numberOfLines={1}>
              {displayName}
            </Text>
            {isPremium && (
              <Ionicons name="water" size={13} color="#FFD700" />
            )}
            {bestCategory ? (
              <CategoryChip label={bestCategory} catKey={bestCategoryKey} isDark={isDark} />
            ) : null}
          </View>

          {personaData?.persona_type ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {elementInfo && (
                <Text style={{ fontSize: 11 }}>{elementInfo.emoji}</Text>
              )}
              <Text style={{ fontSize: 12, color: C.p, fontWeight: '500' }}>
                {personaData.persona_type}
              </Text>
              {elementInfo && (
                <Text style={{ fontSize: 11, color: elementInfo.text }}>
                  {personaData.element_type}
                </Text>
              )}
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: C.tm, marginTop: 4 }}>{t('resonance_analyzing')}</Text>
          )}

          {/* Mini trait bars */}
          {personaData && (
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
              {['depth', 'will', 'action', 'resonance', 'stability'].map(trait => (
                <View key={trait} style={{ flex: 1 }}>
                  <View style={{ height: 3, backgroundColor: C.bd, borderRadius: 2 }}>
                    <View style={{
                      height: 3, borderRadius: 2,
                      backgroundColor: C.p + 'aa',
                      width: `${personaData[trait] || 0}%`,
                    }} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Resonance score */}
        <View style={{ paddingRight: 14, alignItems: 'flex-end', minWidth: 52 }}>
          {score != null ? (
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.p }}>{score}%</Text>
          ) : personaData ? (
            <Text style={{ fontSize: 14, color: C.tm }}>?%</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const st = {
  card: (C) => ({
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 9,
    borderWidth: 1,
    borderColor: C.bd,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  }),
};

export default function ResonanceScreen() {
  const { colors: C, elementColors, isDark } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [myPersonaData, setMyPersonaData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [genderFilter, setGenderFilter] = useState('all'); // 'all' | 'male' | 'female' | 'other'
  const [userTier, setUserTier] = useState('free'); // will be fetched from DB later
  const [showPaywall, setShowPaywall] = useState(false);
  const [dailyUser, setDailyUser] = useState(null); // 今日の共鳴ユーザー

  const FILTERS = [
    { key: 'all', label: t('resonance_filter_all') },
    { key: 'friend', label: t('resonance_friend') },
    { key: 'romance', label: t('resonance_romance') },
    { key: 'work', label: t('resonance_work') },
  ];

  const CATEGORY_LABELS = {
    friend: t('resonance_friend_suited'),
    romance: t('resonance_romance_suited'),
    work: t('resonance_work_suited'),
  };

  const s = getStyles(C);

  // Auto-load on mount
  useEffect(() => { loadUsers(); loadDailyResonance(); }, []);

  // Fetch subscription tier
  useEffect(() => {
    const fetchTier = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('subscriptions')
        .select('tier, expires_at')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (data && (!data.expires_at || new Date(data.expires_at) > new Date())) {
        setUserTier(data.tier);
      }
    };
    fetchTier();
  }, []);

  async function loadDailyResonance() {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      // 自分の人格データ取得
      const { data: myPD } = await supabase
        .from('persona_data')
        .select('depth, will, action, resonance, stability')
        .eq('user_id', currentUser.id)
        .single();
      if (!myPD) return;

      // 全ユーザーの共鳴スコア計算用データ取得
      const { data: personas } = await supabase
        .from('persona_data')
        .select('user_id, persona_type, element_type, depth, will, action, resonance, stability');
      if (!personas || personas.length === 0) return;

      const otherPersonas = personas.filter(p => p.user_id !== currentUser.id);
      if (otherPersonas.length === 0) return;

      // スコア計算してソート
      const scored = otherPersonas.map(p => ({
        ...p,
        score: calcResonanceScore(myPD, p),
      })).filter(p => p.score != null).sort((a, b) => b.score - a.score);

      if (scored.length === 0) return;

      // 日付シードで今日の1人を選出（上位10人の中から）
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const pool = scored.slice(0, Math.min(10, scored.length));
      const picked = pool[seed % pool.length];

      // プロフィール取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', picked.user_id)
        .maybeSingle();

      const { data: userRow } = await supabase
        .from('users')
        .select('name')
        .eq('id', picked.user_id)
        .maybeSingle();

      setDailyUser({
        userId: picked.user_id,
        name: profile?.display_name || userRow?.name || t('resonance_default_user'),
        avatarUrl: profile?.avatar_url || null,
        personaType: picked.persona_type || null,
        elementType: picked.element_type || null,
        score: picked.score,
      });
    } catch (e) {
      console.error('loadDailyResonance error:', e?.message || 'Unknown error');
    }
  }

  async function loadUsers(searchQuery = '', filterKey = 'all') {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) { setLoading(false); return; }

      const { data: myPD } = await supabase
        .from('persona_data')
        .select('depth, will, action, resonance, stability')
        .eq('user_id', currentUser.id)
        .single();
      setMyPersonaData(myPD);

      const { data: personas } = await supabase
        .from('persona_data')
        .select('user_id, persona_type, element_type, depth, will, action, resonance, stability');

      if (!personas || personas.length === 0) { setUsers([]); setLoading(false); return; }

      const userIds = personas.map(p => p.user_id).filter(id => id !== currentUser.id);
      if (userIds.length === 0) { setUsers([]); setLoading(false); return; }

      const [{ data: userData }, { data: profiles }, { data: subscriptions }] = await Promise.all([
        supabase.from('users').select('id, name').in('id', userIds),
        supabase.from('profiles').select('id, display_name, gender, love_preference').in('id', userIds),
        supabase.from('subscriptions').select('user_id, tier, expires_at').in('user_id', userIds),
      ]);

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('gender, love_preference')
        .eq('id', currentUser.id)
        .single();

      if (!userData) { setUsers([]); setLoading(false); return; }

      const personaMap = {};
      personas.forEach(p => { personaMap[p.user_id] = p; });
      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
      const subscriptionMap = {};
      (subscriptions || []).forEach(s => { subscriptionMap[s.user_id] = s; });

      const now = new Date();
      let result = userData.map(u => {
        const pd = personaMap[u.id] || null;
        const score = calcResonanceScore(myPD, pd);
        const catScores = calcCategoryScores(myPD, pd);
        const bestCatKey = getBestCategory(catScores);
        const sub = subscriptionMap[u.id];
        const isPremium = sub?.tier === 'premium' && (!sub.expires_at || new Date(sub.expires_at) > now);
        return {
          user: u,
          personaData: pd,
          profile: profileMap[u.id] || null,
          score,
          catScores,
          bestCategoryKey: bestCatKey,
          bestCategory: bestCatKey ? CATEGORY_LABELS[bestCatKey] : null,
          isPremium: !!isPremium,
        };
      });

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(r => {
          const name = r.profile?.display_name || r.user.name || '';
          return name.toLowerCase().includes(q);
        });
      }

      // Category filter
      if (filterKey !== 'all' && myPD) {
        result = result.filter(r => {
          if (!r.catScores) return false;
          const catScore = r.catScores[filterKey];
          const otherScores = Object.entries(r.catScores)
            .filter(([k]) => k !== filterKey)
            .map(([, v]) => v);
          return otherScores.every(other => catScore >= other - 5);
        });
      }

      // Romanceフィルター時：性別・恋愛対象でフィルタリング
      if (filterKey === 'romance' && myProfile) {
        const myGender = myProfile.gender || 'unset';
        const myPref = myProfile.love_preference || 'all';
        result = result.filter(r => {
          const theirGender = r.profile?.gender || 'unset';
          const theirPref = r.profile?.love_preference || 'all';
          // 自分の恋愛対象と相手の性別が一致
          const iWantThem = myPref === 'all' || myPref === theirGender;
          // 相手の恋愛対象と自分の性別が一致
          const theyWantMe = theirPref === 'all' || theirPref === myGender;
          return iWantThem && theyWantMe;
        });
      }

      result.sort((a, b) => (b.score || 0) - (a.score || 0));
      setUsers(result);
      setSearched(true);
    } catch (e) {
      console.error('loadUsers error:', e?.message || 'Unknown error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    loadUsers(query, activeFilter);
  }

  function handleFilterChange(key) {
    if (key !== 'all' && userTier === 'free') {
      setShowPaywall(true);
      return;
    }
    setActiveFilter(key);
    loadUsers(query, key);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadUsers(query, activeFilter);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>{t('tab_resonance')}</Text>

        {/* Search bar */}
        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            placeholder={t('resonance_search_placeholder')}
            placeholderTextColor={C.tm}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={s.searchBtn} onPress={handleSearch}>
            <Text style={s.searchBtnTxt}>{t('search')}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 2 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FILTERS.map(f => {
              const isLocked = f.key !== 'all' && userTier === 'free';
              const isActive = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[s.filter, isActive && s.filterOn, isLocked && { opacity: 0.6 }]}
                  onPress={() => handleFilterChange(f.key)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    {isLocked && (
                      <Ionicons name="lock-closed" size={10} color={isActive ? C.white : C.tm} />
                    )}
                    <Text style={[s.filterTxt, isActive && s.filterTxtOn, isLocked && !isActive && { color: C.tm }]}>
                      {f.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.p} colors={[C.p]} />}
      >
        {/* 今日の共鳴 */}
        {dailyUser ? (
          <View style={s.dailyCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Ionicons name="heart" size={14} color={C.p} />
              <Text style={s.dailyLabel}>{t('resonance_daily_title')}</Text>
              <Text style={s.dailyDate}>
                {new Date().getMonth() + 1}/{new Date().getDate()}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <UserIcon name={dailyUser.name} size={52} imageUrl={dailyUser.avatarUrl} />
              <View style={{ flex: 1 }}>
                <Text style={s.dailyName} numberOfLines={1}>{dailyUser.name}</Text>
                {dailyUser.personaType ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    {dailyUser.elementType && elementColors[dailyUser.elementType] ? (
                      <Text style={{ fontSize: 11 }}>{elementColors[dailyUser.elementType].emoji}</Text>
                    ) : null}
                    <Text style={s.dailyType}>{dailyUser.personaType}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.dailyScore}>{dailyUser.score}%</Text>
                <Text style={s.dailyScoreLabel}>{t('resonance_daily_score')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.dailyMsgBtn}
              onPress={() => navigation.navigate('UserProfile', {
                userId: dailyUser.userId,
                userName: dailyUser.name,
              })}
            >
              <Ionicons name="chatbubble-outline" size={14} color={C.white} />
              <Text style={s.dailyMsgTxt}>{t('resonance_daily_msg_btn')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={{ paddingTop: 8 }}>
            {[1,2,3,4].map(i => <UserCardSkeleton key={i} />)}
          </View>
        ) : users.length > 0 ? (
          <>
            {/* Result count */}
            <Text style={s.resultCount}>{users.length} {t('resonance_high')}</Text>
            {users.map((item, i) => (
              <UserCard
                key={item.user.id || i}
                item={item}
                C={C}
                elementColors={elementColors}
                isDark={isDark}
                t={t}
                onPress={() => navigation.navigate('UserProfile', {
                  userId: item.user.id,
                  userName: item.profile?.display_name || item.user.name,
                })}
              />
            ))}
          </>
        ) : (
          <View style={s.emptyArea}>
            <Text style={{ fontSize: 40, marginBottom: 14 }}>
              {searched && query ? '🔍' : '🌐'}
            </Text>
            <Text style={s.emptyTitle}>
              {searched && query
                ? t('resonance_not_found_query', { query })
                : t('resonance_no_users_yet')}
            </Text>
            <Text style={s.emptySub}>
              {searched && query
                ? t('resonance_try_different')
                : t('resonance_empty_hint')}
            </Text>
            {!query && (
              <TouchableOpacity
                style={s.inviteBtn}
                onPress={() => Share.share({
                  message: t('resonance_invite_msg'),
                  title: 'OASIS',
                })}
              >
                <Text style={s.inviteBtnTxt}>🔗 {t('resonance_invite')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureKey="resonance"
      />
    </SafeAreaView>
  );
}

function getStyles(C) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: C.bd,
    },
    title: { fontSize: 26, fontWeight: '500', color: C.t1, letterSpacing: -0.5, marginBottom: 14 },
    searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    searchInput: {
      flex: 1, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.bd,
      borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
      fontSize: 13, color: C.t1,
    },
    searchBtn: {
      paddingHorizontal: 18, paddingVertical: 10,
      backgroundColor: C.p, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
    },
    searchBtnTxt: { fontSize: 13, fontWeight: '600', color: C.white },
    filter: {
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
      borderWidth: 1.5, borderColor: C.bd, backgroundColor: C.card,
    },
    filterOn: { backgroundColor: C.p, borderColor: C.p },
    filterTxt: { fontSize: 12, fontWeight: '500', color: C.t2 },
    filterTxtOn: { color: C.white, fontWeight: '600' },
    resultCount: {
      fontSize: 12, color: C.tm, fontWeight: '500',
      paddingHorizontal: 20, marginBottom: 10,
    },
    // 今日の共鳴カード
    dailyCard: {
      marginHorizontal: 16, marginBottom: 14,
      backgroundColor: C.pp, borderWidth: 1, borderColor: C.pm,
      borderRadius: 18, padding: 16,
    },
    dailyLabel: { fontSize: 12, fontWeight: '700', color: C.p, flex: 1 },
    dailyDate: { fontSize: 11, color: C.tm },
    dailyName: { fontSize: 15, fontWeight: '600', color: C.t1 },
    dailyType: { fontSize: 12, color: C.p, fontWeight: '500' },
    dailyScore: { fontSize: 20, fontWeight: '700', color: C.p },
    dailyScoreLabel: { fontSize: 10, color: C.tm, marginTop: 2 },
    dailyMsgBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, marginTop: 14, backgroundColor: C.p,
      paddingVertical: 10, borderRadius: 14,
    },
    dailyMsgTxt: { fontSize: 13, fontWeight: '600', color: C.white },
    emptyArea: { paddingVertical: 60, paddingHorizontal: 32, alignItems: 'center' },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: C.t2, marginBottom: 8, textAlign: 'center' },
    emptySub: { fontSize: 13, color: C.tm, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
    inviteBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.p, borderRadius: 24 },
    inviteBtnTxt: { fontSize: 14, fontWeight: '600', color: C.white },
  });
}
