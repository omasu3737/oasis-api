import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserIcon from '../components/UserIcon';
import { getCurrentUser } from '../services/auth';
import { calcCategoryScores, calcResonanceScore, getBestCategory } from '../services/resonance';
import { supabase } from '../supabase';
import { C, ELEMENT_COLORS } from '../theme';

const FILTERS = ['全員', '友人', '恋愛', '仕事'];
const FILTER_KEYS = { '友人': 'friend', '恋愛': 'romance', '仕事': 'work' };

function ScoreBadge({ score }) {
  const color = score >= 75 ? '#e05050' : score >= 50 ? C.p : C.tm;
  const bg = score >= 75 ? '#fff0f0' : score >= 50 ? C.pp : '#f5f5f5';
  return (
    <View style={[st.scoreBadge, { backgroundColor: bg, borderColor: color + '30' }]}>
      <Text style={[st.scoreNum, { color }]}>{score}</Text>
      <Text style={[st.scorePct, { color }]}>%</Text>
    </View>
  );
}

function CategoryTag({ label }) {
  const colors = {
    '友人': { bg: '#eef4ff', color: '#1a5fa8' },
    '恋愛': { bg: '#fff0f0', color: '#c0392b' },
    '仕事': { bg: '#fdf6ee', color: '#8a5a1a' },
  };
  const c = colors[label] || { bg: C.pp, color: C.p };
  return (
    <View style={[st.catTag, { backgroundColor: c.bg }]}>
      <Text style={[st.catTagTxt, { color: c.color }]}>{label}向き</Text>
    </View>
  );
}

function UserCard({ user, personaData, profile, score, bestCategory, onPress }) {
  const elementInfo = personaData?.element_type ? ELEMENT_COLORS[personaData.element_type] : null;
  const displayName = profile?.display_name || user.name || 'ユーザー';

  return (
    <TouchableOpacity style={st.userCard} onPress={onPress}>
      <UserIcon name={displayName} size={46} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={st.userName} numberOfLines={1}>{displayName}</Text>
          {bestCategory ? <CategoryTag label={bestCategory} /> : null}
        </View>
        {personaData ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={st.userType}>{personaData.persona_type}</Text>
            {elementInfo && (
              <Text style={[st.elMini, { color: elementInfo.text }]}>
                {elementInfo.emoji} {personaData.element_type}
              </Text>
            )}
          </View>
        ) : (
          <Text style={st.userTypeMuted}>分析中...</Text>
        )}
      </View>
      {score != null ? <ScoreBadge score={score} /> : null}
    </TouchableOpacity>
  );
}

