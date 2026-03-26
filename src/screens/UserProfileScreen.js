import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RadarChart from '../components/RadarChart';
import TraitBar from '../components/TraitBar';
import UserIcon from '../components/UserIcon';
import { getCurrentUser } from '../services/auth';
import { sendFriendRequest, getFriendshipStatus } from '../services/friends';
import { loadProfile } from '../services/profile';
import { C, ELEMENT_COLORS } from '../theme';
import { supabase } from '../supabase';

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userName: initialName } = route.params;

  const [profile, setProfile] = useState(null);
  const [persona, setPersona] = useState(null);
  const [friendship, setFriendship] = useState({ status: 'none' });
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const me = await getCurrentUser();
      if (me) setCurrentUserId(me.id);

      const [p, fs] = await Promise.all([
        loadProfile(userId),
        me ? getFriendshipStatus(me.id, userId) : { status: 'none' },
      ]);
      setProfile(p);
      setFriendship(fs);

      const { data: pd } = await supabase
        .from('persona_data')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (pd) setPersona(pd);
    } catch (e) {
      console.log('UserProfile loadData error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleFriendRequest() {
    if (!currentUserId) return;
    const ok = await sendFriendRequest(currentUserId, userId);
    if (ok) {
      setFriendship({ status: 'pending', isSender: true });
    } else {
      Alert.alert('エラー', '送信に失敗しました');
    }
  }

  const displayName = profile?.display_name || initialName || 'ユーザー';
  const elementInfo = persona ? ELEMENT_COLORS[persona.element_type] : null;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.p} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ヘッダー */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>{displayName}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ヒーロー */}
        <View style={s.hero}>
          <UserIcon name={displayName} size={60} />
          <View style={{ marginLeft: 14 }}>
            {elementInfo ? (
              <View style={[s.elBadge, { backgroundColor: elementInfo.bg, borderColor: elementInfo.border }]}>
                <Text style={[s.elBadgeTxt, { color: elementInfo.text }]}>
                  {elementInfo.emoji} {persona.element_type}型
                </Text>
              </View>
            ) : null}
            <Text style={s.name}>{displayName}</Text>
            {persona?.persona_type ? (
              <Text style={s.typeName}>{persona.persona_type}</Text>
            ) : null}
          </View>
        </View>

        {/* 共鳴ポイント（相性テキスト） */}
        {persona?.compatibility_text ? (
          <View style={s.resonanceCard}>
            <Text style={s.resonanceTitle}>✦ あなたとの共鳴ポイント</Text>
            <Text style={s.resonanceText}>{persona.compatibility_text}</Text>
          </View>
        ) : null}

        {/* ○○のAIに聞いてみる */}
        <TouchableOpacity
          style={s.askBtn}
          onPress={() => navigation.navigate('AskAI', { userId, userName: displayName, persona })}
        >
          <Text style={s.askBtnTxt}>{displayName} の AI に聞いてみる</Text>
        </TouchableOpacity>

        {/* フレンドリクエスト */}
        {friendship.status === 'none' ? (
          <TouchableOpacity style={s.friendBtn} onPress={handleFriendRequest}>
            <Text style={s.friendBtnTxt}>フレンドリクエストを送る</Text>
          </TouchableOpacity>
        ) : friendship.status === 'pending' ? (
          <View style={[s.friendBtn, { opacity: 0.6 }]}>
            <Text style={s.friendBtnTxt}>
              {friendship.isSender ? 'リクエスト送信済み ✓' : 'リクエストを受信しています'}
            </Text>
          </View>
        ) : friendship.status === 'accepted' ? (
          <TouchableOpacity
            style={s.friendBtn}
            onPress={() => navigation.navigate('DM', { friendId: userId, friendName: displayName })}
          >
            <Text style={s.friendBtnTxt}>メッセージを送る</Text>
          </TouchableOpacity>
        ) : null}

        {/* ビジョン（自己紹介） */}
        {profile?.bio ? (
          <View style={s.section}>
            <Text style={s.sLabel}>ビジョン</Text>
            <View style={s.visionCard}>
              <Text style={s.visionText}>{profile.bio}</Text>
            </View>
          </View>
        ) : null}

        {/* 人格レーダー */}
        {persona ? (
          <>
            <View style={s.section}>
              <Text style={s.sLabel}>人格レーダー</Text>
              <RadarChart scores={persona} />
            </View>
            <View style={s.section}>
              <Text style={s.sLabel}>特性スコア</Text>
              <View style={{ paddingHorizontal: 24 }}>
                {[
                  ['深さ', persona.depth],
                  ['意思', persona.will],
                  ['行動', persona.action],
                  ['共鳴', persona.resonance],
                  ['安定', persona.stability],
                ].map(([label, val]) => (
                  <TraitBar key={label} label={label} value={val || 0} />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {/* 価値観バッジ */}
        {persona?.values_priority?.tags ? (
          <View style={s.section}>
            <Text style={s.sLabel}>価値観</Text>
            <View style={s.badgeRow}>
              {persona.values_priority.tags.map((t, i) => (
                <View key={i} style={s.badge}><Text style={s.badgeTxt}>{t}</Text></View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.bd },
  back: { fontSize: 28, color: C.p, paddingRight: 4 },
  navTitle: { fontSize: 14, fontWeight: '500', color: C.t1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 14 },
  elBadge: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 4 },
  elBadgeTxt: { fontSize: 10, fontWeight: '500' },
  name: { fontSize: 20, fontWeight: '500', color: C.t1, marginBottom: 2 },
  typeName: { fontSize: 12, color: C.p },
  resonanceCard: { marginHorizontal: 24, marginBottom: 14, borderRadius: 16, padding: 14, backgroundColor: '#f5f0ff', borderWidth: 1, borderColor: C.pm },
  resonanceTitle: { fontSize: 10, color: C.p, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  resonanceText: { fontSize: 12, color: C.t1, lineHeight: 20 },
  askBtn: { marginHorizontal: 24, marginBottom: 10, padding: 14, backgroundColor: C.p, borderRadius: 16, alignItems: 'center' },
  askBtnTxt: { fontSize: 14, fontWeight: '500', color: '#fff' },
  friendBtn: { marginHorizontal: 24, marginBottom: 14, padding: 12, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 16, alignItems: 'center' },
  friendBtnTxt: { fontSize: 13, color: C.p },
  section: { marginBottom: 14 },
  sLabel: { fontSize: 10, color: C.tm, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 24, marginBottom: 7 },
  visionCard: { marginHorizontal: 24, backgroundColor: C.bs, borderRadius: 12, padding: 11 },
  visionText: { fontSize: 12, color: C.t2, lineHeight: 18 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingHorizontal: 24 },
  badge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12, backgroundColor: C.bs, borderWidth: 1, borderColor: C.bd },
  badgeTxt: { fontSize: 11, color: C.t2 },
});
