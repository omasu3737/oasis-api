import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView,
  Share, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import RadarChart from '../components/RadarChart';
import TraitBar from '../components/TraitBar';
import UserIcon from '../components/UserIcon';
import { useTheme } from '../context/ThemeContext';
import { useI18n, LANGUAGES } from '../i18n';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentUser, signOut, deleteAccount } from '../services/auth';
import { getConversationCount, loadPersona } from '../services/persona';
import { loadProfile, saveProfile, uploadAvatar } from '../services/profile';
import { getMyQuestions, answerQuestion } from '../services/questions';

function SLabel({ text, sub }) {
  const { colors: C } = useTheme();
  const s = getStyles(C);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 10 }}>
      <Text style={s.slabel}>{text}</Text>
      {sub ? <Text style={{ fontSize: 10, color: C.tm, marginLeft: 6 }}>{sub}</Text> : null}
    </View>
  );
}

function Divider() {
  const { colors: C } = useTheme();
  const s = getStyles(C);
  return <View style={s.divider} />;
}

// Locked card (blurred + compact)
function LockedCard({ icon, label, hint }) {
  const { colors: C } = useTheme();
  const s = getStyles(C);
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

// Deep analysis card
function AnalysisCard({ title, mainText, description, tags, icon }) {
  const { colors: C } = useTheme();
  const s = getStyles(C);
  return (
    <View style={s.analysisCard}>
      {icon ? <Text style={s.analysisIcon}>{icon}</Text> : null}
      <Text style={s.analysisLabel}>{title}</Text>
      <Text style={s.analysisMain}>{mainText}</Text>
      {description ? <Text style={s.analysisSub}>{description}</Text> : null}
      {tags?.length > 0 ? (
        <View style={s.tagRow}>
          {tags.map((tg, i) => (
            <View key={i} style={s.tag}><Text style={s.tagTxt}>{tg}</Text></View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Profile edit modal (all fields)
function ProfileEditModal({ visible, onClose, profile, onSave, currentUserId }) {
  const { colors: C } = useTheme();
  const { t } = useI18n();
  const s = getStyles(C);

  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState('');
  const [bio, setBio] = useState('');
  const [privateTopics, setPrivateTopics] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null); // 新規選択した画像
  const [currentAvatar, setCurrentAvatar] = useState(null); // 既存のURL

  useEffect(() => {
    if (visible && profile) {
      setName(profile.display_name || '');
      setComment(profile.comment || '');
      setGender(profile.gender || '');
      setAge(profile.age ? String(profile.age) : '');
      setBirthday(profile.birthday || '');
      setBio(profile.bio || '');
      setPrivateTopics(profile.private_topics || '');
      setCurrentAvatar(profile.avatar_url || null);
      setAvatarUri(null);
    }
  }, [visible]);

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), t('me_edit_photo_permission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert(t('error'), t('me_edit_name_required')); return; }
    setSaving(true);

    // アバターのアップロード（選択されていれば）
    let avatarUrl = currentAvatar;
    if (avatarUri && currentUserId) {
      const uploaded = await uploadAvatar(currentUserId, avatarUri);
      if (uploaded) avatarUrl = uploaded;
    }

    const ok = await onSave({
      displayName: name.trim(),
      comment: comment.trim(),
      gender: gender || null,
      age: age ? parseInt(age, 10) : null,
      birthday: birthday || null,
      bio: bio.trim(),
      privateTopics: privateTopics.trim(),
      avatarUrl,
    });
    setSaving(false);
    if (ok) onClose();
    else Alert.alert(t('error'), t('me_edit_save_failed'));
  }

  const GENDERS = [
    { key: '', label: t('me_gender_unset') },
    { key: 'male', label: t('me_gender_male') },
    { key: 'female', label: t('me_gender_female') },
    { key: 'other', label: t('me_gender_other') },
    { key: 'no_answer', label: t('me_gender_no_answer') },
  ];

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
            <Text style={s.modalTitle}>{t('me_edit_title')}</Text>

            {/* アバター選択 */}
            <TouchableOpacity style={{ alignSelf: 'center', marginBottom: 20 }} onPress={handlePickImage}>
              {(avatarUri || currentAvatar) ? (
                <View>
                  <Image source={{ uri: avatarUri || currentAvatar }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: C.bm }} />
                  <View style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: C.p, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, color: C.white }}>✎</Text>
                  </View>
                </View>
              ) : (
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.pp, borderWidth: 2, borderColor: C.bm, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 28, color: C.p }}>{name?.[0]?.toUpperCase() || '?'}</Text>
                  <View style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: C.p, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, color: C.white }}>+</Text>
                  </View>
                </View>
              )}
              <Text style={{ fontSize: 11, color: C.tm, textAlign: 'center', marginTop: 6 }}>{t('me_edit_photo')}</Text>
            </TouchableOpacity>

            <Text style={s.editLabel}>{t('profile_name')}</Text>
            <TextInput style={s.editInput} value={name} onChangeText={setName}
              placeholder={t('me_edit_name_placeholder')} placeholderTextColor={C.tm} maxLength={20} />

            <Text style={s.editLabel}>{t('profile_gender')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g.key}
                  style={[s.genderBtn, gender === g.key && s.genderBtnOn]}
                  onPress={() => setGender(g.key)}
                >
                  <Text style={[s.genderTxt, gender === g.key && s.genderTxtOn]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.editLabel}>{t('profile_age')}</Text>
            <TextInput style={s.editInput} value={age} onChangeText={setAge}
              placeholder={t('me_edit_age_placeholder')} placeholderTextColor={C.tm} keyboardType="numeric" maxLength={3} />

            <Text style={s.editLabel}>{t('profile_birthday')}</Text>
            <TextInput style={s.editInput} value={birthday} onChangeText={setBirthday}
              placeholder={t('me_edit_birthday_placeholder')} placeholderTextColor={C.tm} maxLength={10} />

            <Text style={s.editLabel}>{t('profile_comment')}</Text>
            <TextInput style={s.editInput} value={comment} onChangeText={setComment}
              placeholder={t('me_edit_comment_placeholder')} placeholderTextColor={C.tm} maxLength={50} />

            <Text style={s.editLabel}>{t('profile_bio')}</Text>
            <TextInput style={[s.editInput, { height: 90, textAlignVertical: 'top' }]}
              value={bio} onChangeText={setBio} multiline
              placeholder={t('me_edit_bio_placeholder')} placeholderTextColor={C.tm} maxLength={200} />

            <Text style={s.editLabel}>{t('profile_private')}</Text>
            <TextInput style={[s.editInput, { height: 60, textAlignVertical: 'top' }]}
              value={privateTopics} onChangeText={setPrivateTopics} multiline
              placeholder={t('me_edit_private_placeholder')} placeholderTextColor={C.tm} maxLength={200} />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={s.editCancelBtn} onPress={onClose}>
                <Text style={s.editCancelTxt}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.editSaveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSave} disabled={saving}
              >
                <Text style={s.editSaveTxt}>{saving ? t('me_edit_saving') : t('me_edit_save')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Settings modal
function SettingsModal({ visible, onClose, onEditProfile, onTerms }) {
  const { colors: C, elementColors: ELEMENT_COLORS, isDark, toggleTheme } = useTheme();
  const { t, lang, switchLang } = useI18n();
  const s = getStyles(C);
  const [deleting, setDeleting] = useState(false);

  function handleDeleteAccount() {
    Alert.alert(
      t('me_delete_account'),
      t('me_delete_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete_'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await deleteAccount();
            setDeleting(false);
            if (error) {
              Alert.alert(t('error'), t('me_delete_failed'));
            }
          },
        },
      ]
    );
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={s.settingsContent}>
          <View style={s.mhandle} />
          <Text style={s.modalTitle}>{t('me_settings')}</Text>

          <TouchableOpacity style={s.menuItem} onPress={() => { onClose(); onEditProfile(); }}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>✎</Text></View>
            <View><Text style={s.menuLabel}>{t('me_edit_profile')}</Text><Text style={s.menuSub}>{t('me_edit_profile_sub')}</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>🔔</Text></View>
            <View style={{ flex: 1 }}><Text style={s.menuLabel}>{t('me_notifications')}</Text></View>
            <Text style={s.menuSoon}>{t('me_coming_soon')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={toggleTheme}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text></View>
            <View style={{ flex: 1 }}><Text style={s.menuLabel}>{isDark ? t('me_light_mode') : t('me_dark_mode')}</Text></View>
            <View style={[s.toggleTrack, isDark && s.toggleTrackOn]}>
              <View style={[s.toggleThumb, isDark && s.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => {
            const nextIdx = LANGUAGES.findIndex(l => l.code === lang) + 1;
            const next = LANGUAGES[nextIdx % LANGUAGES.length];
            switchLang(next.code);
          }}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>🌐</Text></View>
            <View style={{ flex: 1 }}><Text style={s.menuLabel}>{t('me_language')} / Language</Text></View>
            <Text style={s.menuSoon}>{LANGUAGES.find(l => l.code === lang)?.label || lang}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>🔒</Text></View>
            <View style={{ flex: 1 }}><Text style={s.menuLabel}>{t('me_account_settings')}</Text></View>
            <Text style={s.menuSoon}>{t('me_coming_soon')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => { onClose(); onTerms(); }}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>📄</Text></View>
            <View><Text style={s.menuLabel}>{t('me_terms')}</Text></View>
          </TouchableOpacity>

          <View style={s.settingsDivider} />

          <TouchableOpacity style={s.menuItem} onPress={() => { onClose(); signOut(); }}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>🚪</Text></View>
            <Text style={[s.menuLabel, { color: C.err }]}>{t('me_logout')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.menuItem, { opacity: deleting ? 0.5 : 1 }]} onPress={handleDeleteAccount} disabled={deleting}>
            <View style={s.menuIcon}><Text style={{ fontSize: 16 }}>🗑️</Text></View>
            <Text style={[s.menuLabel, { color: C.tm, fontSize: 13 }]}>{deleting ? t('loading') : t('me_delete_account')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function MeScreen() {
  const navigation = useNavigation();
  const { colors: C, elementColors: ELEMENT_COLORS } = useTheme();
  const { t } = useI18n();
  const s = getStyles(C);

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
      setProfile(p || { display_name: user.email?.split('@')[0] || t('me_default_user') });

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
      setProfile(prev => ({
        ...prev,
        display_name: fields.displayName,
        bio: fields.bio,
        comment: fields.comment,
        gender: fields.gender,
        age: fields.age,
        birthday: fields.birthday,
        private_topics: fields.privateTopics,
        avatar_url: fields.avatarUrl || prev?.avatar_url,
      }));
    }
    return ok;
  }

  const userName = profile?.display_name || t('me_default_user');
  const remaining = Math.max(0, 10 - (convCount % 10));
  const barPct = Math.min(100, ((convCount % 10) / 10) * 100);
  const elementInfo = personaData ? ELEMENT_COLORS[personaData.element_type] : null;

  // Deep analysis data
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
        currentUserId={currentUserId}
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
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
            <TouchableOpacity style={s.headerIcon} onPress={() => Share.share({
              message: t('me_share_msg'),
              title: 'OASIS',
            })}>
              <Text style={{ fontSize: 15 }}>↑</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.headerIcon} onPress={() => setShowSettings(true)}>
              <Text style={{ fontSize: 15 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <UserIcon name={userName} size={72} imageUrl={profile?.avatar_url || null} />
          <View style={{ flex: 1 }}>
            {elementInfo ? (
              <View style={[s.elBadge, { backgroundColor: elementInfo.bg, borderColor: elementInfo.border }]}>
                <Text style={[s.elBadgeTxt, { color: elementInfo.text }]}>
                  {elementInfo.emoji} {personaData.element_type}{t('me_type_suffix')}
                </Text>
              </View>
            ) : (
              <View style={s.elBadge}>
                <Text style={s.elBadgeTxt}>{t('me_analyzing')}</Text>
              </View>
            )}
            <Text style={s.typeName}>
              {personaData ? personaData.persona_type : t('me_talk_to_analyze')}
            </Text>
            {profile?.comment ? <Text style={s.commentText}>{profile.comment}</Text> : null}
          </View>
        </View>

        {/* Tags (style keywords) */}
        {personaData?.style_profile?.keywords?.length > 0 ? (
          <View style={s.tagsRow}>
            {personaData.style_profile.keywords.map((kw, i) => (
              <View key={i} style={s.tag}><Text style={s.tagTxt}>{kw}</Text></View>
            ))}
          </View>
        ) : null}

        {/* First-time CTA (new users with 0 conversations) */}
        {!loading && convCount === 0 && !personaData ? (
          <TouchableOpacity style={s.ctaCard} onPress={() => navigation.navigate('AIChat')}>
            <Text style={s.ctaEmoji}>✦</Text>
            <Text style={s.ctaTitle}>{t('me_cta_title')}</Text>
            <Text style={s.ctaSub}>{t('me_cta_desc_long')}</Text>
            <View style={s.ctaBtn}>
              <Text style={s.ctaBtnTxt}>{t('me_cta_button')}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Analysis counter */}
        <View style={s.counter}>
          <Text style={{ fontSize: 18 }}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.counterTxt}>
              {t('me_next_analysis_prefix')} <Text style={{ color: C.p }}>{remaining}</Text> {t('me_next_analysis_suffix')}
            </Text>
            <Text style={s.counterSub}>
              {t('me_total_conv', { count: convCount })}
            </Text>
            <View style={s.barWrap}>
              <View style={[s.barFill, { width: `${barPct}%` }]} />
            </View>
          </View>
        </View>

        <Divider />

        {/* Personality Radar */}
        <SLabel text={t('me_radar')} />
        {personaData ? (
          <RadarChart scores={personaData} />
        ) : (
          <LockedCard icon="🔮" label={t('me_radar')} hint={t('me_locked_10')} />
        )}

        {/* Trait Scores */}
        <SLabel text={t('me_traits')} />
        {personaData ? (
          <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
            {[
              [t('me_trait_depth'), personaData.depth],
              [t('me_trait_will'), personaData.will],
              [t('me_trait_action'), personaData.action],
              [t('me_trait_resonance'), personaData.resonance],
              [t('me_trait_stability'), personaData.stability],
            ].map(([label, val]) => (
              <TraitBar key={label} label={label} value={val || 0} />
            ))}
          </View>
        ) : (
          <LockedCard icon="📊" label={t('me_traits')} hint={t('me_locked_10')} />
        )}

        <Divider />

        {/* Profile info */}
        {(profile?.age || profile?.birthday || profile?.bio) ? (
          <>
            <SLabel text={t('me_profile_info')} />
            <View style={s.profileInfoCard}>
              {profile.age ? (
                <View style={s.piRow}><Text style={s.piLabel}>{t('profile_age')}</Text><Text style={s.piVal}>{profile.age}{t('me_age_suffix')}</Text></View>
              ) : null}
              {profile.birthday ? (
                <View style={s.piRow}><Text style={s.piLabel}>{t('profile_birthday')}</Text><Text style={s.piVal}>{profile.birthday}</Text></View>
              ) : null}
              {profile.bio ? (
                <View style={s.piRow}><Text style={s.piLabel}>{t('profile_bio')}</Text><Text style={s.piVal}>{profile.bio}</Text></View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* Compatibility */}
        <SLabel text={'✦ ' + t('me_compatibility')} />
        {personaData?.compatibility_text ? (
          <View style={s.compatCard}>
            <Text style={s.compatText}>{personaData.compatibility_text}</Text>
          </View>
        ) : (
          <LockedCard icon="🤝" label={t('me_compatibility')} hint={t('me_locked_30')} />
        )}

        {/* Value Priorities */}
        <SLabel text={t('me_values')} />
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
            <Text style={s.piLabel}>{t('me_values_core')}</Text>
            <Text style={s.analysisMain}>{personaData.values_profile.core}</Text>
            <Text style={s.piLabel}>{t('me_values_motivation')}</Text>
            <Text style={s.analysisSub}>{personaData.values_profile.motivation}</Text>
            <Text style={s.piLabel}>{t('me_values_worldview')}</Text>
            <Text style={s.analysisSub}>{personaData.values_profile.worldview}</Text>
          </View>
        ) : (
          <LockedCard icon="⚖️" label={t('me_values')} hint={t('me_locked_30')} />
        )}

        {/* Attachment Style */}
        <SLabel text={t('me_attachment')} />
        {personaData?.attachment_style ? (
          <AnalysisCard
            mainText={personaData.attachment_style.type || ''}
            description={personaData.attachment_style.description || ''}
            tags={personaData.attachment_style.tags || []}
          />
        ) : (
          <LockedCard icon="💕" label={t('me_attachment')} hint={t('me_locked_30')} />
        )}

        {/* Stress Response */}
        <SLabel text={t('me_stress')} />
        {personaData?.stress_response ? (
          <AnalysisCard
            mainText={personaData.stress_response.pattern || ''}
            description={personaData.stress_response.description || ''}
            tags={personaData.stress_response.tags || []}
          />
        ) : (
          <LockedCard icon="⚡" label={t('me_stress')} hint={t('me_locked_30')} />
        )}

        {/* Energy Source */}
        <SLabel text={t('me_energy')} />
        {personaData?.energy_source ? (
          <View style={s.analysisCard}>
            <Text style={s.piLabel}>{t('me_energy_recharge')}</Text>
            <Text style={s.analysisSub}>{personaData.energy_source.recharge || ''}</Text>
            <Text style={[s.piLabel, { marginTop: 8 }]}>{t('me_energy_drain')}</Text>
            <Text style={s.analysisSub}>{personaData.energy_source.drain || ''}</Text>
          </View>
        ) : (
          <LockedCard icon="🔋" label={t('me_energy')} hint={t('me_locked_30')} />
        )}

        {/* Thinking Style */}
        <SLabel text={t('me_thinking')} />
        {personaData?.thinking_style ? (
          <AnalysisCard
            mainText={personaData.thinking_style.pattern || ''}
            description={personaData.thinking_style.description || ''}
            tags={personaData.thinking_style.tags || []}
          />
        ) : (
          <LockedCard icon="🧠" label={t('me_thinking')} hint={t('me_locked_30')} />
        )}

        <Divider />

        {/* Writing Style Profile */}
        <SLabel text={t('me_style')} />
        {personaData?.style_profile ? (
          <View style={s.analysisCard}>
            <Text style={s.piLabel}>{t('me_style_tone')}</Text>
            <Text style={s.analysisMain}>{personaData.style_profile.tone}</Text>
            <Text style={s.piLabel}>{t('me_style_length')}</Text>
            <Text style={s.analysisSub}>{personaData.style_profile.sentence_length}</Text>
          </View>
        ) : (
          <LockedCard icon="✍️" label={t('me_style')} hint={t('me_locked_10')} />
        )}

        {/* Questions for You */}
        {questions.length > 0 ? (
          <>
            <Divider />
            <SLabel text={t('me_qa')} sub={t('me_qa_pending', { count: questions.filter(q => q.status === 'pending').length })} />
            {questions.map((q) => (
              <View key={q.id} style={s.qaCard}>
                <Text style={s.qaQ}>Q. {q.question_text}</Text>
                {q.source_count > 1 ? (
                  <Text style={s.qaCount}>{t('me_qa_asked_by', { count: q.source_count })}</Text>
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
                      placeholder={t('me_qa_answer_placeholder')}
                      placeholderTextColor={C.tm}
                      multiline
                      maxLength={300}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <TouchableOpacity style={s.qaCancelBtn} onPress={() => { setAnsweringId(null); setAnswerDraft(''); }}>
                        <Text style={s.qaCancelTxt}>{t('cancel')}</Text>
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
                        <Text style={s.qaSubmitTxt}>{t('me_qa_submit')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={s.qaAnswerBtn} onPress={() => { setAnsweringId(q.id); setAnswerDraft(''); }}>
                    <Text style={s.qaAnswerBtnTxt}>{t('me_qa_submit')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        ) : null}

        <Divider />

        {/* Share / Preview */}
        <View style={{ paddingHorizontal: 24, marginBottom: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.shareBtn}>
              <Text style={s.shareBtnTxt}>{t('me_share')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.previewBtn}>
              <Text style={s.shareBtnTxt}>{t('me_preview')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(C) {
  return StyleSheet.create({
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { fontSize: 26, fontWeight: '500', color: C.t1, letterSpacing: -0.5 },
    headerIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.card, borderWidth: 1, borderColor: C.bd, alignItems: 'center', justifyContent: 'center' },
    hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 24, paddingBottom: 18 },
    elBadge: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: C.bs, borderWidth: 1, borderColor: C.bm, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 4 },
    elBadgeTxt: { fontSize: 10, color: C.tm, fontWeight: '500' },
    typeName: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 4 },
    commentText: { fontSize: 11, color: C.t2, lineHeight: 16 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 24, marginBottom: 14 },
    // First-time CTA
    ctaCard: { marginHorizontal: 24, marginBottom: 16, backgroundColor: C.p, borderRadius: 20, padding: 24, alignItems: 'center' },
    ctaEmoji: { fontSize: 28, color: C.white, marginBottom: 8 },
    ctaTitle: { fontSize: 16, fontWeight: '600', color: C.white, marginBottom: 6 },
    ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    ctaBtn: { backgroundColor: C.white, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20 },
    ctaBtnTxt: { fontSize: 13, fontWeight: '600', color: C.p },
    counter: { marginHorizontal: 24, marginBottom: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.bd, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    counterTxt: { fontSize: 12, fontWeight: '500', color: C.t1, marginBottom: 2 },
    counterSub: { fontSize: 11, color: C.t2 },
    barWrap: { height: 4, backgroundColor: C.pp, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
    barFill: { height: 4, backgroundColor: C.p, borderRadius: 2 },
    divider: { height: 1, backgroundColor: C.bd, marginHorizontal: 24, marginBottom: 14, marginTop: 8 },
    slabel: { fontSize: 10, color: C.tm, textTransform: 'uppercase', letterSpacing: 1 },
    // Deep analysis card
    analysisCard: { marginHorizontal: 24, marginBottom: 12, backgroundColor: C.bs, borderRadius: 16, padding: 14 },
    analysisIcon: { fontSize: 10, marginBottom: 4 },
    analysisLabel: { fontSize: 9, color: C.tm, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
    analysisMain: { fontSize: 13, fontWeight: '500', color: C.t1, marginBottom: 5 },
    analysisSub: { fontSize: 11, color: C.t2, lineHeight: 18, marginBottom: 8 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    tag: { backgroundColor: C.card, borderWidth: 1, borderColor: C.bm, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    tagTxt: { fontSize: 10, color: C.p },
    // Locked card
    lockedCard: { marginHorizontal: 24, marginBottom: 8, borderRadius: 14, overflow: 'hidden' },
    lockedBlur: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: C.bs, borderWidth: 1, borderColor: C.bm,
      borderRadius: 14, opacity: 0.75,
    },
    lockedIcon: { fontSize: 18 },
    lockedLabel: { fontSize: 12, fontWeight: '500', color: C.t2 },
    lockedHint: { fontSize: 10, color: C.tm, marginTop: 1 },
    lockIcon: { opacity: 0.6 },
    // Q&A
    qaCard: { marginHorizontal: 24, marginBottom: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.bd, borderRadius: 14, padding: 12 },
    qaQ: { fontSize: 12, fontWeight: '500', color: C.p },
    qaCount: { fontSize: 10, color: C.tm, marginTop: 4 },
    qaAnswered: { marginTop: 8, backgroundColor: C.bs, borderRadius: 10, padding: 10 },
    qaA: { fontSize: 12, color: C.t1, lineHeight: 18 },
    qaInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.bm, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: C.t1, height: 70, textAlignVertical: 'top' },
    qaCancelBtn: { flex: 1, padding: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.bm, borderRadius: 10, alignItems: 'center' },
    qaCancelTxt: { fontSize: 11, color: C.tm },
    qaSubmitBtn: { flex: 1, padding: 8, backgroundColor: C.p, borderRadius: 10, alignItems: 'center' },
    qaSubmitTxt: { fontSize: 11, color: C.white, fontWeight: '500' },
    qaAnswerBtn: { marginTop: 8, padding: 8, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 10, alignItems: 'center' },
    qaAnswerBtnTxt: { fontSize: 11, color: C.p },
    // Compatibility card
    compatCard: { marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 14, backgroundColor: C.pp, borderWidth: 1, borderColor: C.pm },
    compatText: { fontSize: 12, color: C.t1, lineHeight: 20 },
    // Profile info
    profileInfoCard: { marginHorizontal: 24, marginBottom: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.bd, borderRadius: 16, padding: 14 },
    piRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
    piLabel: { fontSize: 10, color: C.tm, width: 56, flexShrink: 0, paddingTop: 1 },
    piVal: { fontSize: 12, color: C.t1, flex: 1, lineHeight: 18 },
    // Share
    shareBtn: { flex: 1, padding: 11, backgroundColor: C.pp, borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
    previewBtn: { flex: 1, padding: 11, backgroundColor: C.card, borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
    shareBtnTxt: { fontSize: 12, color: C.p },
    // Modal shared
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    mhandle: { width: 36, height: 4, backgroundColor: C.bm, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
    modalTitle: { fontSize: 16, fontWeight: '500', color: C.t1, marginBottom: 14 },
    // Settings modal
    settingsContent: { backgroundColor: C.modalBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bd },
    menuIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bs, alignItems: 'center', justifyContent: 'center' },
    menuLabel: { fontSize: 14, color: C.t1 },
    menuSub: { fontSize: 11, color: C.tm },
    menuSoon: { fontSize: 10, color: C.t2, backgroundColor: C.pp, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    settingsDivider: { height: 1, backgroundColor: C.bd, marginVertical: 4 },
    // Dark mode toggle
    toggleTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: C.bm, justifyContent: 'center', paddingHorizontal: 2 },
    toggleTrackOn: { backgroundColor: C.p },
    toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    toggleThumbOn: { alignSelf: 'flex-end' },
    // Profile edit modal
    editModalContent: { backgroundColor: C.modalBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    editLabel: { fontSize: 11, color: C.t2, marginBottom: 5, marginTop: 10 },
    editInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.bm, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, color: C.t1 },
    genderBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderColor: C.bm, backgroundColor: C.card },
    genderBtnOn: { backgroundColor: C.p, borderColor: C.p },
    genderTxt: { fontSize: 12, color: C.p },
    genderTxtOn: { color: C.white },
    editCancelBtn: { flex: 1, padding: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.bm, borderRadius: 14, alignItems: 'center' },
    editCancelTxt: { fontSize: 13, color: C.tm },
    editSaveBtn: { flex: 1, padding: 12, backgroundColor: C.p, borderRadius: 14, alignItems: 'center' },
    editSaveTxt: { fontSize: 13, color: C.white, fontWeight: '500' },
  });
}