export default function ResonanceScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('全員');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch() {
    setLoading(true);
    setSearched(true);
    try {
      const currentUser = await getCurrentUser();

      // 自分のpersona_dataを取得
      const { data: myPersonaData } = await supabase
        .from('persona_data')
        .select('depth, will, action, resonance, stability')
        .eq('user_id', currentUser?.id)
        .single();

      const { data: personas } = await supabase
        .from('persona_data')
        .select('user_id, persona_type, element_type, depth, will, action, resonance, stability');

      if (!personas || personas.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const userIds = personas
        .map(p => p.user_id)
        .filter(id => id !== currentUser?.id);

      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const [{ data: userData }, { data: profiles }] = await Promise.all([
        supabase.from('users').select('id, name').in('id', userIds),
        supabase.from('profiles').select('id, display_name').in('id', userIds),
      ]);

      if (!userData) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const personaMap = {};
      personas.forEach(p => { personaMap[p.user_id] = p; });

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      let result = userData.map(u => {
        const pd = personaMap[u.id] || null;
        const score = calcResonanceScore(myPersonaData, pd);
        const catScores = calcCategoryScores(myPersonaData, pd);
        const bestCat = getBestCategory(catScores);
        return {
          user: u,
          personaData: pd,
          profile: profileMap[u.id] || null,
          score,
          catScores,
          bestCategory: bestCat,
        };
      });

      // テキスト検索
      if (query.trim()) {
        const q = query.toLowerCase();
        result = result.filter(r => {
          const name = r.profile?.display_name || r.user.name || '';
          return name.toLowerCase().includes(q);
        });
      }

      // カテゴリフィルター
      const filterKey = FILTER_KEYS[activeFilter];
      if (filterKey && myPersonaData) {
        // そのカテゴリのスコアが最も高いユーザーだけ表示
        result = result.filter(r => {
          if (!r.catScores) return false;
          const catScore = r.catScores[filterKey];
          const otherScores = Object.entries(r.catScores)
            .filter(([k]) => k !== filterKey)
            .map(([, v]) => v);
          // そのカテゴリが最も高いか、差が5以内なら含める
          return otherScores.every(other => catScore >= other - 5);
        });
      }

      // 共鳴スコア降順ソート
      result.sort((a, b) => (b.score || 0) - (a.score || 0));

      setUsers(result);
    } catch (e) {
      console.log('doSearch error:', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      <View style={st.header}>
        <Text style={st.title}>共鳴</Text>
        <View style={st.searchRow}>
          <TextInput
            style={st.searchInput}
            placeholder="ユーザー名を検索..."
            placeholderTextColor={C.tm}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={doSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={st.searchBtn} onPress={doSearch}>
            <Text style={st.searchBtnTxt}>検索</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[st.filter, activeFilter === f && st.filterOn]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[st.filterTxt, activeFilter === f && st.filterTxtOn]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={st.emptyArea}>
            <ActivityIndicator color={C.p} />
          </View>
        ) : users.length > 0 ? (
          <View style={{ paddingTop: 4 }}>
            {users.map((item, i) => (
              <UserCard
                key={item.user.id || i}
                user={item.user}
                personaData={item.personaData}
                profile={item.profile}
                score={item.score}
                bestCategory={item.bestCategory}
                onPress={() => navigation.navigate('UserProfile', {
                  userId: item.user.id,
                  userName: item.profile?.display_name || item.user.name,
                })}
              />
            ))}
          </View>
        ) : (
          <View style={st.emptyArea}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
            <Text style={st.emptyTitle}>
              {searched
                ? query ? `「${query}」は見つかりませんでした` : 'ユーザーが見つかりませんでした'
                : 'まだユーザーが見つかりません'
              }
            </Text>
            <Text style={st.emptySub}>
              {searched
                ? 'フィルターや検索ワードを変えてみてください'
                : '他のユーザーが登録すると\n共鳴スコアとともに表示されます\n\n上の検索欄でユーザーを\n検索することもできます'
              }
            </Text>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '500', color: C.t1, letterSpacing: -0.5, marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: {
    flex: 1, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm,
    borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10,
    fontSize: 13, color: C.t1,
  },
  searchBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.p, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBtnTxt: { fontSize: 13, color: '#fff' },
  filter: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 18,
    borderWidth: 1, borderColor: C.bm, backgroundColor: '#fff',
  },
  filterOn: { backgroundColor: C.p, borderColor: C.p },
  filterTxt: { fontSize: 11, color: C.p },
  filterTxtOn: { color: '#fff' },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.bd,
    backgroundColor: '#fff',
  },
  userName: { fontSize: 14, fontWeight: '500', color: C.t1, flexShrink: 1 },
  userType: { fontSize: 11, color: C.p },
  userTypeMuted: { fontSize: 11, color: C.tm, marginTop: 2 },
  elMini: { fontSize: 10 },
  // スコアバッジ
  scoreBadge: {
    alignItems: 'center', justifyContent: 'center',
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5,
  },
  scoreNum: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  scorePct: { fontSize: 9, fontWeight: '500', marginTop: -2 },
  // カテゴリタグ
  catTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  catTagTxt: { fontSize: 9, fontWeight: '500' },
  // 空
  emptyArea: { paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '500', color: C.t2, marginBottom: 6 },
  emptySub: { fontSize: 12, color: C.tm, lineHeight: 20, textAlign: 'center' },
});
