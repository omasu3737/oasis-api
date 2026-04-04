import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getCurrentUser } from '../services/auth';
import { saveDiagnosticResult } from '../services/persona';

// 25問（5軸 × 5問）
const QUESTIONS = [
  // depth（内省・深さ）
  { text: '一人で静かに考える時間が好きだ', axis: 'depth' },
  { text: '物事の意味や本質を深く考えることが多い', axis: 'depth' },
  { text: '自分の感情や思考をよく振り返る', axis: 'depth' },
  { text: '複雑な問題でも丁寧に分析しようとする', axis: 'depth' },
  { text: '表面的なことより深い理解を求める', axis: 'depth' },
  // will（意思・意志）
  { text: '一度決めたことはやり遂げる', axis: 'will' },
  { text: '困難があっても諦めずに続けられる', axis: 'will' },
  { text: '自分の意見をはっきり伝えられる', axis: 'will' },
  { text: '周りに流されず自分の考えを貫ける', axis: 'will' },
  { text: '信念に基づいて行動することが多い', axis: 'will' },
  // action（行動力）
  { text: '新しいことに積極的に挑戦するほうだ', axis: 'action' },
  { text: 'チャンスがあればすぐに行動できる', axis: 'action' },
  { text: '考えすぎず、まず動いてみることが多い', axis: 'action' },
  { text: '行動力があると言われたことがある', axis: 'action' },
  { text: '計画を立てるより実行することが好きだ', axis: 'action' },
  // resonance（共鳴・共感）
  { text: '他人の気持ちに共感しやすい', axis: 'resonance' },
  { text: '人間関係や繋がりを大切にする', axis: 'resonance' },
  { text: '誰かと気持ちを共有することが好きだ', axis: 'resonance' },
  { text: '場の雰囲気を読むのが得意なほうだ', axis: 'resonance' },
  { text: '他者の悩みを自分のことのように感じる', axis: 'resonance' },
  // stability（安定性）
  { text: '感情の浮き沈みが少ないほうだ', axis: 'stability' },
  { text: '予期しないことが起きても冷静でいられる', axis: 'stability' },
  { text: 'ストレスがあっても落ち着いて対処できる', axis: 'stability' },
  { text: '日常が乱れても動じないほうだ', axis: 'stability' },
  { text: '精神的に安定していると言われることが多い', axis: 'stability' },
];

const CHOICES = [
  { value: 1, label: '全くちがう' },
  { value: 2, label: 'ちがう' },
  { value: 3, label: 'どちらでも' },
  { value: 4, label: 'そう思う' },
  { value: 5, label: 'とてもそう' },
];

// 軸名ラベル
const AXIS_LABELS = {
  depth: '内省・深さ',
  will: '意思・意志',
  action: '行動力',
  resonance: '共鳴・共感',
  stability: '安定性',
};

// 32タイプマップ（DWARS形式: Depth/Will/Action/Resonance/Stability 各H/L）
const TYPE_MAP = {
  // Fire（A=H, R=H）
  HHHHH: '先見者', HHHHL: '覚醒者',
  HLHHH: '哲学者', HLHHL: '探索者',
  LHHHH: '先駆者', LHHHL: '情熱家',
  LLHHH: '共感者', LLHHL: '自由人',
  // Water（A=H, R=L）
  HHHLH: '戦略家', HHHLL: '発明家',
  HLHLH: '職人',   HLHLL: '探検家',
  LHHLH: '実行者', LHHLL: '挑戦者',
  LLHLH: '冒険家', LLHLL: '開拓者',
  // Wind（A=L, R=L）
  HHLLH: '内省者', HHLLL: '思索家',
  HLLLH: '研究者', HLLLL: '夢想家',
  LHLLH: '完璧主義者', LHLLL: '野心家',
  LLLLH: '静観者', LLLLL: '求道者',
  // Earth（A=L, R=H）
  HHLHH: '賢者',   HHLHL: '調停者',
  HLLHH: '観察者', HLLHL: '詩人',
  LHLHH: '守護者', LHLHL: '支援者',
  LLLHH: '癒し手', LLLHL: '共鳴者',
};

