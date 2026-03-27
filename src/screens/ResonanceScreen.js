import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, Share, StyleSheet, Text,
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

// Resonance level badge with color-coded ring
function ResonanceBadge({ score, C }) {
  const getColor = () => {
    if (score >= 80) return '#e040fb';
    if (score >= 65) return C.p;
    if (score >= 50) return C.pl;
    return C.tm;
  };
  const color = getColor();
  const label = score >= 80 ? '✦' : score >= 65 ? '◆' : '◇';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 52, height: 52, borderRadius: 26,
        borderWidth: 2.5, borderColor: color,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: color + '15',
      }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color, lineHeight: 20 }}>{score}</Text>
        <Text style={{ fontSize: 8, color, fontWeight: '600', marginTop: -1 }}>%</Text>
      </View>
      <Text style={{ fontSize: 9, color, fontWeight: '600', marginTop: 3 }}>{label}</Text>
    </View>
  );
}

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
  const { user, personaData, profile, score, bestCategory, bestCategoryKey } = item;
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

        {/* Resonance badge */}
        {score != null ? <ResonanceBadge score={score} C={C} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const st = {
  card: (C) => ({
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
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
  useEffect(() => { loadUsers(); }, []);

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

      const [{ data: userData }, { data: profiles }] = await Promise.all([
        supabase.from('users').select('id, name').in('id', userIds),
        supabase.from('profiles').select('id, display_name').in('id', userIds),
      ]);

      if (!userData) { setUsers([]); setLoading(false); return; }

      const personaMap = {};
      personas.forEach(p => { personaMap[p.user_id] = p; });
      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      let result = userData.map(u => {
        const pd = personaMap[u.id] || null;
        const score = calcResonanceScore(myPD, pd);
        const catScores = calcCategoryScores(myPD, pd);
        const bestCatKey = getBestCategory(catScores);
        return {
          user: u,
          personaData: pd,
          profile: profileMap[u.id] || null,
          score,
          catScores,
          bestCategoryKey: bestCatKey,
          bestCategory: bestCatKey ? CATEGORY_LABELS[bestCatKey] : null,
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

      result.sort((a, b) => (b.score || 0) - (a.score || 0));
      setUsers(result);
      setSearched(true);
    } catch (e) {
      console.log('loadUsers error:', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    loadUsers(query, activeFilter);
  }

  function handleFilterChange(key) {
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
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[s.filter, activeFilter === f.key && s.filterOn]}
                onPress={() => handleFilterChange(f.key)}
              >
                <Text style={[s.filterTxt, activeFilter === f.key && s.filterTxtOn]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
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
    </SafeAreaView>
  );
}

function getStyles(C) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: C.bd,
    },
    title: { fontSize: 26, fontWeight: '700', color: C.t1, letterSpacing: -0.5, marginBottom: 14 },
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
    emptyArea: { paddingVertical: 60, paddingHorizontal: 32, alignItems: 'center' },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: C.t2, marginBottom: 8, textAlign: 'center' },
    emptySub: { fontSize: 13, color: C.tm, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
    inviteBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.p, borderRadius: 24 },
    inviteBtnTxt: { fontSize: 14, fontWeight: '600', color: C.white },
  });
}
