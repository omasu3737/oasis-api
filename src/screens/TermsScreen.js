import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';

export default function TermsScreen() {
  const { colors: C } = useTheme();
  const { t } = useI18n();
  const s = useMemo(() => getStyles(C), [C]);
  const navigation = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>{t('terms_nav_title')}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
        <Text style={s.h1}>{t('terms_title')}</Text>
        <Text style={s.date}>{t('terms_last_updated')}</Text>

        <Text style={s.h2}>{t('terms_s1_title')}</Text>
        <Text style={s.body}>{t('terms_s1_body')}</Text>

        <Text style={s.h2}>{t('terms_s2_title')}</Text>
        <Text style={s.body}>{t('terms_s2_body')}</Text>

        <Text style={s.h2}>{t('terms_s3_title')}</Text>
        <Text style={s.body}>{t('terms_s3_body')}</Text>

        <Text style={s.h2}>{t('terms_s4_title')}</Text>
        <Text style={s.body}>{t('terms_s4_body')}</Text>

        <Text style={s.h2}>{t('terms_s5_title')}</Text>
        <Text style={s.body}>{t('terms_s5_body')}</Text>

        <Text style={s.h2}>{t('terms_s6_title')}</Text>
        <Text style={s.body}>{t('terms_s6_body')}</Text>

        <Text style={s.h2}>{t('terms_s7_title')}</Text>
        <Text style={s.body}>{t('terms_s7_body')}</Text>

        <Text style={s.h2}>{t('terms_s8_title')}</Text>
        <Text style={s.body}>{t('terms_s8_body')}</Text>

        <Text style={[s.h1, { marginTop: 30 }]}>{t('privacy_title')}</Text>

        <Text style={s.h2}>{t('privacy_s1_title')}</Text>
        <Text style={s.body}>{t('privacy_s1_body')}</Text>

        <Text style={s.h2}>{t('privacy_s2_title')}</Text>
        <Text style={s.body}>{t('privacy_s2_body')}</Text>

        <Text style={s.h2}>{t('privacy_s3_title')}</Text>
        <Text style={s.body}>{t('privacy_s3_body')}</Text>

        <Text style={s.h2}>{t('privacy_s4_title')}</Text>
        <Text style={s.body}>{t('privacy_s4_body')}</Text>

        <Text style={s.h2}>{t('privacy_s5_title')}</Text>
        <Text style={s.body}>{t('privacy_s5_body')}</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (C) => StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.bd },
  back: { fontSize: 28, color: C.p, paddingRight: 4 },
  navTitle: { fontSize: 13, fontWeight: '500', color: C.t1 },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  h1: { fontSize: 18, fontWeight: '600', color: C.t1, marginBottom: 4 },
  date: { fontSize: 11, color: C.tm, marginBottom: 20 },
  h2: { fontSize: 14, fontWeight: '600', color: C.t1, marginTop: 18, marginBottom: 6 },
  body: { fontSize: 12, color: C.t2, lineHeight: 20 },
});
