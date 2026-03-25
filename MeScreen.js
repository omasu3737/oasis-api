import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';

const C = {
  p: '#5a3fc0', pl: '#7b5ce0', pp: '#f0ecff',
  pm: '#c4b0f8', t1: '#18094a', t2: '#6b5a9e',
  tm: '#b0a8d0', bg: '#fdfcff', bd: '#ece6ff',
  bs: '#f8f5ff', bm: '#d8ceff',
};

// ─── アイコン（イニシャル円） ───
function UserIcon({ name = 'ユ', size = 72 }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.pp, borderWidth: 2, borderColor: C.bm,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Text style={{ fontSize: size * 0.32, color: C.p, fontWeight: '500' }}>
        {name?.[0] || '?'}
      </Text>
    </View>
  );
}

// ─── 空カード ───
function EmptyCard({ icon, title, sub }) {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyIcon}>{icon}</Text>
      {title && <Text style={s.emptyTitle}>{title}</Text>}
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

// ─── セクションラベル ───
function SLabel({ text }) {
  return <Text style={s.slabel}>{text}</Text>;
}

// ─── 区切り線 ───
function Divider() {
  return <View style={s.divider} />;
}

// ─── 人格レーダー ───
function RadarChart({ scores }) {
  const cx = 98, cy = 85, r = 75;
  const angles = [
    -Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6,
    3 * Math.PI / 2, 7 * Math.PI / 6, 11 * Math.PI / 6,
  ];
  const keys = ['introspection', 'creativity', 'intuition', 'empathy', 'action', 'social'];
  const pts = keys.map((k, i) => {
    const ratio = (scores[k] || 0) / 100;
    return `${(cx + Math.cos(angles[i]) * r * ratio).toFixed(1)},${(cy + Math.sin(angles[i]) * r * ratio).toFixed(1)}`;
  }).join(' ');

  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <Svg width={196} height={186} viewBox="0 0 196 186">
        <Defs>
          <LinearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#5a3fc0" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#c4b0f8" stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        <Polygon points="98,10 164,47 164,122 98,160 32,122 32,47" fill="none" stroke="#ece6ff" strokeWidth="1" />
        <Polygon points="98,32 148,60 148,108 98,138 48,108 48,60" fill="none" stroke="#ece6ff" strokeWidth="1" />
        <Polygon points="98,54 130,73 130,96 98,116 66,96 66,73" fill="none" stroke="#ece6ff" strokeWidth="1" />
        <Line x1="98" y1="10" x2="98" y2="85" stroke="#ece6ff" strokeWidth="0.7" />
        <Line x1="164" y1="47" x2="98" y2="85" stroke="#ece6ff" strokeWidth="0.7" />
        <Line x1="164" y1="122" x2="98" y2="85" stroke="#ece6ff" strokeWidth="0.7" />
        <Line x1="98" y1="160" x2="98" y2="85" stroke="#ece6ff" strokeWidth="0.7" />
        <Line x1="32" y1="122" x2="98" y2="85" stroke="#ece6ff" strokeWidth="0.7" />
        <Line x1="32" y1="47" x2="98" y2="85" stroke="#ece6ff" strokeWidth="0.7" />
        <Polygon points={pts} fill="url(#rg)" stroke="#5a3fc0" strokeWidth="1.8" strokeLinejoin="round" />
      </Svg>
      <View style={{ position: 'absolute', top: 2, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={s.rl}>内省</Text>
      </View>
      <View style={{ position: 'absolute', top: 40, right: 12 }}>
        <Text style={s.rl}>創造</Text>
      </View>
      <View style={{ position: 'absolute', bottom: 42, right: 12 }}>
        <Text style={s.rl}>共感</Text>
      </View>
      <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={s.rl}>行動</Text>
      </View>
      <View style={{ position: 'absolute', bottom: 42, left: 12 }}>
        <Text style={s.rl}>社交</Text>
      </View>
      <View style={{ position: 'absolute', top: 40, left: 12 }}>
        <Text style={s.rl}>直感</Text>
      </View>
    </View>
  );
}

// ─── 特性スコアバー ───
function TraitBar({ label, value }) {
  return (
    <View style={s.trRow}>
      <Text style={s.trLabel}>{label}</Text>
      <View style={s.trBar}>
        <View style={[s.trFill, { width: `${value}%` }]} />
      </View>
      <Text style={s.trVal}>{value > 0 ? value : '-'}</Text>
    </View>
  );
}

// ─── メイン ───
export default function MeScreen({ userName = 'ユーザー', personaData = null, convCount = 0 }) {
  const remaining = Math.max(0, 10 - convCount);
  const barPct = Math.min(100, (convCount / 10) * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ヘッダー */}
        <View style={s.header}>
          <Text style={s.name}>{userName}</Text>
            <TouchableOpacity style={s.editBtn}>
            <Svg width={15} height={15} viewBox="0 0 16 16">
            <Path d="M11 2l3 3-9 9H2v-3L11 2z" fill="none" stroke="#5a3fc0" strokeWidth="1.4" strokeLinejoin="round"/>
            </Svg>
            </TouchableOpacity>
        </View>

        {/* ヒーローエリア */}
        <View style={s.hero}>
          <UserIcon name={userName} size={72} />
          <View style={{ flex: 1 }}>
            <View style={s.elBadge}>
              <Text style={s.elBadgeTxt}>分析中...</Text>
            </View>
            <Text style={s.typeName}>AIと話すと判定されます</Text>
          </View>
        </View>

        {/* 会話カウンター */}
        <View style={s.counter}>
          <Text style={{ fontSize: 18 }}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.counterTxt}>人格分析まで <Text style={{ color: C.p }}>{remaining}</Text> 回の会話</Text>
            <Text style={s.counterSub}>AIと話すほど人格が解明されていきます</Text>
            <View style={s.barWrap}>
              <View style={[s.barFill, { width: `${barPct}%` }]} />
            </View>
          </View>
        </View>

        <Divider />

        {/* 人格レーダー */}
        <SLabel text="人格レーダー" />
        {personaData ? (
          <RadarChart scores={personaData} />
        ) : (
          <EmptyCard icon="🔮" title="まだ分析できていません"
            sub={`AIと10回会話すると\nあなたの人格レーダーが表示されます`} />
        )}

        {/* 特性スコア */}
        <SLabel text="特性スコア" />
        {personaData ? (
          <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
            {[
              ['内省', personaData.introspection],
              ['創造', personaData.creativity],
              ['直感', personaData.intuition],
              ['共感', personaData.empathy],
              ['行動', personaData.action],
              ['社交', personaData.social],
            ].map(([label, val]) => (
              <TraitBar key={label} label={label} value={val || 0} />
            ))}
          </View>
        ) : (
          <EmptyCard icon="📊" title="まだ分析できていません"
            sub={`AIと話すと6つの特性スコアが\n自動的に計算されます`} />
        )}

        <Divider />

        {/* 分析項目（空） */}
        <SLabel text="相性がいい人" />
        <EmptyCard icon="🤝" sub={`AIと話すとあなたと相性がいい\n人のタイプが分析されます`} />
        <SLabel text="価値観の優先順位" />
        <EmptyCard icon="⚖️" sub={`AIとの会話から\nあなたの価値観が分析されます`} />
        <SLabel text="愛着スタイル" />
        <EmptyCard icon="💞" sub={`AIとの会話から\nあなたの愛着スタイルが分析されます`} />
        <SLabel text="ストレス反応" />
        <EmptyCard icon="🌊" sub={`AIとの会話から\nあなたのストレス反応が分析されます`} />
        <SLabel text="エネルギーの源泉" />
        <EmptyCard icon="⚡" sub={`AIとの会話から\n充電・消耗するものが分析されます`} />
        <SLabel text="思考スタイル" />
        <EmptyCard icon="🧠" sub={`AIとの会話から\nあなたの思考パターンが分析されます`} />

        <Divider />

        {/* ボタン */}
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity style={s.shareBtn}>
            <Text style={s.shareBtnTxt}>シェア</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.previewBtn}>
            <Text style={s.shareBtnTxt}>プレビュー</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 50, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 26, fontWeight: '500', color: C.t1, letterSpacing: -0.5 },
  editBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 24, paddingBottom: 18 },
  elBadge: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 4 },
  elBadgeTxt: { fontSize: 10, color: '#999', fontWeight: '500' },
  typeName: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 4 },
  counter: { marginHorizontal: 24, marginBottom: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bd, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterTxt: { fontSize: 12, fontWeight: '500', color: C.t1, marginBottom: 2 },
  counterSub: { fontSize: 11, color: C.tm },
  barWrap: { height: 4, backgroundColor: C.pp, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 4, backgroundColor: C.p, borderRadius: 2 },
  divider: { height: 1, backgroundColor: C.bd, marginHorizontal: 24, marginBottom: 14 },
  slabel: { fontSize: 10, color: C.tm, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 24, marginBottom: 10 },
  emptyCard: { marginHorizontal: 24, marginBottom: 12, backgroundColor: C.bs, borderWidth: 1.5, borderColor: C.bm, borderStyle: 'dashed', borderRadius: 16, padding: 18, alignItems: 'center', gap: 6 },
  emptyIcon: { fontSize: 24 },
  emptyTitle: { fontSize: 12, fontWeight: '500', color: C.t2 },
  emptySub: { fontSize: 11, color: C.tm, lineHeight: 18, textAlign: 'center' },
  trRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  trLabel: { fontSize: 11, color: C.t2, width: 34 },
  trBar: { flex: 1, height: 4, backgroundColor: C.pp, borderRadius: 2, overflow: 'hidden' },
  trFill: { height: 4, backgroundColor: C.p, borderRadius: 2 },
  trVal: { fontSize: 11, color: C.tm, width: 24, textAlign: 'right' },
  rl: { fontSize: 10, color: C.p },
  shareBtn: { flex: 1, padding: 11, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
  previewBtn: { flex: 1, padding: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
  shareBtnTxt: { fontSize: 12, color: C.p },
});