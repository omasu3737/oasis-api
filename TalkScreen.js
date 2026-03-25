import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
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

export default function TalkScreen({ navigation, onOpenAIChat }) {
  const [groups, setGroups] = useState([]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ヘッダー */}
      <View style={s.header}>
        <Text style={s.title}>トーク</Text>
        <TouchableOpacity style={s.menuBtn}>
          <View style={s.dot} /><View style={s.dot} /><View style={s.dot} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* AIカード */}
        <TouchableOpacity style={s.aiCard} onPress={() => onOpenAIChat && onOpenAIChat()}>
          <View style={s.aiOrb}>
            <Text style={{ fontSize: 22 }}>✦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiName}>AIと話す</Text>
            <Text style={s.aiSub}>話すほど人格が解明されます</Text>
          </View>
          <View style={s.aiBadge}>
            <Text style={s.aiBadgeTxt}>AI</Text>
          </View>
        </TouchableOpacity>

        {/* フレンドセクション */}
        <Text style={s.sectionSep}>フレンド</Text>
        <View style={s.emptyArea}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>👥</Text>
          <Text style={s.emptyTitle}>まだフレンドがいません</Text>
          <Text style={s.emptySub}>共鳴タブからユーザーを見つけて{'\n'}フレンドリクエストを送りましょう</Text>
        </View>

        {/* グループセクション */}
        {groups.length > 0 && (
          <>
            <Text style={s.sectionSep}>グループ</Text>
            {groups.map((g, i) => (
              <TouchableOpacity key={i} style={s.groupItem}>
                <View style={s.groupIcon}>
                  <Text style={{ fontSize: 20 }}>{g.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.groupName}>{g.name}</Text>
                  <Text style={s.groupSub}>グループ</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: '500', color: C.t1, letterSpacing: -0.5 },
  menuBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.p },
  aiCard: {
    marginHorizontal: 18, marginBottom: 8, backgroundColor: '#fff',
    borderWidth: 1, borderColor: C.bm, borderRadius: 18,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  aiOrb: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: C.pp, borderWidth: 2, borderColor: C.bm,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  aiName: { fontSize: 15, fontWeight: '500', color: C.t1 },
  aiSub: { fontSize: 11, color: C.tm, marginTop: 2 },
  aiBadge: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10,
    backgroundColor: C.p,
  },
  aiBadgeTxt: { fontSize: 10, color: '#fff' },
  sectionSep: {
    paddingHorizontal: 24, paddingVertical: 6,
    fontSize: 10, color: C.tm, textTransform: 'uppercase', letterSpacing: 1,
  },
  emptyArea: {
    paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center',
  },
  emptyTitle: { fontSize: 13, fontWeight: '500', color: C.t2, marginBottom: 4 },
  emptySub: { fontSize: 11, color: C.tm, lineHeight: 18, textAlign: 'center' },
  groupItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: C.bd,
  },
  groupIcon: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm,
    alignItems: 'center', justifyContent: 'center',
  },
  groupName: { fontSize: 14, fontWeight: '500', color: C.t1 },
  groupSub: { fontSize: 12, color: C.tm },
});