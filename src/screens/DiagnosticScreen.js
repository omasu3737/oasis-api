import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { supabase } from '../supabase';

const { width: SW } = Dimensions.get('window');

// ============================================================
// 32タイプマッピング（キー順: depth will action resonance stability）
// 4元素 × 8サブタイプ = 32タイプ
// 元素はWill × Resonanceで決まる:
//   風(Wind) = W高 & R高 / 炎(Fire) = W高 & R低
//   水(Water) = W低 & R高 / 地(Earth) = W低 & R低
// ============================================================
const TYPE_MAP = {
  // 🌬 風型 (W=1, R=1) 意思強×共鳴高 → リーダー・哲学者系
  '11111': '賢者',        // D高 W高 A高 R高 S高
  '11110': '革命家',      // D高 W高 A高 R高 S低
  '11011': '哲学者',      // D高 W高 A低 R高 S高
  '11010': '理想主義者',  // D高 W高 A低 R高 S低
  '01111': '指導者',      // D低 W高 A高 R高 S高
  '01110': '挑戦者',      // D低 W高 A高 R高 S低
  '01011': '調停者',      // D低 W高 A低 R高 S高
  '01010': '情熱家',      // D低 W高 A低 R高 S低

  // 🔥 炎型 (W=1, R=0) 意思強×独立系 → 戦略家・開拓者系
  '11101': '戦略家',      // D高 W高 A高 R低 S高
  '11100': '先駆者',      // D高 W高 A高 R低 S低
  '11001': '内省者',      // D高 W高 A低 R低 S高
  '11000': '探求者',      // D高 W高 A低 R低 S低
  '01101': '達成者',      // D低 W高 A高 R低 S高
  '01100': '開拓者',      // D低 W高 A高 R低 S低
  '01001': '規律者',      // D低 W高 A低 R低 S高
  '01000': '信念家',      // D低 W高 A低 R低 S低

  // 💧 水型 (W=0, R=1) 柔軟×共鳴高 → 共感者・夢想家系
  '10111': '共感者',      // D高 W低 A高 R高 S高
  '10110': '冒険者',      // D高 W低 A高 R高 S低
  '10011': '夢想家',      // D高 W低 A低 R高 S高
  '10010': '感受者',      // D高 W低 A低 R高 S低
  '00111': '社交家',      // D低 W低 A高 R高 S高
  '00110': '表現者',      // D低 W低 A高 R高 S低
  '00011': '調和者',      // D低 W低 A低 R高 S高
  '00010': '共鳴者',      // D低 W低 A低 R高 S低

  // 🌍 地型 (W=0, R=0) 柔軟×独立系 → 実践者・観察者系
  '10101': '実践者',      // D高 W低 A高 R低 S高
  '10100': '変革者',      // D高 W低 A高 R低 S低
  '10001': '熟考者',      // D高 W低 A低 R低 S高
  '10000': '孤高者',      // D高 W低 A低 R低 S低
  '00101': '実務家',      // D低 W低 A高 R低 S高
  '00100': '自由人',      // D低 W低 A高 R低 S低
  '00001': '平和主義者',  // D低 W低 A低 R低 S高
  '00000': '観察者',      // D低 W低 A低 R低 S低
};

// 4元素マッピング（Will × Resonance）
const ELEMENT_MAP = {
  Wind:  { emoji: '🌬', labelKey: 'diag_element_wind' },
  Fire:  { emoji: '🔥', labelKey: 'diag_element_fire' },
  Water: { emoji: '💧', labelKey: 'diag_element_water' },
  Earth: { emoji: '🌍', labelKey: 'diag_element_earth' },
};

