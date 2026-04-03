import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { supabase } from '../supabase';

const { width: SW } = Dimensions.get('window');

// 32タイプマッピング（順: depth will action resonance stability, 1=high/0=low）
const TYPE_MAP = {
  '11111': '賢者',
  '11110': '革命家',
  '11101': '戦略家',
  '11100': '先駆者',
  '11011': '哲学者',
  '11010': '理想主義者',
  '11001': '内省者',
  '11000': '探求者',
  '10111': '共感者',
  '10110': '冒険者',
  '10101': '実践者',
  '10100': '変革者',
  '10011': '夢想家',
  '10010': '感受者',
  '10001': '熟考者',
  '10000': '孤高者',
  '01111': '指導者',
  '01110': '挑戦者',
  '01101': '達成者',
  '01100': '開拓者',
  '01011': '調停者',
  '01010': '情熱家',
  '01001': '規律者',
  '01000': '信念家',
  '00111': '社交家',
  '00110': '表現者',
  '00101': '実務家',
  '00100': '自由人',
  '00011': '調和者',
  '00010': '共鳴者',
  '00001': '平和主義者',
  '00000': '観察者',
};

// 25問（axis: 0=depth 1=will 2=action 3=resonance 4=stability）
const QUESTIONS = [
  { axis: 0, key: 'diag_q1' },
  { axis: 0, key: 'diag_q2' },
  { axis: 0, key: 'diag_q3' },
  { axis: 0, key: 'diag_q4' },
  { axis: 0, key: 'diag_q5' },
  { axis: 1, key: 'diag_q6' },
  { axis: 1, key: 'diag_q7' },
  { axis: 1, key: 'diag_q8' },
  { axis: 1, key: 'diag_q9' },
  { axis: 1, key: 'diag_q10' },
  { axis: 2, key: 'diag_q11' },
  { axis: 2, key: 'diag_q12' },
  { axis: 2, key: 'diag_q13' },
  { axis: 2, key: 'diag_q14' },
  { axis: 2, key: 'diag_q15' },
  { axis: 3, key: 'diag_q16' },
  { axis: 3, key: 'diag_q17' },
  { axis: 3, key: 'diag_q18' },
  { axis: 3, key: 'diag_q19' },
  { axis: 3, key: 'diag_q20' },
  { axis: 4, key: 'diag_q21' },
  { axis: 4, key: 'diag_q22' },
  { axis: 4, key: 'diag_q23' },
  { axis: 4, key: 'diag_q24' },
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

function calcScores(answers) {
  // 各軸の5問合計（5〜25）を0〜100に変換
  const sums = [0, 0, 0, 0, 0];
  QUESTIONS.forEach((q, i) => { sums[q.axis] += answers[i]; });
  return sums.map(sum => Math.round((sum - 5) / 20 * 100));
}

function determineType(scores) {
  const key = scores.map(s => s >= 50 ? '1' : '0').join('');
  return TYPE_MAP[key] || '探求者';
}

// 診断画面
export default function DiagnosticScreen({ onComplete }) {
  const { colors: C } = useTheme();
  const { t } = useI18n();
  const s = getStyles(C);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(Array(TOTAL).fill(null));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const current = answers[step];

  function selectAnswer(val) {
    const next = [...answers];
    next[step] = val;
    setAnswers(next);

    // Q1〜Q24は自動進行
    if (step < TOTAL - 1) {
      setTimeout(() => setStep(prev => prev + 1), 250);
    }
  }

  async function finishDiagnostic() {
    if (answers[TOTAL - 1] === null) return;
    setSaving(true);

    const scores = calcScores(answers);
    const type = determineType(scores);
    setResult({ scores, type });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const raw_answers = {};
        answers.forEach((a, i) => { raw_answers[`q${i + 1}`] = a; });

        await supabase.from('diagnostic_results').upsert({
          user_id: user.id,
          depth_score: scores[0],
          will_score: scores[1],
          action_score: scores[2],
          resonance_score: scores[3],
          stability_score: scores[4],
          personality_type: type,
          raw_answers,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        // MeScreenで即時表示できるようusersテーブルも更新
        await supabase.from('users')
          .update({ type_name: type })
          .eq('id', user.id);
      }
    } catch {
      // 保存失敗してもウェルカム画面は表示する
    }

    setSaving(false);
  }

  // 結果画面
  if (result) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.resultWrap}>
          <Text style={s.welcomeTitle}>{t('diag_welcome_title')}</Text>
          <Text style={s.welcomeSub}>{t('diag_welcome_subtitle')}</Text>

          <View style={s.typeBadge}>
            <Text style={s.typeBadgeLabel}>{t('diag_your_type')}</Text>
            <Text style={s.typeName}>{result.type}</Text>
            <Text style={s.typeSuffix}>{t('diag_type_suffix')}</Text>
          </View>

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

          <Text style={s.retakeNote}>{t('diag_retake_locked')}</Text>

          <TouchableOpacity
            style={s.startBtn}
            onPress={onComplete}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.startBtnTxt}>{t('diag_welcome_start')}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

      {/* 軸ラベル */}
      <Text style={s.axisLabel}>{t(AXIS_KEYS[q.axis])}</Text>

      {/* 問題文 */}
      <View style={s.questionWrap}>
        <Text style={s.questionNum}>Q{step + 1}</Text>
        <Text style={s.questionText}>{t(q.key)}</Text>
      </View>

      {/* 5段階ボタン */}
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
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(prev => prev - 1)}>
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
  const BTN_SIZE = (SW - 48 - 32) / 5; // 5ボタン均等配置

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
      fontSize: 12,
      color: C.p,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 32,
      letterSpacing: 1,
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
      fontSize: 13,
      color: C.tm,
      fontWeight: '600',
      marginBottom: 16,
    },
    questionText: {
      fontSize: 20,
      color: C.t1,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 30,
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
      fontSize: 17,
      fontWeight: '600',
      color: C.t2,
    },
    scaleBtnNumActive: {
      color: C.white,
    },
    scaleLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
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
      justifyContent: 'space-between',
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

    // 結果画面
    resultWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 24,
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
      marginBottom: 32,
    },
    typeBadge: {
      alignItems: 'center',
      backgroundColor: C.pp,
      borderRadius: 24,
      paddingVertical: 24,
      paddingHorizontal: 48,
      marginBottom: 32,
      borderWidth: 1.5,
      borderColor: C.pm,
    },
    typeBadgeLabel: {
      fontSize: 11,
      color: C.p,
      fontWeight: '600',
      letterSpacing: 1,
      marginBottom: 8,
    },
    typeName: {
      fontSize: 32,
      fontWeight: '700',
      color: C.p,
    },
    typeSuffix: {
      fontSize: 16,
      color: C.t2,
      fontWeight: '500',
      marginTop: 4,
    },

    // スコアバー
    scoresWrap: {
      width: '100%',
      gap: 10,
      marginBottom: 24,
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
      marginBottom: 24,
      lineHeight: 16,
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
