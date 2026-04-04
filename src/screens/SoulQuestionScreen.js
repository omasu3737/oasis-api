/**
 * SoulQuestionScreen — 魂の問答・質問詳細 + 回答一覧 + 回答投稿
 *
 * route.params:
 *   questionId     : string  質問ID
 *   currentElement : string  現在ユーザーの元素タイプ (Fire/Water/Wind/Earth)
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserIcon from '../components/UserIcon';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { getCurrentUser } from '../services/auth';
import { supabase } from '../supabase';

const ELEMENT_COLORS = { Fire: '#E85D3A', Water: '#3B82F6', Wind: '#10B981', Earth: '#8B6914' };
const ELEMENT_EMOJIS = { Fire: '🔥', Water: '💧', Wind: '🌬', Earth: '🌍' };

function formatRelativeTime(dateStr, t) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return t('time_just_now');
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('time_min_ago')}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t('time_hour_ago')}`;
  return `${Math.floor(diff / 86400)}${t('time_day_ago')}`;
}

export default function SoulQuestionScreen() {
  const { colors: C } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const route = useRoute();
  const { questionId, currentElement } = route.params;

  const [question, setQuestion]         = useState(null);
  const [answers, setAnswers]           = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myAnswer, setMyAnswer]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [answerText, setAnswerText]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const scrollRef = useRef(null);

  const s = getStyles(C);

  const canAnswer = question && currentElement === question.element_type;

  useEffect(() => { init(); }, []);

  async function init() {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUserId(user.id);
      await Promise.all([fetchQuestion(), fetchAnswers(user.id)]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuestion() {
    const { data } = await supabase
      .from('soul_questions')
      .select('id, content, answer_count, likes_count, personality_type, created_at, user_id')
      .eq('id', questionId)
      .single();
    if (!data) return;

    const { data: profile } = await supabase
      .from('profiles').select('display_name').eq('id', data.user_id).maybeSingle();

    setQuestion({
      ...data,
      element_type: data.personality_type,
      display_name: profile?.display_name || t('talk_default_user'),
    });
  }

  async function fetchAnswers(userId) {
    const { data } = await supabase
      .from('soul_answers')
      .select('id, content, created_at, user_id, likes_count')
      .eq('question_id', questionId)
      .order('created_at', { ascending: false });

    if (!data) return;

    const userIds = [...new Set(data.map(a => a.user_id))];
    const { data: profiles } = await supabase
      .from('profiles').select('id, display_name').in('id', userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    const enriched = data.map(a => ({
      ...a,
      display_name: profileMap[a.user_id]?.display_name || t('talk_default_user'),
    }));
    setAnswers(enriched);
    setMyAnswer(enriched.find(a => a.user_id === userId) ?? null);
  }

  async function handleSubmitAnswer() {
    if (!answerText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('soul_answers').insert({
        question_id: questionId,
        user_id: currentUserId,
        content: answerText.trim(),
      });
      if (error) {
        if (error.code === '23505') {
          Alert.alert(t('error'), t('soul_already_answered'));
        }
        return;
      }
      setAnswerText('');
      await fetchAnswers(currentUserId);
      await fetchQuestion();
      scrollRef.current?.scrollToEnd({ animated: true });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.p} size="large" />
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 20 }}>
          <Ionicons name="chevron-back" size={28} color={C.t1} />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: C.t2 }}>{t('soul_not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const elColor = ELEMENT_COLORS[question.element_type] || C.tm;
  const elEmoji = ELEMENT_EMOJIS[question.element_type] || '';
  const elKey   = (question.element_type || '').toLowerCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ナビゲーションバー */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.navTitle}>{t('soul_section')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 質問カード */}
          <View style={s.questionCard}>
            <View style={s.questionTop}>
              <View style={[s.elBadge, { backgroundColor: elColor + '22' }]}>
                <Text style={{ fontSize: 12 }}>{elEmoji}</Text>
                <Text style={[s.elBadgeTxt, { color: elColor }]}>{t('element_' + elKey)}</Text>
              </View>
              <Text style={s.questionTime}>{formatRelativeTime(question.created_at, t)}</Text>
            </View>
            <View style={s.questionUserRow}>
              <UserIcon name={question.display_name} size={32} />
              <Text style={s.questionUser}>{question.display_name}</Text>
            </View>
            <Text style={s.questionContent}>{question.content}</Text>
            <View style={s.questionStats}>
              <Ionicons name="chatbubble-outline" size={13} color={C.tm} />
              <Text style={s.statTxt}>{question.answer_count}{t('soul_answers_unit')}</Text>
            </View>
          </View>

          {/* 回答一覧 */}
          <Text style={s.sectionLabel}>{t('soul_answers_title')}</Text>

          {answers.length === 0 ? (
            <View style={s.answersEmpty}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>💬</Text>
              <Text style={s.emptyTxt}>{t('soul_no_answers')}</Text>
              {canAnswer && <Text style={s.emptySubTxt}>{t('soul_be_first')}</Text>}
            </View>
          ) : (
            answers.map(a => (
              <View key={a.id} style={[s.answerCard, a.user_id === currentUserId && s.myAnswerCard]}>
                <View style={s.answerTop}>
                  <UserIcon name={a.display_name} size={30} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={s.answerUser}>{a.display_name}</Text>
                    <Text style={s.answerTime}>{formatRelativeTime(a.created_at, t)}</Text>
                  </View>
                  {a.user_id === currentUserId && (
                    <View style={s.myBadge}>
                      <Text style={s.myBadgeTxt}>{t('soul_my_answer')}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.answerContent}>{a.content}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* 回答入力エリア */}
        {myAnswer ? (
          <View style={s.alreadyRow}>
            <Ionicons name="checkmark-circle" size={16} color={C.ok || '#10B981'} />
            <Text style={s.alreadyTxt}>{t('soul_already_answered')}</Text>
          </View>
        ) : canAnswer ? (
          <View style={s.inputArea}>
            <TextInput
              style={s.input}
              value={answerText}
              onChangeText={setAnswerText}
              placeholder={t('soul_answer_placeholder')}
              placeholderTextColor={C.tm}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!answerText.trim() || submitting) && { opacity: 0.5 }]}
              onPress={handleSubmitAnswer}
              disabled={!answerText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={C.white} />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.lockedRow}>
            <Ionicons name="lock-closed-outline" size={14} color={C.tm} />
            <Text style={s.lockedTxt}>{t('soul_different_type_lock')}</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(C) {
  return StyleSheet.create({
    nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' },
    navTitle: { fontSize: 16, fontWeight: '600', color: C.t1 },

    questionCard: { margin: 16, backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.bd },
    questionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    elBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    elBadgeTxt: { fontSize: 12, fontWeight: '600' },
    questionTime: { fontSize: 11, color: C.tm },
    questionUserRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    questionUser: { fontSize: 13, color: C.t2, fontWeight: '500' },
    questionContent: { fontSize: 17, fontWeight: '600', color: C.t1, lineHeight: 25, marginBottom: 12 },
    questionStats: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statTxt: { fontSize: 12, color: C.tm },

    sectionLabel: { paddingHorizontal: 20, paddingVertical: 8, fontSize: 11, color: C.tm, textTransform: 'uppercase', letterSpacing: 1 },

    answerCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.bd },
    myAnswerCard: { borderColor: C.p, backgroundColor: C.pp },
    answerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    answerUser: { fontSize: 12, fontWeight: '600', color: C.t2 },
    answerTime: { fontSize: 11, color: C.tm },
    answerContent: { fontSize: 14, color: C.t1, lineHeight: 21 },
    myBadge: { paddingHorizontal: 7, paddingVertical: 2, backgroundColor: C.p + '33', borderRadius: 8 },
    myBadgeTxt: { fontSize: 10, color: C.p, fontWeight: '600' },

    answersEmpty: { paddingVertical: 32, alignItems: 'center' },
    emptyTxt: { fontSize: 14, color: C.t2, fontWeight: '500', marginBottom: 4 },
    emptySubTxt: { fontSize: 12, color: C.tm },

    inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.bd, backgroundColor: C.bg, gap: 10 },
    input: { flex: 1, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.bd, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.t1, maxHeight: 100, textAlignVertical: 'top' },
    sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.p, alignItems: 'center', justifyContent: 'center' },

    alreadyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.bd, backgroundColor: C.bg },
    alreadyTxt: { fontSize: 13, color: C.tm },
    lockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.bd, backgroundColor: C.bg },
    lockedTxt: { fontSize: 13, color: C.tm },
  });
}
