import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserIcon from '../components/UserIcon';
import { getCurrentUser } from '../services/auth';
import { getLatestDMs } from '../services/dm';
import { acceptFriendRequest, getFriends, getPendingRequests, rejectFriendRequest } from '../services/friends';
import { loadProfile } from '../services/profile';
import { C } from '../theme';

export default function TalkScreen() {
  const navigation = useNavigation();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [latestMessages, setLatestMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [friendsList, requests] = await Promise.all([
        getFriends(user.id),
        getPendingRequests(user.id),
      ]);

      // フレンドのプロフィールを取得
      const friendsWithProfiles = await Promise.all(
        friendsList.map(async (f) => {
          const profile = await loadProfile(f.friendId);
          return { ...f, name: profile?.display_name || 'ユーザー' };
        })
      );
      setFriends(friendsWithProfiles);

      // リクエスト送信者のプロフィールを取得
      const requestsWithProfiles = await Promise.all(
        requests.map(async (r) => {
          const profile = await loadProfile(r.requester_id);
          return { ...r, name: profile?.display_name || 'ユーザー' };
        })
      );
      setPendingRequests(requestsWithProfiles);

      // 最新メッセージ取得
      if (friendsList.length > 0) {
        const latest = await getLatestDMs(user.id, friendsList.map(f => f.friendId));
        setLatestMessages(latest);
      }
    } catch (e) {
      console.log('TalkScreen loadData error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  // 画面にフォーカスが戻った時にリロード
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  async function handleAccept(requestId) {
    const ok = await acceptFriendRequest(requestId);
    if (ok) {
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      loadData();
    }
  }

  async function handleReject(requestId) {
    const ok = await rejectFriendRequest(requestId);
    if (ok) {
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    }
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (diff < 172800000) return '昨日';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      <View style={s.header}>
        <Text style={s.title}>トーク</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {pendingRequests.length > 0 ? (
            <TouchableOpacity style={s.notifBtn} onPress={() => setShowRequests(true)}>
              <Text style={{ fontSize: 13 }}>🔔</Text>
              <View style={s.notifDot}>
                <Text style={{ fontSize: 8, color: '#fff' }}>{pendingRequests.length}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={s.menuBtn} onPress={() => setShowMenu(true)}>
            <View style={s.dot} />
            <View style={s.dot} />
            <View style={s.dot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* AIチャットカード */}
        <TouchableOpacity style={s.aiCard} onPress={() => navigation.navigate('AIChat')}>
          <View style={s.aiOrb}>
            <Text style={{ fontSize: 22 }}>✦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiName}>AIと話す</Text>
            <Text style={s.aiSub}>思考を記録する。話すほど人格が育ちます。</Text>
          </View>
          <View style={s.aiBadge}>
            <Text style={s.aiBadgeTxt}>AI</Text>
          </View>
        </TouchableOpacity>

        {/* フレンドリスト */}
        <Text style={s.sectionSep}>フレンド</Text>

        {loading ? (
          <View style={s.emptyArea}><ActivityIndicator color={C.p} /></View>
        ) : friends.length > 0 ? (
          friends.map((f) => {
            const latest = latestMessages[f.friendId];
            return (
              <TouchableOpacity
                key={f.friendId}
                style={s.friendItem}
                onPress={() => navigation.navigate('DM', { friendId: f.friendId, friendName: f.name })}
              >
                <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: f.friendId, userName: f.name })}>
                  <UserIcon name={f.name} size={46} />
                </TouchableOpacity>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={s.friendName}>{f.name}</Text>
                    <Text style={s.friendTime}>{formatTime(latest?.created_at)}</Text>
                  </View>
                  <Text style={s.friendMsg} numberOfLines={1}>
                    {latest?.content || 'メッセージがありません'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={s.emptyArea}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>👥</Text>
            <Text style={s.emptyTitle}>まだフレンドがいません</Text>
            <Text style={s.emptySub}>共鳴タブからユーザーを見つけて{'\n'}フレンドリクエストを送りましょう</Text>
          </View>
        )}

      </ScrollView>

      {/* メニューモーダル */}
      <Modal transparent visible={showMenu} animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={s.modalContent}>
            <View style={s.mhandle} />
            <Text style={s.modalTitle}>メニュー</Text>
            <TouchableOpacity style={s.modalItem} onPress={() => { setShowMenu(false); /* TODO: friend add */ }}>
              <View style={s.modalIcon}><Text style={{ fontSize: 16 }}>👤+</Text></View>
              <View><Text style={s.modalLabel}>フレンドを追加</Text><Text style={s.modalSub}>検索またはQRコードで追加</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalItem} onPress={() => { setShowMenu(false); /* TODO: group */ }}>
              <View style={s.modalIcon}><Text style={{ fontSize: 16 }}>👥</Text></View>
              <View><Text style={s.modalLabel}>グループを作成</Text><Text style={s.modalSub}>フレンドとグループを作る</Text></View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* フレンドリクエスト通知モーダル */}
      <Modal transparent visible={showRequests} animationType="fade" onRequestClose={() => setShowRequests(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowRequests(false)}>
          <View style={s.modalContent}>
            <View style={s.mhandle} />
            <Text style={s.modalTitle}>フレンドリクエスト</Text>
            {pendingRequests.map((r) => (
              <View key={r.id} style={s.reqItem}>
                <UserIcon name={r.name} size={44} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.t1 }}>{r.name}</Text>
                  <Text style={{ fontSize: 11, color: C.tm }}>フレンドリクエスト</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(r.id)}>
                    <Text style={{ fontSize: 12, color: '#fff' }}>許可</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(r.id)}>
                    <Text style={{ fontSize: 12, color: C.t2 }}>拒否</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {pendingRequests.length === 0 ? (
              <Text style={{ fontSize: 12, color: C.tm, textAlign: 'center', paddingVertical: 16 }}>
                新しいリクエストはありません
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '500', color: C.t1, letterSpacing: -0.5 },
  menuBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.p },
  notifBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#e05050', alignItems: 'center', justifyContent: 'center' },
  aiCard: { marginHorizontal: 18, marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bm, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiOrb: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.pp, borderWidth: 2, borderColor: C.bm, alignItems: 'center', justifyContent: 'center' },
  aiName: { fontSize: 15, fontWeight: '500', color: C.t1 },
  aiSub: { fontSize: 11, color: C.tm, marginTop: 2 },
  aiBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: C.p },
  aiBadgeTxt: { fontSize: 10, color: '#fff' },
  sectionSep: { paddingHorizontal: 24, paddingVertical: 6, fontSize: 10, color: C.tm, textTransform: 'uppercase', letterSpacing: 1 },
  friendItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.bd },
  friendName: { fontSize: 14, fontWeight: '500', color: C.t1 },
  friendTime: { fontSize: 11, color: C.tm },
  friendMsg: { fontSize: 12, color: C.tm },
  emptyArea: { paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 13, fontWeight: '500', color: C.t2, marginBottom: 4 },
  emptySub: { fontSize: 11, color: C.tm, lineHeight: 18, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  mhandle: { width: 36, height: 4, backgroundColor: C.bm, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 14 },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bd },
  modalIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center' },
  modalLabel: { fontSize: 14, color: C.t1 },
  modalSub: { fontSize: 11, color: C.tm },
  reqItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  acceptBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.p, borderRadius: 10 },
  rejectBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'transparent', borderWidth: 1, borderColor: C.bm, borderRadius: 10 },
});
