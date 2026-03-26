import { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyCard from '../components/EmptyCard';
import RadarChart from '../components/RadarChart';
import TraitBar from '../components/TraitBar';
import UserIcon from '../components/UserIcon';
import { getCurrentUser, signOut } from '../services/auth';
import { getConversationCount, loadPersona } from '../services/persona';
import { loadProfile, saveProfile } from '../services/profile';
import { C, ELEMENT_COLORS } from '../theme';

function SLabel({ text }) {
  return <Text style={s.slabel}>{text}</Text>;
}

function Divider() {
  return <View style={s.divider} />;
}

function ProfileEditModal({ visible, onClose, currentName, currentBio, onSave }) {
  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setName(currentName); setBio(currentBio); }
  }, [visible]);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('エラー', '表示名を入力してください'); return; }
    setSaving(true);
    const ok = await onSave(name.trim(), bio.trim());
    setSaving(false);
    if (ok) onClose();
    else Alert.alert('エラー', '保存に失敗しました。もう一度お試しください。');
  }

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
          <View style={s.editModalContent} onStartShouldSetResponder={() => true}>
            <Text style={s.modalTitle}>プロフィール編集</Text>

            <Text style={s.editLabel}>表示名</Text>
            <TextInput
              style={s.editInput}
              value={name}
              onChangeText={setName}
              placeholder="あなたの名前"
              placeholderTextColor={C.tm}
              maxLength={20}
              autoFocus
            />

            <Text style={s.editLabel}>自己紹介</Text>
            <TextInput
              style={[s.editInput, { height: 80, textAlignVertical: 'top' }]}
              value={bio}
              onChangeText={setBio}
              placeholder="自己紹介を書いてみましょう"
              placeholderTextColor={C.tm}
              maxLength={100}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={s.editCancelBtn} onPress={onClose}>
                <Text style={s.editCancelTxt}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.editSaveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={s.editSaveTxt}>{saving ? '保存中...' : '保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SettingsModal({ visible, onClose, onEditProfile }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={s.modalContent}>
          <Text style={s.modalTitle}>設定</Text>

          <TouchableOpacity style={s.modalItem} onPress={() => { onClose(); onEditProfile(); }}>
            <Text style={s.modalIcon}>✎</Text>
            <Text style={s.modalItemTxt}>プロフィール編集</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.modalItem}>
            <Text style={s.modalIcon}>🔔</Text>
            <Text style={s.modalItemTxt}>通知設定</Text>
            <Text style={s.modalSoon}>準備中</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.modalItem}>
            <Text style={s.modalIcon}>🔒</Text>
            <Text style={s.modalItemTxt}>アカウント設定</Text>
            <Text style={s.modalSoon}>準備中</Text>
          </TouchableOpacity>

          <View style={s.modalDivider} />

          <TouchableOpacity style={s.modalItem} onPress={() => { onClose(); signOut(); }}>
            <Text style={s.modalIcon}>🚪</Text>
            <Text style={[s.modalItemTxt, { color: '#e05050' }]}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function MeScreen() {
  const [userName, setUserName] = useState('');
  const [bio, setBio] = useState('');
  const [personaData, setPersonaData] = useState(null);
  const [convCount, setConvCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const emailName = user.email?.split('@')[0] || 'ユーザー';

      // プロフィールがあれば表示名を使用
      const profile = await loadProfile(user.id);
      setUserName(profile?.display_name || emailName);
      setBio(profile?.bio || '');

      setConvCount(await getConversationCount(user.id));

      const persona = await loadPersona(user.id);
      if (persona) setPersonaData(persona);
    } catch (e) {
      console.log('loadData error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(newName, newBio) {
    if (!currentUserId) return false;
    const ok = await saveProfile(currentUserId, { displayName: newName, bio: newBio });
    if (ok) {
      setUserName(newName);
      setBio(newBio);
    }
    return ok;
  }

  const remaining = Math.max(0, 10 - (convCount % 10));
  const barPct = Math.min(100, ((convCount % 10) / 10) * 100);
  const elementInfo = personaData ? ELEMENT_COLORS[personaData.element_type] : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onEditProfile={() => setTimeout(() => setShowEditProfile(true), 300)}
      />
      <ProfileEditModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        currentName={userName}
        currentBio={bio}
        onSave={handleSaveProfile}
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.name}>{userName}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.headerIcon}>
              <Text style={{ fontSize: 15 }}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.headerIcon} onPress={() => setShowSettings(true)}>
              <Text style={{ fontSize: 15 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.hero}>
          <UserIcon name={userName} size={72} />
          <View style={{ flex: 1 }}>
            {elementInfo ? (
              <View style={[s.elBadge, { backgroundColor: elementInfo.bg, borderColor: elementInfo.border }]}>
                <Text style={[s.elBadgeTxt, { color: elementInfo.text }]}>
                  {elementInfo.emoji} {personaData.element_type}型
                </Text>
              </View>
            ) : (
              <View style={s.elBadge}>
                <Text style={s.elBadgeTxt}>分析中...</Text>
              </View>
            )}
            <Text style={s.typeName}>
              {personaData ? personaData.persona_type : 'AIと話すと判定されます'}
            </Text>
            {bio ? <Text style={s.bioText}>{bio}</Text> : null}
          </View>
        </View>

        <View style={s.counter}>
          <Text style={{ fontSize: 18 }}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.counterTxt}>
              次の分析まで <Text style={{ color: C.p }}>{remaining}</Text> 回の会話
            </Text>
            <Text style={s.counterSub}>
              総会話数：{convCount}回　AIと話すほど人格が解明されます
            </Text>
            <View style={s.barWrap}>
              <View style={[s.barFill, { width: `${barPct}%` }]} />
            </View>
          </View>
        </View>

        <Divider />

        <SLabel text="人格レーダー" />
        {personaData ? (
          <RadarChart scores={personaData} />
        ) : (
          <EmptyCard icon="🔮" title="まだ分析できていません"
            sub={`AIと10回会話すると\nあなたの人格レーダーが表示されます`} />
        )}

        <SLabel text="特性スコア" />
        {personaData ? (
          <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
            {[
              ['深さ', personaData.depth],
              ['意思', personaData.will],
              ['行動', personaData.action],
              ['共鳴', personaData.resonance],
              ['安定', personaData.stability],
            ].map(([label, val]) => (
              <TraitBar key={label} label={label} value={val || 0} />
            ))}
          </View>
        ) : (
          <EmptyCard icon="📊" title="まだ分析できていません"
            sub={`AIと話すと5つの特性スコアが\n自動的に計算されます`} />
        )}

        <Divider />

        <SLabel text="文体プロファイル" />
        {personaData?.style_profile ? (
          <View style={s.profileCard}>
            <Text style={s.profileLabel}>話し方</Text>
            <Text style={s.profileValue}>{personaData.style_profile.tone}</Text>
            <Text style={s.profileLabel}>文章の長さ</Text>
            <Text style={s.profileValue}>{personaData.style_profile.sentence_length}</Text>
            <Text style={s.profileLabel}>よく使う言葉</Text>
            <View style={s.tagRow}>
              {(personaData.style_profile.keywords || []).map((kw, i) => (
                <View key={i} style={s.tag}>
                  <Text style={s.tagTxt}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <EmptyCard icon="✍️" sub={`AIとの会話から\nあなたの話し方が分析されます`} />
        )}

        <SLabel text="価値観" />
        {personaData?.values_profile ? (
          <View style={s.profileCard}>
            <Text style={s.profileLabel}>大切にしていること</Text>
            <Text style={s.profileValue}>{personaData.values_profile.core}</Text>
            <Text style={s.profileLabel}>行動の動機</Text>
            <Text style={s.profileValue}>{personaData.values_profile.motivation}</Text>
            <Text style={s.profileLabel}>世界観</Text>
            <Text style={s.profileValue}>{personaData.values_profile.worldview}</Text>
          </View>
        ) : (
          <EmptyCard icon="⚖️" sub={`AIとの会話から\nあなたの価値観が分析されます`} />
        )}

        <Divider />

        <SLabel text="相性がいい人" />
        <EmptyCard icon="🤝" sub={`共鳴スコア実装後に表示されます`} />

        <Divider />

        <View style={{ paddingHorizontal: 24, marginBottom: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.shareBtn}>
              <Text style={s.shareBtnTxt}>シェア</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.previewBtn}>
              <Text style={s.shareBtnTxt}>プレビュー</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 50, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 26, fontWeight: '500', color: C.t1, letterSpacing: -0.5 },
  headerIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 24, paddingBottom: 18 },
  elBadge: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 4 },
  elBadgeTxt: { fontSize: 10, color: '#999', fontWeight: '500' },
  typeName: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 4 },
  bioText: { fontSize: 12, color: C.tm, lineHeight: 18 },
  counter: { marginHorizontal: 24, marginBottom: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bd, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterTxt: { fontSize: 12, fontWeight: '500', color: C.t1, marginBottom: 2 },
  counterSub: { fontSize: 11, color: C.tm },
  barWrap: { height: 4, backgroundColor: C.pp, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 4, backgroundColor: C.p, borderRadius: 2 },
  divider: { height: 1, backgroundColor: C.bd, marginHorizontal: 24, marginBottom: 14, marginTop: 8 },
  slabel: { fontSize: 10, color: C.tm, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 24, marginBottom: 10 },
  profileCard: { marginHorizontal: 24, marginBottom: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bd, borderRadius: 14, padding: 14, gap: 4 },
  profileLabel: { fontSize: 10, color: C.tm, marginTop: 8 },
  profileValue: { fontSize: 13, color: C.t1, fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { backgroundColor: C.pp, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  tagTxt: { fontSize: 11, color: C.p },
  shareBtn: { flex: 1, padding: 11, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
  previewBtn: { flex: 1, padding: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
  shareBtnTxt: { fontSize: 12, color: C.p },
  // Settings Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: C.t1, marginBottom: 16 },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  modalIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  modalItemTxt: { fontSize: 14, color: C.t1, flex: 1 },
  modalSoon: { fontSize: 10, color: C.tm, backgroundColor: C.pp, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  modalDivider: { height: 1, backgroundColor: C.bd, marginVertical: 4 },
  // Profile Edit Modal
  editModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  editLabel: { fontSize: 11, color: C.tm, marginBottom: 6, marginTop: 12 },
  editInput: { backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.t1 },
  editCancelBtn: { flex: 1, padding: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
  editCancelTxt: { fontSize: 13, color: C.tm },
  editSaveBtn: { flex: 1, padding: 12, backgroundColor: C.p, borderRadius: 14, alignItems: 'center' },
  editSaveTxt: { fontSize: 13, color: '#fff', fontWeight: '500' },
});
