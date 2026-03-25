import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  p: '#5a3fc0', pl: '#7b5ce0', pp: '#f0ecff',
  pm: '#c4b0f8', t1: '#18094a', t2: '#6b5a9e',
  tm: '#b0a8d0', bg: '#fdfcff', bd: '#ece6ff',
  bs: '#f8f5ff', bm: '#d8ceff',
};

const FILTERS = ['高共鳴', '友人', '恋愛', '仕事'];

export default function ResonanceScreen() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('高共鳴');
  const [searched, setSearched] = useState(false);

  function doSearch() {
    if (!query.trim()) return;
    setSearched(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ヘッダー */}
      <View style={s.header}>
        <Text style={s.title}>共鳴</Text>

        {/* 検索バー */}
        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            placeholder="ユーザー名を検索..."
            placeholderTextColor={C.tm}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={doSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={s.searchBtn} onPress={doSearch}>
            <Text style={s.searchBtnTxt}>検索</Text>
          </TouchableOpacity>
        </View>

        {/* フィルター */}
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

      {/* コンテンツ */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={s.emptyArea}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
          <Text style={s.emptyTitle}>
            {searched ? `「${query}」は見つかりませんでした` : 'まだユーザーが見つかりません'}
          </Text>
          <Text style={s.emptySub}>
            {searched
              ? 'ユーザー名を確認してもう一度検索してください'
              : '他のユーザーが登録すると\n共鳴スコアとともに表示されます。\n\n上の検索欄でユーザー名を\n検索することもできます。'
            }
          </Text>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12,
  },
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
  searchBtnTxt: { fontSize: 13, color: '#fff', textAlign: 'center' },
  filter: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 18,
    borderWidth: 1, borderColor: C.bm, backgroundColor: '#fff',
  },
  filterOn: { backgroundColor: C.p, borderColor: C.p },
  filterTxt: { fontSize: 11, color: C.p },
  filterTxtOn: { color: '#fff' },
  emptyArea: {
    paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '500', color: C.t2, marginBottom: 6 },
  emptySub: { fontSize: 12, color: C.tm, lineHeight: 20, textAlign: 'center' },
});