// ============================================================
// 25問（5軸 × 5問、インターリーブ配置）
// 軸の順序をランダムに見せるため、各ラウンドでD→W→A→R→Sの順に出題
// 同じ軸の問題が連続しないため、回答バイアスを軽減できる
// ============================================================
const QUESTIONS = [
  // Round 1
  { axis: 0, key: 'diag_q1' },   // 深さ
  { axis: 1, key: 'diag_q2' },   // 意思
  { axis: 2, key: 'diag_q3' },   // 行動
  { axis: 3, key: 'diag_q4' },   // 共鳴
  { axis: 4, key: 'diag_q5' },   // 安定
  // Round 2
  { axis: 0, key: 'diag_q6' },
  { axis: 1, key: 'diag_q7' },
  { axis: 2, key: 'diag_q8' },
  { axis: 3, key: 'diag_q9' },
  { axis: 4, key: 'diag_q10' },
  // Round 3
  { axis: 0, key: 'diag_q11' },
  { axis: 1, key: 'diag_q12' },
  { axis: 2, key: 'diag_q13' },
  { axis: 3, key: 'diag_q14' },
  { axis: 4, key: 'diag_q15' },
  // Round 4
  { axis: 0, key: 'diag_q16' },
  { axis: 1, key: 'diag_q17' },
  { axis: 2, key: 'diag_q18' },
  { axis: 3, key: 'diag_q19' },
  { axis: 4, key: 'diag_q20' },
  // Round 5
  { axis: 0, key: 'diag_q21' },
  { axis: 1, key: 'diag_q22' },
  { axis: 2, key: 'diag_q23' },
  { axis: 3, key: 'diag_q24' },
  { axis: 4, key: 'diag_q25' },
];

const AXIS_KEYS = [
  'diag_axis_depth',
  'diag_axis_will',
  'diag_axis_action',
  'diag_axis_resonance',
  'diag_axis_stability',
];

const TOTAL = QUESTIONS.length;

// 各軸の5問合計（5〜25）を0〜100スコアに変換
function calcScores(answers) {
  const sums = [0, 0, 0, 0, 0];
  QUESTIONS.forEach((q, i) => { sums[q.axis] += answers[i]; });
  return sums.map(sum => Math.round((sum - 5) / 20 * 100));
}

// 5軸スコアから32タイプを判定（各軸50以上=高）
function determineType(scores) {
  const key = scores.map(s => s >= 50 ? '1' : '0').join('');
  return TYPE_MAP[key] || '観察者';
}

// Will×Resonanceから4元素を判定
function determineElement(scores) {
  const highWill = scores[1] >= 50; // index1 = will
  const highRes  = scores[3] >= 50; // index3 = resonance
  if (highWill && highRes)  return 'Wind';
  if (highWill && !highRes) return 'Fire';
  if (!highWill && highRes) return 'Water';
  return 'Earth';
}

