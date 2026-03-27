import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import RadarChart from '../components/RadarChart';
import TraitBar from '../components/TraitBar';
import UserIcon from '../components/UserIcon';
import { getCurrentUser, signOut } from '../services/auth';
import { getConversationCount, loadPersona } from '../services/persona';
import { loadProfile, saveProfile } from '../services/profile';
import { getMyQuestions, answerQuestion } from '../services/questions';
import { C, ELEMENT_COLORS } from '../theme';

function SLabel({ text, sub }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 10 }}>
      <Text style={s.slabel}>{text}</Text>
      {sub ? <Text style={{ fontSize: 10, color: C.tm, marginLeft: 6 }}>{sub}</Text> : null}
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

// 未解放カード（ぼかし + コンパクト）
function LockedCard({ icon, label, hint }) {
  return (
    <View style={s.lockedCard}>
      <View style={s.lockedBlur}>
        <Text style={s.lockedIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.lockedLabel}>{label}</Text>
          <Text style={s.lockedHint}>{hint}</Text>
        </View>
        <View style={s.lockIcon}>
          <Text style={{ fontSize: 12 }}>🔒</Text>
        </View>
      </View>
    </View>
  );
}

// 深層分析カード
function AnalysisCard({ title, mainText, description, tags, icon }) {
  return (
    <View style={s.analysisCard}>
      {icon ? <Text style={s.analysisIcon}>{icon}</Text> : null}
      <Text style={s.analysisLabel}>{title}</Text>
      <Text style={s.analysisMain}>{mainText}</Text>
      {description ? <Text style={s.analysisSub}>{description}</Text> : null}
      {tags?.length > 0 ? (
        <View style={s.tagRow}>
          {tags.map((t, i) => (
            <View key={i} style={s.tag}><Text style={s.tagTxt}>{t}</Text></View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// プロフィール編集モーダル（全フィールド）
function ProfileEditModal({ visible, onClose, profile, onSave }) {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState('');
  const [bio, setBio] = useState('');
  const [privateTopics, setPrivateTopics] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && profile) {
      setName(profile.display_name || '');
      setComment(profile.comment || '');
      setGender(profile.gender || '');
      setAge(profile.age ? String(profile.age) : '');
      setBirthday(profile.birthday || '');
      setBio(profile.bio || '');
      setPrivateTopics(profile.private_topics || '');
    }
  }, [visible]);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('エラー', '表示名を入力してください'); return; }
    setSaving(true);
    const ok = await onSave({
      displayName: name.trim(),
      comment: comment.trim(),
      gender: gender || null,
      age: age ? parseInt(age, 10) : null,
      birthday: birthday || null,
      bio: bio.trim(),
      privateTopics: privateTopics.trim(),
    });
    setSaving(false);
    if (ok) onClose();
    else Alert.alert('エラー', '保存に失敗しました');
  }

  const GENDERS = ['未設定', '男性', '女性', 'その他', '回答しない'];

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
          <ScrollView
            style={{ maxHeight: '88%' }}
            contentContainerStyle={s.editModalContent}
            keyboardShouldPersistTaps="handled"
            onStartShouldSetResponder={() => true}
          >
            <View style={s.mhandle} />
            <Text style={s.modalTitle}>プロフィールを編集</Text>

            <Text style={s.editLabel}>名前</Text>
            <TextInput style={s.editInput} value={name} onChangeText={setName}
              placeholder="あなたの名前" placeholderTextColor={C.tm} maxLength={20} />

            <Text style={s.editLabel}>性別</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.genderBtn, gender === g && s.genderBtnOn]}
                  onPress={() => setGender(g === '未設定' ? '' : g)}
                >
                  <Text style={[s.genderTxt, gender === g && s.genderTxtOn]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.editLabel}>年齢</Text>
            <TextInput style={s.editInput} value={age} onChangeText={setAge}
              placeholder="例：28" placeholderTextColor={C.tm} keyboardType="numeric" maxLength={3} />

            <Text style={s.editLabel}>生年月日</Text>
            <TextInput style={s.editInput} value={birthday} onChangeText={setBirthday}
              placeholder="例：1998-03-15" placeholderTextColor={C.tm} maxLength={10} />

            <Text style={s.editLabel}>一言コメント</Text>
            <TextInput style={s.editInput} value={comment} onChangeText={setComment}
              placeholder="例：ものづくりが好きです" placeholderTextColor={C.tm} maxLength={50} />

            <Text style={s.editLabel}>自己紹介</Text>
            <TextInput style={[s.editInput, { height: 90, textAlignVertical: 'top' }]}
              value={bio} onChangeText={setBio} multiline
              placeholder="例：興味・関心、職業" placeholderTextColor={C.tm} maxLength={200} />

            <Text style={s.editLabel}>非公開にしたいトピック</Text>
            <TextInput style={[s.editInput, { height: 60, textAlignVertical: 'top' }]}
              value={privateTopics} onChangeText={setPrivateTopics} multiline
              placeholder="例：家族、収入" placeholderTextColor={C.tm} maxLength={200} />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={s.editCancelBtn} onPress={onClose}>
                <Text style={s.editCancelTxt}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.editSaveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSave} disabled={saving}
              >
                <Text style={s.editSaveTxt}>{saving ? '保存中...' : '保存する'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// 設定モーダル
function SettingsModal({ visible, onClose, onEditProfile, onTerms }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={s.settingsContent}>
          <View style={s.mhandle} />
          <Text style={s.modalTitle}>設定</Text>

          <TouchableOpacity style={s.menuItem} onPress={() => { onClose(); onEditProfile(); }}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>✎</Text></View>
            <View><Text style={s.menuLabel}>プロフィール編集</Text><Text style={s.menuSub}>名前、自己紹介、その他</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>🔔</Text></View>
            <View style={{ flex: 1 }}><Text style={s.menuLabel}>通知設定</Text></View>
            <Text style={s.menuSoon}>準備中</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>🔒</Text></View>
            <View style={{ flex: 1 }}><Text style={s.menuLabel}>アカウント設定</Text></View>
            <Text style={s.menuSoon}>準備中</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => { onClose(); onTerms(); }}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>📄</Text></View>
            <View><Text style={s.menuLabel}>利用規約・プライバシー</Text></View>
          </TouchableOpacity>

          <View style={s.settingsDivider} />

          <TouchableOpacity style={s.menuItem} onPress={() => { onClose(); signOut(); }}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>🚪</Text></View>
            <Text style={[s.menuLabel, { color: '#e05050' }]}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function MeScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [personaData, setPersonaData] = useState(null);
  const [convCount, setConvCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answeringId, setAnsweringId] = useState(null);
  const [answerDraft, setAnswerDraft] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const p = await loadProfile(user.id);
      setProfile(p || { display_name: user.email?.split('@')[0] || 'ユーザー' });

      const [count, persona, qs] = await Promise.all([
        getConversationCount(user.id),
        loadPersona(user.id),
        getMyQuestions(user.id),
      ]);
      setConvCount(count);
      if (persona) setPersonaData(persona);
      setQuestions(qs);
    } catch (e) {
      console.log('loadData error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(fields) {
    if (!currentUserId) return false;
    const ok = await saveProfile(currentUserId, fields);
    if (ok) {
      // ローカルstateを更新
      setProfile(prev => ({
        ...prev,
        display_name: fields.displayName,
        bio: fields.bio,
        comment: fields.comment,
        gender: fields.gender,
        age: fields.age,
        birthday: fields.birthday,
        private_topics: fields.privateTopics,
      }));
    }
    return ok;
  }

  const userName = profile?.display_name || 'ユーザー';
  const remaining = Math.max(0, 10 - (convCount % 10));
  const barPct = Math.min(100, ((convCount % 10) / 10) * 100);
  const elementInfo = personaData ? ELEMENT_COLORS[personaData.element_type] : null;

  // 深層分析データ
  const hasDeepAnalysis = personaData?.compatibility_text || personaData?.values_priority;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onEditProfile={() => setTimeout(() => setShowEditProfile(true), 300)}
        onTerms={() => navigation.navigate('Terms')}
      />
      <ProfileEditModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={profile}
        onSave={handleSaveProfile}
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ヘッダー */}
        <View style={s.header}>
          <View>
            <Svg width={72} height={18} viewBox="0 0 72 18">
              <Defs>
                <LinearGradient id="oasisGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#00d4ff" />
                  <Stop offset="50%" stopColor="#a855f7" />
                  <Stop offset="100%" stopColor="#ec4899" />
                </LinearGradient>
              </Defs>
              <SvgText
                fill="url(#oasisGrad)"
                fontSize="15"
                fontWeight="800"
                letterSpacing="3"
                x="0"
                y="14"
              >OASIS</SvgText>
            </Svg>
            <View style={{ height: 6 }} />
            <Text style={s.name}>{userName}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.headerIcon} onPress={() => setShowSettings(true)}>
              <Text style={{ fontSize: 15 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ヒーロー */}
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
            {profile?.comment ? <Text style={s.commentText}>{profile.comment}</Text> : null}
          </View>
        </View>

        {/* タグ（文体キーワード） */}
        {personaData?.style_profile?.keywords?.length > 0 ? (
          <View style={s.tagsRow}>
            {personaData.style_profile.keywords.map((kw, i) => (
              <View key={i} style={s.tag}><Text style={s.tagTxt}>{kw}</Text></View>
            ))}
          </View>
        ) : null}

        {/* 初回CTA（会話0回の新規ユーザー向け） */}
        {!loading && convCount === 0 && !personaData ? (
          <TouchableOpacity style={s.ctaCard} onPress={() => navigation.navigate('AIChat')}>
            <Text style={s.ctaEmoji}>✦</Text>
            <Text style={s.ctaTitle}>まずAIと話してみよう</Text>
            <Text style={s.ctaSub}>10回会話するとあなたの人格が分析されます{'\n'}話すほど、あなたのデジタル分身が育ちます</Text>
            <View style={s.ctaBtn}>
              <Text style={s.ctaBtnTxt}>AIと話す</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* 分析までのカウンター */}
        <View style={s.counter}>
          <Text style={{ fontSize: 18 }}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.counterTxt}>
              次の分析まで <Text style={{ color: C.p }}>{remaining}</Text> 回の会話
            </Text>
            <Text style={s.counterSub}>
              総会話数：{convCount}回
            </Text>
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
          <LockedCard icon="🔮" label="人格レーダー" hint="AIと10回会話すると解放" />
        )}

        {/* 特性スコア */}
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
          <LockedCard icon="📊" label="特性スコア" hint="AIと10回会話すると解放" />
        )}

        <Divider />

        {/* プロフィール情報 */}
        {(profile?.age || profile?.birthday || profile?.bio) ? (
          <>
            <SLabel text="プロフィール情報" />
            <View style={s.profileInfoCard}>
              {profile.age ? (
                <View style={s.piRow}><Text style={s.piLabel}>年齢</Text><Text style={s.piVal}>{profile.age}歳</Text></View>
              ) : null}
              {profile.birthday ? (
                <View style={s.piRow}><Text style={s.piLabel}>生年月日</Text><Text style={s.piVal}>{profile.birthday}</Text></View>
              ) : null}
              {profile.bio ? (
                <View style={s.piRow}><Text style={s.piLabel}>自己紹介</Text><Text style={s.piVal}>{profile.bio}</Text></View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* 相性がいい人 */}
        <SLabel text="✦ 相性がいい人" />
        {personaData?.compatibility_text ? (
          <View style={s.compatCard}>
            <Text style={s.compatText}>{personaData.compatibility_text}</Text>
          </View>
        ) : (
          <LockedCard icon="🤝" label="相性分析" hint="30回会話すると解放" />
        )}

        {/* 価値観の優先順位 */}
        <SLabel text="価値観の優先順位" />
        {personaData?.values_priority ? (
          <AnalysisCard
            title="PRIORITY"
            mainText={personaData.values_priority.order || ''}
            description={personaData.values_priority.description || ''}
            tags={personaData.values_priority.tags || []}
          />
        ) : personaData?.values_profile ? (
          <View style={s.analysisCard}>
            <Text style={s.analysisLabel}>VALUES</Text>
            <Text style={s.piLabel}>大切にしていること</Text>
            <Text style={s.analysisMain}>{personaData.values_profile.core}</Text>
            <Text style={s.piLabel}>行動の動機</Text>
            <Text style={s.analysisSub}>{personaData.values_profile.motivation}</Text>
            <Text style={s.piLabel}>世界観</Text>
            <Text style={s.analysisSub}>{personaData.values_profile.worldview}</Text>
          </View>
        ) : (
          <LockedCard icon="⚖️" label="価値観の優先順位" hint="30回会話すると解放" />
        )}

        {/* 愛着スタイル */}
        <SLabel text="愛着スタイル" />
        {personaData?.attachment_style ? (
          <AnalysisCard
            mainText={personaData.attachment_style.type || ''}
            description={personaData.attachment_style.description || ''}
            tags={personaData.attachment_style.tags || []}
          />
        ) : (
          <LockedCard icon="💕" label="愛着スタイル" hint="30回会話すると解放" />
        )}

        {/* ストレス反応 */}
        <SLabel text="ストレス反応" />
        {personaData?.stress_response ? (
          <AnalysisCard
            mainText={personaData.stress_response.pattern || ''}
            description={personaData.stress_response.description || ''}
            tags={personaData.stress_response.tags || []}
          />
        ) : (
          <LockedCard icon="⚡" label="ストレス反応" hint="30回会話すると解放" />
        )}

        {/* エネルギー源泉 */}
        <SLabel text="エネルギーの源泉" />
        {personaData?.energy_source ? (
          <View style={s.analysisCard}>
            <Text style={s.piLabel}>充電</Text>
            <Text style={s.analysisSub}>{personaData.energy_source.recharge || ''}</Text>
            <Text style={[s.piLabel, { marginTop: 8 }]}>消耗</Text>
            <Text style={s.analysisSub}>{personaData.energy_source.drain || ''}</Text>
          </View>
        ) : (
          <LockedCard icon="🔋" label="エネルギーの源泉" hint="30回会話すると解放" />
        )}

        {/* 思考スタイル */}
        <SLabel text="思考スタイル" />
        {personaData?.thinking_style ? (
          <AnalysisCard
            mainText={personaData.thinking_style.pattern || ''}
            description={personaData.thinking_style.description || ''}
            tags={personaData.thinking_style.tags || []}
          />
        ) : (
          <LockedCard icon="🧠" label="思考スタイル" hint="30回会話すると解放" />
        )}

        <Divider />

        {/* 文体プロファイル */}
        <SLabel text="文体プロファイル" />
        {personaData?.style_profile ? (
          <View style={s.analysisCard}>
            <Text style={s.piLabel}>話し方</Text>
            <Text style={s.analysisMain}>{personaData.style_profile.tone}</Text>
            <Text style={s.piLabel}>文章の長さ</Text>
            <Text style={s.analysisSub}>{personaData.style_profile.sentence_length}</Text>
          </View>
        ) : (
          <LockedCard icon="✍️" label="文体プロファイル" hint="AIと10回会話すると解放" />
        )}

        {/* あなたへの質問 */}
        {questions.length > 0 ? (
          <>
            <Divider />
            <SLabel text="あなたへの質問" sub={`${questions.filter(q => q.status === 'pending').length}件未回答`} />
            {questions.map((q) => (
              <View key={q.id} style={s.qaCard}>
                <Text style={s.qaQ}>Q. {q.question_text}</Text>
                {q.source_count > 1 ? (
                  <Text style={s.qaCount}>{q.source_count}人がこの質問をしました</Text>
                ) : null}
                {q.status === 'answered' ? (
                  <View style={s.qaAnswered}>
                    <Text style={s.qaA}>{q.answer_text}</Text>
                  </View>
                ) : answeringId === q.id ? (
                  <View style={{ marginTop: 8 }}>
                    <TextInput
                      style={s.qaInput}
                      value={answerDraft}
                      onChangeText={setAnswerDraft}
                      placeholder="回答を入力..."
                      placeholderTextColor={C.tm}
                      multiline
                      maxLength={300}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <TouchableOpacity style={s.qaCancelBtn} onPress={() => { setAnsweringId(null); setAnswerDraft(''); }}>
                        <Text style={s.qaCancelTxt}>キャンセル</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.qaSubmitBtn, !answerDraft.trim() && { opacity: 0.5 }]}
                        disabled={!answerDraft.trim()}
                        onPress={async () => {
                          const ok = await answerQuestion(q.id, answerDraft.trim());
                          if (ok) {
                            setQuestions(prev => prev.map(p => p.id === q.id ? { ...p, answer_text: answerDraft.trim(), status: 'answered' } : p));
                            setAnsweringId(null);
                            setAnswerDraft('');
                          }
                        }}
                      >
                        <Text style={s.qaSubmitTxt}>回答する</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={s.qaAnswerBtn} onPress={() => { setAnsweringId(q.id); setAnswerDraft(''); }}>
                    <Text style={s.qaAnswerBtnTxt}>回答する</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        ) : null}

        <Divider />

        {/* シェア・プレビュー */}
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

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 26, fontWeight: '500', color: C.t1, letterSpacing: -0.5 },
  headerIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 24, paddingBottom: 18 },
  elBadge: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 4 },
  elBadgeTxt: { fontSize: 10, color: '#999', fontWeight: '500' },
  typeName: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 4 },
  commentText: { fontSize: 11, color: C.t2, lineHeight: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 24, marginBottom: 14 },
  // 初回CTA
  ctaCard: { marginHorizontal: 24, marginBottom: 16, backgroundColor: C.p, borderRadius: 20, padding: 24, alignItems: 'center' },
  ctaEmoji: { fontSize: 28, color: '#fff', marginBottom: 8 },
  ctaTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 6 },
  ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  ctaBtn: { backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20 },
  ctaBtnTxt: { fontSize: 13, fontWeight: '600', color: C.p },
  counter: { marginHorizontal: 24, marginBottom: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bd, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterTxt: { fontSize: 12, fontWeight: '500', color: C.t1, marginBottom: 2 },
  counterSub: { fontSize: 11, color: C.tm },
  barWrap: { height: 4, backgroundColor: C.pp, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 4, backgroundColor: C.p, borderRadius: 2 },
  divider: { height: 1, backgroundColor: C.bd, marginHorizontal: 24, marginBottom: 14, marginTop: 8 },
  slabel: { fontSize: 10, color: C.tm, textTransform: 'uppercase', letterSpacing: 1 },
  // 深層分析カード
  analysisCard: { marginHorizontal: 24, marginBottom: 12, backgroundColor: C.bs, borderRadius: 16, padding: 14 },
  analysisIcon: { fontSize: 10, marginBottom: 4 },
  analysisLabel: { fontSize: 9, color: C.tm, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  analysisMain: { fontSize: 13, fontWeight: '500', color: C.t1, marginBottom: 5 },
  analysisSub: { fontSize: 11, color: C.t2, lineHeight: 18, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.bm, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  tagTxt: { fontSize: 10, color: C.p },
  // ロックカード
  lockedCard: { marginHorizontal: 24, marginBottom: 8, borderRadius: 14, overflow: 'hidden' },
  lockedBlur: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.bs, borderWidth: 1, borderColor: C.bm,
    borderRadius: 14, opacity: 0.7,
  },
  lockedIcon: { fontSize: 18 },
  lockedLabel: { fontSize: 12, fontWeight: '500', color: C.tm },
  lockedHint: { fontSize: 10, color: C.bm, marginTop: 1 },
  lockIcon: { opacity: 0.5 },
  // Q&A
  qaCard: { marginHorizontal: 24, marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bd, borderRadius: 14, padding: 12 },
  qaQ: { fontSize: 12, fontWeight: '500', color: C.p },
  qaCount: { fontSize: 10, color: C.tm, marginTop: 4 },
  qaAnswered: { marginTop: 8, backgroundColor: C.bs, borderRadius: 10, padding: 10 },
  qaA: { fontSize: 12, color: C.t1, lineHeight: 18 },
  qaInput: { backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: C.t1, height: 70, textAlignVertical: 'top' },
  qaCancelBtn: { flex: 1, padding: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bm, borderRadius: 10, alignItems: 'center' },
  qaCancelTxt: { fontSize: 11, color: C.tm },
  qaSubmitBtn: { flex: 1, padding: 8, backgroundColor: C.p, borderRadius: 10, alignItems: 'center' },
  qaSubmitTxt: { fontSize: 11, color: '#fff', fontWeight: '500' },
  qaAnswerBtn: { marginTop: 8, padding: 8, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 10, alignItems: 'center' },
  qaAnswerBtnTxt: { fontSize: 11, color: C.p },
  // 相性カード
  compatCard: { marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 14, backgroundColor: '#f5f0ff', borderWidth: 1, borderColor: C.pm },
  compatText: { fontSize: 12, color: C.t1, lineHeight: 20 },
  // プロフィール情報
  profileInfoCard: { marginHorizontal: 24, marginBottom: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bd, borderRadius: 16, padding: 14 },
  piRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  piLabel: { fontSize: 10, color: C.tm, width: 56, flexShrink: 0, paddingTop: 1 },
  piVal: { fontSize: 12, color: C.t1, flex: 1, lineHeight: 18 },
  // シェア
  shareBtn: { flex: 1, padding: 11, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
  previewBtn: { flex: 1, padding: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
  shareBtnTxt: { fontSize: 12, color: C.p },
  // モーダル共通
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  mhandle: { width: 36, height: 4, backgroundColor: C.bm, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 14 },
  // 設定モーダル
  settingsContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bd },
  menuIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.pp, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, color: C.t1 },
  menuSub: { fontSize: 11, color: C.tm },
  menuSoon: { fontSize: 10, color: C.tm, backgroundColor: C.pp, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  settingsDivider: { height: 1, backgroundColor: C.bd, marginVertical: 4 },
  // プロフィール編集モーダル
  editModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  editLabel: { fontSize: 11, color: C.t2, marginBottom: 5, marginTop: 10 },
  editInput: { backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, color: C.t1 },
  genderBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderColor: C.bm, backgroundColor: '#fff' },
  genderBtnOn: { backgroundColor: C.p, borderColor: C.p },
  genderTxt: { fontSize: 12, color: C.p },
  genderTxtOn: { color: '#fff' },
  editCancelBtn: { flex: 1, padding: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
  editCancelTxt: { fontSize: 13, color: C.tm },
  editSaveBtn: { flex: 1, padding: 12, backgroundColor: C.p, borderRadius: 14, alignItems: 'center' },
  editSaveTxt: { fontSize: 13, color: '#fff', fontWeight: '500' },
});