function calcResults(answers) {
  const sums = { depth: 0, will: 0, action: 0, resonance: 0, stability: 0 };
  QUESTIONS.forEach((q, i) => { sums[q.axis] += answers[i] || 3; });

  // 5〜25 → 0〜100 に変換
  const toScore = (raw) => Math.round(((raw - 5) / 20) * 100);
  const scores = {
    depth: toScore(sums.depth),
    will: toScore(sums.will),
    action: toScore(sums.action),
    resonance: toScore(sums.resonance),
    stability: toScore(sums.stability),
  };

  // 元素タイプ（ActionとResonanceのH/Lで決定）
  let element_type;
  if (scores.action > 50 && scores.resonance > 50) element_type = 'Fire';
  else if (scores.action > 50 && scores.resonance <= 50) element_type = 'Water';
  else if (scores.action <= 50 && scores.resonance > 50) element_type = 'Earth';
  else element_type = 'Wind';

  // 人格タイプキー（DWARS）
  const key = [
    scores.depth > 50 ? 'H' : 'L',
    scores.will > 50 ? 'H' : 'L',
    scores.action > 50 ? 'H' : 'L',
    scores.resonance > 50 ? 'H' : 'L',
    scores.stability > 50 ? 'H' : 'L',
  ].join('');

  const persona_type = TYPE_MAP[key] || '探求者';
  return { ...scores, element_type, persona_type };
}

export default function DiagnosticScreen({ onComplete }) {
  const { colors: C } = useTheme();
  const s = getStyles(C);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const q = QUESTIONS[current];
  const progress = (current + 1) / QUESTIONS.length;
  const selectedValue = answers[current];

  async function handleSubmit(finalAnswers) {
    setSaving(true);
    try {
      const user = await getCurrentUser();
      if (!user) { setSaving(false); return; }
      const results = calcResults(finalAnswers);
      await saveDiagnosticResult(user.id, results);
      onComplete();
    } catch (e) {
      console.log('Diagnostic save error:', e);
    } finally {
      setSaving(false);
    }
  }

  function handleSelect(value) {
    const next = { ...answers, [current]: value };
    setAnswers(next);
    if (current < QUESTIONS.length - 1) {
      setCurrent(c => c + 1);
    } else {
      handleSubmit(next);
    }
  }

  if (saving) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={C.p} />
        <Text style={{ marginTop: 16, fontSize: 14, color: C.t2 }}>分析中...</Text>
        <Text style={{ marginTop: 6, fontSize: 11, color: C.tm }}>あなたのタイプを判定しています</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* プログレスバー */}
      <View style={s.progressWrap}>
        <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* ヘッダー */}
      <View style={s.header}>
        {current > 0 ? (
          <TouchableOpacity onPress={() => setCurrent(c => c - 1)} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={C.t2} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <Text style={s.counter}>{current + 1} / {QUESTIONS.length}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 質問エリア */}
      <View style={s.body}>
        <View style={s.axisChip}>
          <Text style={s.axisLabel}>{AXIS_LABELS[q.axis]}</Text>
        </View>
        <Text style={s.question}>{q.text}</Text>
      </View>

      {/* 選択肢 */}
      <View style={s.choices}>
        {CHOICES.map((choice) => (
          <TouchableOpacity
            key={choice.value}
            style={[s.choiceBtn, selectedValue === choice.value && s.choiceBtnOn]}
            onPress={() => handleSelect(choice.value)}
            activeOpacity={0.7}
          >
            <View style={[s.choiceDot, selectedValue === choice.value && s.choiceDotOn]} />
            <Text style={[s.choiceTxt, selectedValue === choice.value && s.choiceTxtOn]}>
              {choice.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function getStyles(C) {
  return StyleSheet.create({
    progressWrap: { height: 3, backgroundColor: C.bm },
    progressFill: { height: 3, backgroundColor: C.p },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 14,
    },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    counter: { fontSize: 12, color: C.tm },
    body: {
      flex: 1, paddingHorizontal: 28, justifyContent: 'center',
      paddingBottom: 40, alignItems: 'center',
    },
    axisChip: {
      backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm,
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 24,
    },
    axisLabel: { fontSize: 11, color: C.p, fontWeight: '500' },
    question: {
      fontSize: 20, fontWeight: '500', color: C.t1,
      lineHeight: 32, textAlign: 'center',
    },
    choices: { paddingHorizontal: 24, paddingBottom: 40, gap: 8 },
    choiceBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 18, paddingVertical: 14,
      borderRadius: 16, backgroundColor: C.card,
      borderWidth: 1.5, borderColor: C.bd,
    },
    choiceBtnOn: { backgroundColor: C.pp, borderColor: C.p },
    choiceDot: {
      width: 18, height: 18, borderRadius: 9,
      borderWidth: 1.5, borderColor: C.bm,
    },
    choiceDotOn: { backgroundColor: C.p, borderColor: C.p },
    choiceTxt: { fontSize: 14, color: C.t2 },
    choiceTxtOn: { color: C.p, fontWeight: '500' },
  });
}
