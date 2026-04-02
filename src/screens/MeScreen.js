import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, ScrollView,
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
import { supabase } from '../supabase';
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
function LockedCard({ icon, label, hint, isDeepAnalysis, userTier, convCount }) {
  const { colors: C, isDark } = useTheme();
  const s = getStyles(C);

  let displayHint = hint;
  if (isDeepAnalysis) {
    if (userTier === 'premium') {
      displayHint = '15回会話で解放';
    } else if (userTier === 'standard') {
      displayHint = '30回会話で解放';
    } else {
      displayHint = '30回会話で解放 または スタンダードへ';
    }
  }

  return (
    <View style={s.lockedCard}>
      <View style={s.lockedBlur}>
        <Ionicons name={icon} size={20} color={C.t2} />
        <View style={{ flex: 1 }}>
          <Text style={s.lockedLabel}>{label}</Text>
          <Text style={s.lockedHint}>{displayHint}</Text>
          {isDeepAnalysis && userTier === 'free' ? (
            <TouchableOpacity
              onPress={() => Alert.alert(
                'プランについて',
                'スタンダード ¥580/月\n・1日50回 + Claude AI分析\n\nプレミアム ¥1,280/月\n・無制限 + 全Claude AI\n・深層分析が15回で解放',
                [{ text: '閉じる', style: 'cancel' }]
              )}
            >
              <Text style={{ fontSize: 11, color: C.p, marginTop: 4 }}>プランを見る →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={s.lockIcon}>
          <Ionicons name="lock-closed" size={16} color={C.t2} />
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

// Deep analysis collapsible card (section label is rendered outside)
function DeepCard({ cardId, mainText, expandedCards, toggleCard, children }) {
  const { colors: C } = useTheme();
  const s = getStyles(C);
  const isExpanded = expandedCards?.has(cardId);
  return (
    <TouchableOpacity
      style={s.deepCard}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        toggleCard(cardId);
      }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={s.deepCardMain}>{mainText}</Text>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.t2} />
      </View>
      {isExpanded ? <View style={{ marginTop: 10 }}>{children}</View> : null}
    </TouchableOpacity>
  );
}

// Collapsible card wrapper
function CollapsibleCard({ cardId, icon, label, themeText, isLocked, hint, isDeepAnalysis, userTier, convCount, expandedCards, toggleCard, children }) {
  const { colors: C } = useTheme();
  const { t } = useI18n();
  const s = getStyles(C);
  const isExpanded = expandedCards?.has(cardId);

  if (isLocked) {
    return (
      <LockedCard
        icon={icon}
        label={label}
        hint={hint}
        isDeepAnalysis={isDeepAnalysis}
        userTier={userTier}
        convCount={convCount}
      />
    );
  }

  return (
    <View style={s.collapsibleCard}>
      <TouchableOpacity
        style={s.collapsibleHeader}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          toggleCard(cardId);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={18} color={C.p} />
        <Text style={s.collapsibleLabel}>{label}</Text>
        <Text style={s.collapsibleTheme} numberOfLines={1}>{themeText || t('me_analyzed')}</Text>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.t2} />
      </TouchableOpacity>
      {isExpanded ? <View style={s.collapsibleBody}>{children}</View> : null}
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
  const [lovePreference, setLovePreference] = useState('all');
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);     // 新規選択した画像URI（プレビュー用）
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
      setLovePreference(profile.love_preference || 'all');
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
      const { url, errorMessage } = await uploadAvatar(currentUserId, avatarUri);
      if (url) {
        avatarUrl = url;
      } else {
        setSaving(false);
        Alert.alert(t('error'), `写真のアップロードに失敗しました。\n${errorMessage || 'ストレージ設定を確認してください'}`);
        return;
      }
    }

    const ok = await onSave({
      displayName: name.trim(),
      comment: comment.trim(),
      gender: gender || null,
      age: age ? parseInt(age, 10) : null,
      birthday: birthday || null,
      bio: bio.trim(),
      privateTopics: privateTopics.trim(),
      lovePreference: lovePreference || 'all',
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

            <Text style={s.editLabel}>{t('me_love_pref')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {[
                { key: 'all', label: t('me_love_pref_all') },
                { key: 'male', label: t('me_gender_male') },
                { key: 'female', label: t('me_gender_female') },
                { key: 'other', label: t('me_gender_other') },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                      borderColor: lovePreference === opt.key ? C.p : C.bm,
                      backgroundColor: lovePreference === opt.key ? C.pp : 'transparent' },
                  ]}
                  onPress={() => setLovePreference(opt.key)}
                >
                  <Text style={{ fontSize: 12, color: lovePreference === opt.key ? C.p : C.t2 }}>{opt.label}</Text>
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
function SettingsModal({ visible, onClose, onEditProfile, onTerms, twinEnabled, onToggleTwin }) {
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
            <View style={s.menuIcon}><Ionicons name="create-outline" size={18} color={C.t2} /></View>
            <View><Text style={s.menuLabel}>{t('me_edit_profile')}</Text><Text style={s.menuSub}>{t('me_edit_profile_sub')}</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem}>
            <View style={s.menuIcon}><Ionicons name="notifications-outline" size={18} color={C.t2} /></View>
            <View style={{ flex: 1 }}><Text style={s.menuLabel}>{t('me_notifications')}</Text></View>
            <Text style={s.menuSoon}>{t('me_coming_soon')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={toggleTheme}>
            <View style={s.menuIcon}><Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={C.t2} /></View>
            <View style={{ flex: 1 }}><Text style={s.menuLabel}>{isDark ? t('me_light_mode') : t('me_dark_mode')}</Text></View>
            <View style={[s.toggleTrack, isDark && s.toggleTrackOn]}>
              <View style={[s.toggleThumb, isDark && s.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          <View style={s.menuItem}>
            <View style={s.menuIcon}><Ionicons name="globe-outline" size={18} color={C.t2} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>{t('me_language')} / Language</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {LANGUAGES.map(l => (
                  <TouchableOpacity
                    key={l.code}
                    onPress={() => switchLang(l.code)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: lang === l.code ? C.p : C.card,
                      borderWidth: 1,
                      borderColor: lang === l.code ? C.p : C.border,
                    }}
                  >
                    <Text style={{
                      fontSize: 12, fontWeight: '600',
                      color: lang === l.code ? '#fff' : C.t2,
                    }}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity style={s.menuItem}>
            <View style={s.menuIcon}><Ionicons name="lock-closed-outline" size={18} color={C.t2} /></View>
            <View style={{ flex: 1 }}><Text style={s.menuLabel}>{t('me_account_settings')}</Text></View>
            <Text style={s.menuSoon}>{t('me_coming_soon')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={onToggleTwin}>
            <View style={s.menuIcon}><Ionicons name="person-circle-outline" size={18} color={C.t2} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>{t('me_twin_public')}</Text>
              <Text style={s.menuSub}>{t('me_twin_public_sub')}</Text>
            </View>
            <View style={[s.toggleTrack, twinEnabled && s.toggleTrackOn]}>
              <View style={[s.toggleThumb, twinEnabled && s.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => { onClose(); onTerms(); }}>
            <View style={s.menuIcon}><Ionicons name="document-text-outline" size={18} color={C.t2} /></View>
            <View><Text style={s.menuLabel}>{t('me_terms')}</Text></View>
          </TouchableOpacity>

          <View style={s.settingsDivider} />

          <TouchableOpacity style={s.menuItem} onPress={() => { onClose(); signOut(); }}>
            <View style={s.menuIcon}><Ionicons name="log-out-outline" size={18} color={C.err || '#ef4444'} /></View>
            <Text style={[s.menuLabel, { color: C.err }]}>{t('me_logout')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.menuItem, { opacity: deleting ? 0.5 : 1 }]} onPress={handleDeleteAccount} disabled={deleting}>
            <View style={s.menuIcon}><Ionicons name="trash-outline" size={18} color={C.t2} /></View>
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

  const [expandedCards, setExpandedCards] = useState(new Set());
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
  const [twinEnabled, setTwinEnabled] = useState(true);
  const [userTier, setUserTier] = useState('free');

  function toggleCard(cardId) {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  useEffect(() => { loadData(); }, []);

  useFocusEffect(useCallback(() => {
    // Reload convCount and persona when returning to this screen (e.g., from chat)
    if (currentUserId) {
      Promise.all([
        getConversationCount(currentUserId),
        loadPersona(currentUserId),
      ]).then(([count, persona]) => {
        setConvCount(count);
        if (persona) setPersonaData(persona);
      }).catch(() => {});
    }
  }, [currentUserId]));

  async function loadData() {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const p = await loadProfile(user.id);
      setProfile(p || { display_name: user.email?.split('@')[0] || t('me_default_user') });
      setTwinEnabled(p?.twin_enabled !== false); // デフォルトtrue（nullやundefinedはtrue扱い）

      const [count, persona, qs, subData] = await Promise.all([
        getConversationCount(user.id),
        loadPersona(user.id),
        getMyQuestions(user.id),
        supabase.from('subscriptions').select('tier, expires_at').eq('user_id', user.id).maybeSingle().then(r => r.data),
      ]);
      setConvCount(count);
      if (persona) setPersonaData(persona);
      setQuestions(qs);
      const isActive = subData && (!subData.expires_at || new Date(subData.expires_at) > new Date());
      setUserTier(isActive ? subData.tier : 'free');
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
        love_preference: fields.lovePreference,
        avatar_url: fields.avatarUrl || prev?.avatar_url,
      }));
    }
    return ok;
  }

  async function handleToggleTwin() {
    if (!currentUserId) return;
    const next = !twinEnabled;
    setTwinEnabled(next);
    await supabase
      .from('profiles')
      .upsert({ id: currentUserId, twin_enabled: next, updated_at: new Date().toISOString() }, { onConflict: 'id' });
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
        twinEnabled={twinEnabled}
        onToggleTwin={handleToggleTwin}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.name}>{userName}</Text>
              {userTier === 'premium' ? (
                <Ionicons name="water" size={16} color="#FFD700" />
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.headerIcon} onPress={() => setShowSettings(true)}>
              <Ionicons name="settings-outline" size={18} color={C.t2} />
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
            <Ionicons name="water-outline" size={32} color={C.white} style={{ marginBottom: 8 }} />
            <Text style={s.ctaTitle}>{t('me_cta_title')}</Text>
            <Text style={s.ctaSub}>{t('me_cta_desc_long')}</Text>
            <View style={s.ctaBtn}>
              <Text style={s.ctaBtnTxt}>{t('me_cta_button')}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Analysis counter */}
        <View style={s.counter}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={C.p} />
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
            {userTier === 'premium' && convCount >= 15 ? (
              <Text style={{ fontSize: 10, color: C.tm, marginTop: 4 }}>深層分析：15回ごとに更新</Text>
            ) : convCount >= 30 ? (
              <Text style={{ fontSize: 10, color: C.tm, marginTop: 4 }}>深層分析：30回ごとに更新</Text>
            ) : null}
          </View>
        </View>

        <Divider />

        {/* Personality Radar */}
        {personaData ? (
          <>
            <SLabel text={t('me_radar')} sub={t('me_analyzed')} />
            <View style={{ marginBottom: 8 }}>
              <RadarChart scores={personaData} />
            </View>
          </>
        ) : (
          <LockedCard icon="analytics-outline" label={t('me_radar')} hint={t('me_locked_10')} />
        )}

        {/* Trait Scores */}
        {personaData ? (
          <>
            <SLabel text={t('me_traits')} sub={t('me_analyzed')} />
            <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
              {[
                [t('me_trait_depth'), personaData?.depth],
                [t('me_trait_will'), personaData?.will],
                [t('me_trait_action'), personaData?.action],
                [t('me_trait_resonance'), personaData?.resonance],
                [t('me_trait_stability'), personaData?.stability],
              ].map(([label, val]) => (
                <TraitBar key={label} label={label} value={val || 0} />
              ))}
            </View>
          </>
        ) : (
          <LockedCard icon="bar-chart-outline" label={t('me_traits')} hint={t('me_locked_10')} />
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
        {personaData?.compatibility_text ? (
          <View style={s.compatFullCard}>
            <View style={s.compatFullHeader}>
              <Text style={s.compatDiamond}>◆</Text>
              <Text style={s.compatFullLabel}>{t('me_compatibility')}</Text>
            </View>
            <Text style={s.compatText}>{personaData.compatibility_text}</Text>
          </View>
        ) : (
          <LockedCard
            icon="people-outline"
            label={t('me_compatibility')}
            hint={t('me_locked_30')}
            isDeepAnalysis
            userTier={userTier}
            convCount={convCount}
          />
        )}

        {/* Value Priorities */}
        <SLabel text={t('me_values')} />
        {personaData?.values_priority || personaData?.values_profile ? (
          <DeepCard
            cardId="values"
            mainText={personaData?.values_priority?.order || personaData?.values_profile?.core || ''}
            expandedCards={expandedCards}
            toggleCard={toggleCard}
          >
            {personaData?.values_priority ? (
              <>
                <Text style={s.analysisSub}>{personaData.values_priority.description || ''}</Text>
                {personaData.values_priority.tags?.length > 0 && (
                  <View style={s.tagRow}>
                    {personaData.values_priority.tags.map((tg, i) => (
                      <View key={i} style={s.tag}><Text style={s.tagTxt}>{tg}</Text></View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={s.analysisSub}>{personaData?.values_profile?.motivation}</Text>
              </>
            )}
          </DeepCard>
        ) : (
          <LockedCard
            icon="bar-chart-outline"
            label={t('me_values')}
            hint={t('me_locked_30')}
            isDeepAnalysis
            userTier={userTier}
            convCount={convCount}
          />
        )}

        {/* Attachment Style */}
        <SLabel text={t('me_attachment')} />
        {personaData?.attachment_style ? (
          <DeepCard
            cardId="attachment"
            mainText={personaData.attachment_style.type || ''}
            expandedCards={expandedCards}
            toggleCard={toggleCard}
          >
            <Text style={s.analysisSub}>{personaData.attachment_style.description || ''}</Text>
            {personaData.attachment_style.tags?.length > 0 && (
              <View style={s.tagRow}>
                {personaData.attachment_style.tags.map((tg, i) => (
                  <View key={i} style={s.tag}><Text style={s.tagTxt}>{tg}</Text></View>
                ))}
              </View>
            )}
          </DeepCard>
        ) : (
          <LockedCard
            icon="heart-outline"
            label={t('me_attachment')}
            hint={t('me_locked_30')}
            isDeepAnalysis
            userTier={userTier}
            convCount={convCount}
          />
        )}

        {/* Stress Response */}
        <SLabel text={t('me_stress')} />
        {personaData?.stress_response ? (
          <DeepCard
            cardId="stress"
            mainText={personaData.stress_response.pattern || ''}
            expandedCards={expandedCards}
            toggleCard={toggleCard}
          >
            <Text style={s.analysisSub}>{personaData.stress_response.description || ''}</Text>
            {personaData.stress_response.tags?.length > 0 && (
              <View style={s.tagRow}>
                {personaData.stress_response.tags.map((tg, i) => (
                  <View key={i} style={s.tag}><Text style={s.tagTxt}>{tg}</Text></View>
                ))}
              </View>
            )}
          </DeepCard>
        ) : (
          <LockedCard
            icon="flash-outline"
            label={t('me_stress')}
            hint={t('me_locked_30')}
            isDeepAnalysis
            userTier={userTier}
            convCount={convCount}
          />
        )}

        {/* Energy Source */}
        <SLabel text={t('me_energy')} />
        {personaData?.energy_source ? (
          <DeepCard
            cardId="energy"
            mainText={personaData.energy_source.recharge || ''}
            expandedCards={expandedCards}
            toggleCard={toggleCard}
          >
            <Text style={s.piLabel}>{t('me_energy_drain')}</Text>
            <Text style={s.analysisSub}>{personaData.energy_source.drain || ''}</Text>
          </DeepCard>
        ) : (
          <LockedCard
            icon="battery-charging-outline"
            label={t('me_energy')}
            hint={t('me_locked_30')}
            isDeepAnalysis
            userTier={userTier}
            convCount={convCount}
          />
        )}

        {/* Thinking Style */}
        <SLabel text={t('me_thinking')} />
        {personaData?.thinking_style ? (
          <DeepCard
            cardId="thinking"
            mainText={personaData.thinking_style.pattern || ''}
            expandedCards={expandedCards}
            toggleCard={toggleCard}
          >
            <Text style={s.analysisSub}>{personaData.thinking_style.description || ''}</Text>
            {personaData.thinking_style.tags?.length > 0 && (
              <View style={s.tagRow}>
                {personaData.thinking_style.tags.map((tg, i) => (
                  <View key={i} style={s.tag}><Text style={s.tagTxt}>{tg}</Text></View>
                ))}
              </View>
            )}
          </DeepCard>
        ) : (
          <LockedCard
            icon="bulb-outline"
            label={t('me_thinking')}
            hint={t('me_locked_30')}
            isDeepAnalysis
            userTier={userTier}
            convCount={convCount}
          />
        )}

        <Divider />

        {/* Writing Style Profile */}
        <SLabel text={t('me_style')} />
        {personaData?.style_profile ? (
          <DeepCard
            cardId="style"
            mainText={personaData.style_profile.tone || ''}
            expandedCards={expandedCards}
            toggleCard={toggleCard}
          >
            <Text style={s.piLabel}>{t('me_style_length')}</Text>
            <Text style={s.analysisSub}>{personaData.style_profile.sentence_length || ''}</Text>
            {personaData.style_profile.keywords?.length > 0 && (
              <View style={[s.tagRow, { marginTop: 8 }]}>
                {personaData.style_profile.keywords.map((kw, i) => (
                  <View key={i} style={s.tag}><Text style={s.tagTxt}>{kw}</Text></View>
                ))}
              </View>
            )}
          </DeepCard>
        ) : (
          <LockedCard
            icon="pencil-outline"
            label={t('me_style')}
            hint={t('me_locked_10')}
          />
        )}

        {/* Questions for You */}
        <Divider />
        <SLabel
          text={t('me_qa')}
          sub={questions.filter(q => q.status !== 'answered').length > 0
            ? t('me_qa_pending', { count: questions.filter(q => q.status !== 'answered').length })
            : null}
        />
        {/* サブタイトル */}
        <Text style={{ fontSize: 11, color: C.tm, marginHorizontal: 24, marginBottom: 12, marginTop: -4 }}>
          {t('me_qa_subtitle')}
        </Text>
        {questions.length === 0 ? (
          <View style={s.qaEmptyCard}>
            <Ionicons name="chatbubbles-outline" size={32} color={C.t2} style={{ marginBottom: 10 }} />
            <Text style={s.qaEmptyTitle}>{t('me_qa_empty_title')}</Text>
            <Text style={s.qaEmptyHint}>{t('me_qa_empty_hint')}</Text>
          </View>
        ) : (
          <>
            {questions.map((q) => {
              const isExpanded = answeringId === q.id;
              const isAnswered = q.status === 'answered';
              return (
                <TouchableOpacity
                  key={q.id}
                  style={s.qaCard}
                  onPress={() => {
                    if (isAnswered) return;
                    if (isExpanded) { setAnsweringId(null); setAnswerDraft(''); }
                    else { setAnsweringId(q.id); setAnswerDraft(''); }
                  }}
                  activeOpacity={isAnswered ? 1 : 0.7}
                >
                  {/* まとめヘッダー */}
                  {q.source_count > 1 ? (
                    <View style={s.qaSumHeader}>
                      <Text style={s.qaSumCount}>{q.source_count}件</Text>
                      <Ionicons name="arrow-forward" size={12} color={C.p} />
                      <Text style={s.qaSumLabel}>まとめました</Text>
                    </View>
                  ) : null}

                  {/* 質問本文 */}
                  <Text style={s.qaQ}>「{q.question_text}」</Text>

                  {/* 類似質問ヒント */}
                  {q.source_count > 1 ? (
                    <Text style={s.qaSimHint} numberOfLines={1}>
                      類似：同じテーマの質問を {q.source_count - 1}件受けています
                    </Text>
                  ) : null}

                  {/* 回答済み表示 */}
                  {isAnswered ? (
                    <View style={s.qaAnswered}>
                      <Text style={{ fontSize: 10, color: C.tm, marginBottom: 4 }}>あなたの回答</Text>
                      <Text style={s.qaA}>{q.answer_text}</Text>
                    </View>
                  ) : isExpanded ? (
                    /* 回答入力ボックス */
                    <View style={{ marginTop: 12 }} onStartShouldSetResponder={() => true}>
                      <Text style={{ fontSize: 11, color: C.tm, marginBottom: 8 }}>あなたの回答</Text>
                      <TextInput
                        style={s.qaInput}
                        value={answerDraft}
                        onChangeText={setAnswerDraft}
                        placeholder={t('me_qa_answer_placeholder')}
                        placeholderTextColor={C.tm}
                        multiline
                        maxLength={300}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={[s.qaSubmitBtn, !answerDraft.trim() && { opacity: 0.4 }]}
                        disabled={!answerDraft.trim()}
                        onPress={async () => {
                          const ok = await answerQuestion(q.id, answerDraft.trim());
                          if (ok) {
                            setQuestions(prev => prev.map(p => p.id === q.id
                              ? { ...p, answer_text: answerDraft.trim(), status: 'answered' }
                              : p));
                            setAnsweringId(null);
                            setAnswerDraft('');
                          }
                        }}
                      >
                        <Text style={s.qaSubmitTxt}>{t('me_qa_submit_full')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* タップヒント */
                    <View style={s.qaTapHint}>
                      <Text style={s.qaTapHintTxt}>タップして回答する</Text>
                      <Ionicons name="arrow-forward" size={12} color={C.p} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <Divider />

        {/* Growth Record */}
        {personaData && convCount >= 10 ? (
          <>
            <SLabel text="成長の記録" />
            {/* 会話数に応じた成長メッセージ */}
            <View style={{ marginHorizontal: 24, marginBottom: 8 }}>
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.bd }}>
                <Text style={{ fontSize: 12, color: C.t3, marginBottom: 4 }}>
                  {convCount}回の会話で見えてきたあなた
                </Text>
                <Text style={{ fontSize: 14, color: C.t1, fontWeight: '600', lineHeight: 22 }}>
                  {getGrowthMessage(personaData, convCount)}
                </Text>
              </View>

            </View>

            {/* 今日の洞察カード */}
            <View style={{ marginHorizontal: 24, backgroundColor: C.pp, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.pm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="sparkles" size={14} color={C.p} />
                <Text style={{ fontSize: 11, color: C.p, fontWeight: '600' }}>今日のあなたへの洞察</Text>
              </View>
              <Text style={{ fontSize: 13, color: C.t1, lineHeight: 20 }}>
                {getDailyInsight(personaData)}
              </Text>
            </View>
          </>
        ) : null}

        <Divider />


        {/* Share / Preview */}
        <View style={{ paddingHorizontal: 24, marginBottom: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={s.shareBtn}
              onPress={() => Share.share({ message: t('me_share_msg'), title: 'OASIS' })}
            >
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

function getGrowthMessage(persona, count) {
  if (!persona) return '';
  const dominant = ['depth', 'will', 'action', 'resonance', 'stability']
    .reduce((a, b) => (persona[a] || 0) > (persona[b] || 0) ? a : b);
  const msgs = {
    depth: `深く考える力が際立っています。${count}回の対話で、あなたの内省的な側面が明確になってきました。`,
    will: `やり抜く意志の強さが見えてきました。${count}回の会話を通じて、一貫した価値観が浮かび上がっています。`,
    action: `行動力と積極性が光っています。${count}回の対話から、外に向かうエネルギーの強さが分かります。`,
    resonance: `人との繋がりを大切にする共感力が特徴です。${count}回の会話で、その深さが見えてきました。`,
    stability: `揺るぎない安定感が土台にあります。${count}回の対話を通じて、感情の軸がはっきりしてきました。`,
  };
  return msgs[dominant] || `${count}回の会話から、あなたの独自のパターンが見えてきました。`;
}

function getDailyInsight(persona) {
  if (!persona) return '';
  const insights = [
    persona.depth > 60 ? 'あなたは表面より本質を重視する傾向があります。今日、その視点を誰かに伝えてみては。' : null,
    persona.action < 40 ? '内向きのエネルギーを持つあなたにとって、一人で深く考える時間が充電になります。' : null,
    persona.resonance > 65 ? '共感力が高いあなたは、今日誰かの話を深く聞くことで新しい気づきを得られるかもしれません。' : null,
    persona.will > 65 ? '意志の強さがあなたの強みです。今日はその力を、自分が本当にやりたいことに向けてみましょう。' : null,
    '今日も自分らしく。AIはあなたのことをもっと知りたいと思っています。',
  ].filter(Boolean);
  const idx = new Date().getDate() % insights.length;
  return insights[idx];
}

function getStyles(C) {
  return StyleSheet.create({
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { fontSize: 26, fontWeight: '500', color: C.t1, letterSpacing: -0.5 },
    headerIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.card, borderWidth: 1, borderColor: C.bd, alignItems: 'center', justifyContent: 'center' },
    hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 24, paddingBottom: 18 },
    elBadge: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: C.bs, borderWidth: 1, borderColor: C.bm, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 4 },
    elBadgeTxt: { fontSize: 10, color: C.tm, fontWeight: '500' },
    typeName: { fontSize: 20, fontWeight: '500', color: C.t1, marginBottom: 4 },
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
    divider: { height: 1, backgroundColor: C.bm, marginHorizontal: 24, marginBottom: 14, marginTop: 8 },
    slabel: { fontSize: 10, color: C.t2, textTransform: 'uppercase', letterSpacing: 1 },
    // Collapsible card
    collapsibleCard: { marginBottom: 6 },
    collapsibleHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 24, paddingVertical: 12,
      backgroundColor: C.bs, borderWidth: 1, borderColor: C.bm,
      marginHorizontal: 24, borderRadius: 14,
    },
    collapsibleLabel: { fontSize: 12, fontWeight: '500', color: C.t1 },
    collapsibleTheme: { flex: 1, fontSize: 11, color: C.t2, textAlign: 'right' },
    collapsibleBody: { marginTop: 4 },
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
      borderRadius: 14, opacity: 0.92,
    },
    lockedIcon: { fontSize: 18 },
    lockedLabel: { fontSize: 12, fontWeight: '500', color: C.t1 },
    lockedHint: { fontSize: 10, color: C.t2, marginTop: 1 },
    lockIcon: { opacity: 0.6 },
    // Q&A
    qaEmptyCard: { marginHorizontal: 24, marginBottom: 12, alignItems: 'center', padding: 28, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.bd },
    qaEmptyTitle: { fontSize: 13, fontWeight: '600', color: C.t2, marginBottom: 6 },
    qaEmptyHint: { fontSize: 12, color: C.tm, textAlign: 'center', lineHeight: 18 },
    qaCard: { marginHorizontal: 24, marginBottom: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.bd, borderRadius: 16, padding: 16, overflow: 'hidden' },
    qaSumHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    qaSumCount: { fontSize: 11, fontWeight: '700', color: C.p },
    qaSumLabel: { fontSize: 11, color: C.t3 },
    qaQ: { fontSize: 14, fontWeight: '600', color: C.t1, lineHeight: 20, marginBottom: 6 },
    qaSimHint: { fontSize: 11, color: C.tm, marginBottom: 4 },
    qaTapHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    qaTapHintTxt: { fontSize: 12, color: C.p },
    qaAnswered: { marginTop: 12, backgroundColor: C.pp, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.pm },
    qaA: { fontSize: 13, color: C.t1, lineHeight: 20 },
    qaInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.pm, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 13, color: C.t1, minHeight: 80, textAlignVertical: 'top', marginBottom: 10 },
    qaSubmitBtn: { padding: 14, backgroundColor: C.p, borderRadius: 12, alignItems: 'center' },
    qaSubmitTxt: { fontSize: 13, color: '#fff', fontWeight: '600' },
    // Compatibility full card
    compatFullCard: { marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 16, backgroundColor: C.pp, borderWidth: 1, borderColor: C.pm },
    compatFullHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    compatDiamond: { fontSize: 10, color: C.p },
    compatFullLabel: { fontSize: 12, fontWeight: '600', color: C.p },
    compatCard: { marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 14, backgroundColor: C.pp, borderWidth: 1, borderColor: C.pm },
    compatText: { fontSize: 12, color: C.t1, lineHeight: 20 },
    // Deep collapsible card
    deepCard: { marginHorizontal: 24, marginBottom: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.bd, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
    deepCardMain: { fontSize: 13, fontWeight: '400', color: C.t1, flex: 1, marginRight: 8 },
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