// ============================================================
// DiagnosticScreen コンポーネント
// ============================================================
export default function DiagnosticScreen({ onComplete }) {
  const { colors: C, elementColors } = useTheme();
  const { t } = useI18n();
  const s = getStyles(C);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(Array(TOTAL).fill(null));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { scores, type, element }

  const current = answers[step];

  function selectAnswer(val) {
    const next = [...answers];
    next[step] = val;
    setAnswers(next);
    // Q1〜Q24は選択後に自動進行（Q25のみ手動で「診断完了」を押す）
    if (step < TOTAL - 1) {
      setTimeout(() => setStep(prev => prev + 1), 250);
    }
  }

  async function finishDiagnostic() {
    if (answers[TOTAL - 1] === null) return;
    setSaving(true);

    const scores = calcScores(answers);
    const type = determineType(scores);
    const element = determineElement(scores);

    // 結果画面を先に表示（保存は非同期で続行）
    setResult({ scores, type, element });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const raw_answers = {};
        answers.forEach((a, i) => { raw_answers[`q${i + 1}`] = a; });

        await supabase.from('diagnostic_results').upsert({
          user_id: user.id,
          depth_score:     scores[0],
          will_score:      scores[1],
          action_score:    scores[2],
          resonance_score: scores[3],
          stability_score: scores[4],
          personality_type: type,
          raw_answers,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        // MeScreen・共鳴タブで即時表示できるようusersも更新
        await supabase.from('users')
          .update({ type_name: type, element_type: element })
          .eq('id', user.id);
      }
    } catch {
      // 保存失敗してもウェルカム画面は表示する（次回ログイン時に再診断は不可だが許容）
    }

    setSaving(false);
  }

  // ── 結果画面 ─────────────────────────────
  if (result) {
    const el = ELEMENT_MAP[result.element];
    const elColor = elementColors?.[result.element];

    return (
      <SafeAreaView style={s.screen}>
        <ScrollView
          contentContainerStyle={s.resultWrap}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.welcomeTitle}>{t('diag_welcome_title')}</Text>
          <Text style={s.welcomeSub}>{t('diag_welcome_subtitle')}</Text>

          {/* 元素バッジ */}
          <View style={[s.elementBadge, elColor && {
            backgroundColor: elColor.bg,
            borderColor: elColor.border,
          }]}>
            <Text style={s.elementEmoji}>{el?.emoji}</Text>
            <Text style={[s.elementLabel, elColor && { color: elColor.text }]}>
              {t(el?.labelKey)}
            </Text>
          </View>

          {/* タイプ名 */}
          <View style={s.typeBadge}>
            <Text style={s.typeBadgeHint}>{t('diag_your_type')}</Text>
            <Text style={s.typeName}>{result.type}</Text>
            <Text style={s.typeSuffix}>{t('diag_type_suffix')}</Text>
          </View>

          {/* 5軸スコアバー */}
          <View style={s.scoresWrap}>
            {result.scores.map((score, i) => (
              <View key={i} style={s.scoreRow}>
                <Text style={s.scoreLabel}>{t(AXIS_KEYS[i])}</Text>
                <View style={s.scoreBarBg}>
                  <View style={[s.scoreBarFill, { width: `${score}%` }]} />
                </View>
                <Text style={s.scoreNum}>{score}</Text>
              </View>
            ))}
          </View>

          {/* 再診断注意 */}
          <Text style={s.retakeNote}>{t('diag_retake_locked')}</Text>

          {/* スタートボタン */}
          <TouchableOpacity
            style={s.startBtn}
            onPress={onComplete}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.startBtnTxt}>{t('diag_welcome_start')}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 設問画面 ─────────────────────────────
  const q = QUESTIONS[step];
  const progressPct = step / TOTAL * 100;

  return (
    <SafeAreaView style={s.screen}>
      {/* ヘッダー */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('diag_title')}</Text>
        <Text style={s.headerProgress}>{step + 1} / {TOTAL}</Text>
      </View>

      {/* プログレスバー */}
      <View style={s.progressBg}>
        <View style={[s.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {/* 軸ラベル（どの側面を測っているかを表示） */}
      <Text style={s.axisLabel}>{t(AXIS_KEYS[q.axis])}</Text>

      {/* 問題文 */}
      <View style={s.questionWrap}>
        <Text style={s.questionNum}>Q{step + 1}</Text>
        <Text style={s.questionText}>{t(q.key)}</Text>
      </View>

      {/* 5段階評価ボタン */}
      <View style={s.scaleWrap}>
        <View style={s.scaleRow}>
          {[1, 2, 3, 4, 5].map(val => (
            <TouchableOpacity
              key={val}
              style={[s.scaleBtn, current === val && s.scaleBtnActive]}
              onPress={() => selectAnswer(val)}
              activeOpacity={0.7}
            >
              <Text style={[s.scaleBtnNum, current === val && s.scaleBtnNumActive]}>
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.scaleLabelRow}>
          <Text style={s.scaleLabelLeft}>{t('diag_scale_1')}</Text>
          <Text style={s.scaleLabelRight}>{t('diag_scale_5')}</Text>
        </View>
      </View>

      {/* ナビゲーション */}
      <View style={s.navRow}>
        {step > 0
          ? (
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => setStep(prev => prev - 1)}
            >
              <Text style={s.backBtnTxt}>{t('diag_back')}</Text>
            </TouchableOpacity>
          )
          : <View style={s.backBtn} />}

        {step === TOTAL - 1
          ? (
            <TouchableOpacity
              style={[s.nextBtn, current === null && s.nextBtnDisabled]}
              onPress={finishDiagnostic}
              disabled={current === null || saving}
            >
              {saving
                ? <ActivityIndicator color={C.white} />
                : <Text style={s.nextBtnTxt}>{t('diag_finish')}</Text>}
            </TouchableOpacity>
          )
          : (
            <TouchableOpacity
              style={[s.nextBtn, current === null && s.nextBtnDisabled]}
              onPress={() => setStep(prev => prev + 1)}
              disabled={current === null}
            >
              <Text style={s.nextBtnTxt}>{t('diag_next')}</Text>
            </TouchableOpacity>
          )}
      </View>
    </SafeAreaView>
  );
}

function getStyles(C) {
  const BTN_SIZE = Math.floor((SW - 48 - 32) / 5);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: C.bg,
    },

    // ヘッダー
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: C.t1,
    },
    headerProgress: {
      fontSize: 13,
      color: C.tm,
      fontWeight: '500',
    },

    // プログレスバー
    progressBg: {
      height: 4,
      backgroundColor: C.bd,
      marginHorizontal: 24,
      borderRadius: 2,
    },
    progressFill: {
      height: 4,
      backgroundColor: C.p,
      borderRadius: 2,
    },

    // 軸ラベル
    axisLabel: {
      fontSize: 11,
      color: C.p,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 28,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },

    // 問題
    questionWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    questionNum: {
      fontSize: 12,
      color: C.tm,
      fontWeight: '600',
      marginBottom: 20,
    },
    questionText: {
      fontSize: 20,
      color: C.t1,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 32,
    },

    // スケールボタン
    scaleWrap: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    scaleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    scaleBtn: {
      width: BTN_SIZE,
      height: BTN_SIZE,
      borderRadius: BTN_SIZE / 2,
      backgroundColor: C.bs,
      borderWidth: 1.5,
      borderColor: C.bd,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scaleBtnActive: {
      backgroundColor: C.p,
      borderColor: C.p,
    },
    scaleBtnNum: {
      fontSize: 18,
      fontWeight: '600',
      color: C.t2,
    },
    scaleBtnNumActive: {
      color: C.white,
    },
    scaleLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingHorizontal: 4,
    },
    scaleLabelLeft: {
      fontSize: 11,
      color: C.tm,
    },
    scaleLabelRight: {
      fontSize: 11,
      color: C.tm,
    },

    // ナビゲーション
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 24,
      gap: 12,
    },
    backBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: C.bs,
      borderWidth: 1,
      borderColor: C.bd,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnTxt: {
      fontSize: 15,
      color: C.t2,
      fontWeight: '500',
    },
    nextBtn: {
      flex: 2,
      height: 48,
      borderRadius: 14,
      backgroundColor: C.p,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextBtnDisabled: {
      backgroundColor: C.bm,
    },
    nextBtnTxt: {
      fontSize: 15,
      color: C.white,
      fontWeight: '600',
    },

    // ── 結果画面 ──────────────────────────
    resultWrap: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 32,
      paddingBottom: 40,
    },
    welcomeTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: C.t1,
      textAlign: 'center',
      marginBottom: 8,
    },
    welcomeSub: {
      fontSize: 14,
      color: C.tm,
      textAlign: 'center',
      marginBottom: 24,
    },

    // 元素バッジ
    elementBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 20,
      borderWidth: 1.5,
      backgroundColor: C.bs,
      borderColor: C.bd,
      marginBottom: 16,
    },
    elementEmoji: {
      fontSize: 20,
    },
    elementLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: C.t2,
    },

    // タイプ名バッジ
    typeBadge: {
      alignItems: 'center',
      backgroundColor: C.pp,
      borderRadius: 24,
      paddingVertical: 24,
      paddingHorizontal: 48,
      marginBottom: 28,
      borderWidth: 1.5,
      borderColor: C.pm,
    },
    typeBadgeHint: {
      fontSize: 10,
      color: C.p,
      fontWeight: '700',
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    typeName: {
      fontSize: 34,
      fontWeight: '700',
      color: C.p,
    },
    typeSuffix: {
      fontSize: 15,
      color: C.t2,
      fontWeight: '500',
      marginTop: 4,
    },

    // 5軸スコアバー
    scoresWrap: {
      width: '100%',
      gap: 10,
      marginBottom: 20,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    scoreLabel: {
      fontSize: 12,
      color: C.t2,
      fontWeight: '500',
      width: 36,
    },
    scoreBarBg: {
      flex: 1,
      height: 8,
      backgroundColor: C.bd,
      borderRadius: 4,
      overflow: 'hidden',
    },
    scoreBarFill: {
      height: 8,
      backgroundColor: C.p,
      borderRadius: 4,
    },
    scoreNum: {
      fontSize: 12,
      color: C.tm,
      fontWeight: '500',
      width: 28,
      textAlign: 'right',
    },

    // 再診断注意書き
    retakeNote: {
      fontSize: 11,
      color: C.tm,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 17,
      paddingHorizontal: 8,
    },

    // スタートボタン
    startBtn: {
      width: '100%',
      height: 52,
      backgroundColor: C.p,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startBtnTxt: {
      fontSize: 16,
      fontWeight: '700',
      color: C.white,
    },
  });
}
