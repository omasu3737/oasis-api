/**
 * PaywallModal — A案（半画面モーダル）
 *
 * 使い方:
 *   const [paywallVisible, setPaywallVisible] = useState(false);
 *   <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
 *
 * Props:
 *   visible    : boolean          表示/非表示
 *   onClose    : () => void       閉じるボタン押下時
 *   featureKey : string (任意)    どの機能のロックか ('analysis' | 'resonance' | 'twin' | 'dm')
 *                                 省略時はデフォルトメッセージ
 */

import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';

// 機能別のタイトル・説明のi18nキーマッピング
const FEATURE_KEYS = {
  analysis:  { title: 'paywall_feature_analysis_title',  desc: 'paywall_feature_analysis_desc' },
  resonance: { title: 'paywall_feature_resonance_title', desc: 'paywall_feature_resonance_desc' },
  twin:      { title: 'paywall_feature_twin_title',      desc: 'paywall_feature_twin_desc' },
  dm:        { title: 'paywall_feature_dm_title',        desc: 'paywall_feature_dm_desc' },
  retake:    { title: 'paywall_feature_retake_title',    desc: 'paywall_feature_retake_desc' },
  default:   { title: 'paywall_feature_default_title',   desc: 'paywall_feature_default_desc' },
};

export default function PaywallModal({ visible, onClose, featureKey = 'default' }) {
  const { colors: C } = useTheme();
  const { t } = useI18n();
  const s = getStyles(C);

  const feature = FEATURE_KEYS[featureKey] ?? FEATURE_KEYS.default;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* オーバーレイ：タップで閉じる */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay} />
      </TouchableWithoutFeedback>

      {/* 半画面シート */}
      <View style={s.sheet}>
        {/* ドラッグハンドル */}
        <View style={s.handle} />

        {/* タイトル・説明 */}
        <Text style={s.title}>{t(feature.title)}</Text>
        <Text style={s.desc}>{t(feature.desc)}</Text>

        {/* プラン比較カード */}
        <View style={s.planRow}>
          {/* スタンダード（ハイライト） */}
          <View style={[s.planCard, s.planCardHighlight]}>
            <Text style={[s.planName, s.planNameHighlight]}>{t('paywall_standard')}</Text>
            <Text style={s.planPrice}>
              ¥580<Text style={s.planPriceSub}>/月</Text>
            </Text>
            <Text style={s.planDesc}>{t('paywall_standard_desc')}</Text>
          </View>

          {/* プレミアム */}
          <View style={s.planCard}>
            <Text style={s.planName}>{t('paywall_premium')}</Text>
            <Text style={s.planPrice}>
              ¥1,280<Text style={s.planPriceSub}>/月</Text>
            </Text>
            <Text style={s.planDesc}>{t('paywall_premium_desc')}</Text>
          </View>
        </View>

        {/* CTAボタン */}
        <TouchableOpacity style={s.ctaBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={s.ctaBtnTxt}>{t('paywall_cta')}</Text>
        </TouchableOpacity>

        {/* 閉じるリンク */}
        <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={s.cancelTxt}>{t('paywall_later')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function getStyles(C) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 36,
      paddingTop: 12,
    },

    // ドラッグハンドル
    handle: {
      width: 36,
      height: 4,
      backgroundColor: C.bm,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },

    // タイトル
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: C.t1,
      marginBottom: 6,
    },
    desc: {
      fontSize: 12,
      color: C.t2,
      lineHeight: 18,
      marginBottom: 16,
    },

    // プラン比較
    planRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    planCard: {
      flex: 1,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1.5,
      borderColor: C.bd,
      backgroundColor: C.bs,
    },
    planCardHighlight: {
      borderColor: C.p,
      backgroundColor: C.pp,
    },
    planName: {
      fontSize: 11,
      fontWeight: '700',
      color: C.t2,
      marginBottom: 4,
    },
    planNameHighlight: {
      color: C.p,
    },
    planPrice: {
      fontSize: 18,
      fontWeight: '800',
      color: C.t1,
      marginBottom: 4,
    },
    planPriceSub: {
      fontSize: 10,
      fontWeight: '400',
      color: C.tm,
    },
    planDesc: {
      fontSize: 10,
      color: C.tm,
      lineHeight: 15,
    },

    // CTAボタン
    ctaBtn: {
      backgroundColor: C.p,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 10,
    },
    ctaBtnTxt: {
      fontSize: 15,
      fontWeight: '700',
      color: C.white,
    },

    // 閉じるリンク
    cancelBtn: {
      alignItems: 'center',
      paddingVertical: 6,
    },
    cancelTxt: {
      fontSize: 13,
      color: C.tm,
    },
  });
}
