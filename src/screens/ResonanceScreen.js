import { useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser } from '../services/auth';
import { supabase } from '../supabase';
import { C, ELEMENT_COLORS } from '../theme';

const FILTERS = ['全員', '友人', '恋愛', '仕事'];

function UserCard({ user, personaData, profile }) {
  const elementInfo = personaData?.element_type ? ELEMENT_COLORS[personaData.element_type] : null;
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'ユーザー';

  return (
    <TouchableOpacity style={s.userCard}>
      <View style={s.userIcon}>
        <Text style={{ fontSize: 18, color: C.p, fontWeight: '500' }}>
          {displayName[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.userName}>{displayName}</Text>
        {personaData ? (
          <Text style={s.userType}>{personaData.persona_type}</Text>
        ) : (
          <Text style={s.userTypeMuted}>分析中...</Text>
        )}
      </View>
      {elementInfo && (
        <View style={[s.elementBadge, { backgroundColor: elementInfo.bg, borderColor: elementInfo.border }]}>
          <Text style={[s.elementBadgeTxt, { color: elementInfo.text }]}>
            {elementInfo.emoji} {personaData.element_type}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ResonanceScreen() {
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

      let personaQuery = supabase
        .from('persona_data')
        .select('user_id, persona_type, element_type, depth, will, action, resonance, stability');

      if (activeFilter !== '全員') {
        personaQuery = personaQuery.eq('element_type', activeFilter);
      }

      const { data: personas } = await personaQuery;

      if (!personas || personas.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const userIds = personas
        .map(p => p.user_id)
        .filter(id => id !== currentUser?.id);

      const { data: userData } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      if (!userData) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // プロフィール（display_name）を取得
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      const personaMap = {};
      personas.forEach(p => { personaMap[p.user_id] = p; });

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      let result = userData.map(u => ({
        user: u,
        personaData: personaMap[u.id] || null,
        profile: profileMap[u.id] || null,
      }));

      if (query.trim()) {
        const q = query.toLowerCase();
        result = result.filter(r => {
          const name = r.profile?.display_name || r.user.email || '';
          return name.toLowerCase().includes(q);
        });
      }

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

      <View style={s.header}>
        <Text style={s.title}>共鳴</Text>
        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            placeholder="ユーザー名を検索..."
            placeholderTextColor={C.tm}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={doSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={s.searchBtn} onPress={doSearch}>
            <Text style={s.searchBtnTxt}>検索</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[s.filter, activeFilter === f && s.filterOn]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[s.filterTxt, activeFilter === f && s.filterTxtOn]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.emptyArea}>
            <ActivityIndicator color={C.p} />
          </View>
        ) : users.length > 0 ? (
          <View style={{ paddingTop: 8 }}>
            {users.map((item, i) => (
              <UserCard key={i} user={item.user} personaData={item.personaData} profile={item.profile} />
            ))}
          </View>
        ) : (
          <View style={s.emptyArea}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
            <Text style={s.emptyTitle}>
              {searched
                ? query ? `「${query}」は見つかりませんでした` : 'ユーザーが見つかりませんでした'
                : 'まだユーザーが見つかりません'
              }
            </Text>
            <Text style={s.emptySub}>
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

const s = StyleSheet.create({
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
  userIcon: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm,
    alignItems: 'center', justifyContent: 'center',
  },
  userName: { fontSize: 14, fontWeight: '500', color: C.t1 },
  userType: { fontSize: 11, color: C.p, marginTop: 2 },
  userTypeMuted: { fontSize: 11, color: C.tm, marginTop: 2 },
  elementBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
  },
  elementBadgeTxt: { fontSize: 10, fontWeight: '500' },
  emptyArea: { paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '500', color: C.t2, marginBottom: 6 },
  emptySub: { fontSize: 12, color: C.tm, lineHeight: 20, textAlign: 'center' },
});
