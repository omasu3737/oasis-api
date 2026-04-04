import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const PLANS = [
  {
    key: 'standard',
    name: 'スタンダード',
    price: '¥580/月',
    color: '#6a1fc8',
    features: [
      'AIチャット 100回/日',
      '10回ごとAI人格分析',
      '深層分析（相性・価値観など）',
      '共鳴スコア機能',
      'デジタル分身AI',
    ],
  },
  {
    key: 'premium',
    name: 'プレミアム',
    price: '¥1,280/月',
    color: '#c0900a',
    features: [
      'AIチャット 200回/日',
      '深層分析（全項目）',
      'DM分析機能',
      '限定バッジ',
      'デジタル分身AI（全機能）',
    ],
  },
];

export default function PaywallModal({ visible, onClose }) {
  const { colors: C } = useTheme();
  const s = getStyles(C);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={C.t2} />
          </TouchableOpacity>

          <Text style={s.title}>プランを見る</Text>
          <Text style={s.sub}>より深く自分を知ろう</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 16 }}>
            {PLANS.map((plan) => (
              <View key={plan.key} style={[s.planCard, { borderColor: plan.color + '40' }]}>
                <View style={[s.planHeader, { backgroundColor: plan.color + '18' }]}>
                  <Text style={[s.planName, { color: plan.color }]}>{plan.name}</Text>
                  <Text style={[s.planPrice, { color: plan.color }]}>{plan.price}</Text>
                </View>
                <View style={s.planBody}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={s.featureRow}>
                      <Ionicons name="checkmark-circle" size={15} color={plan.color} />
                      <Text style={s.featureTxt}>{f}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[s.planBtn, { backgroundColor: plan.color }]}
                  onPress={onClose}
                >
                  <Text style={s.planBtnTxt}>{plan.name}を始める</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={s.note}>
              ※ 現在テスト中のため課金は発生しません{'\n'}
              正式リリース時にお知らせします
            </Text>
            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={s.laterBtn} onPress={onClose}>
            <Text style={s.laterTxt}>あとで</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function getStyles(C) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: C.modalBg,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32,
      maxHeight: '90%',
    },
    handle: {
      width: 36, height: 4, backgroundColor: C.bm,
      borderRadius: 2, alignSelf: 'center', marginBottom: 16,
    },
    closeBtn: {
      position: 'absolute', top: 20, right: 20,
      width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '600', color: C.t1, textAlign: 'center' },
    sub: { fontSize: 12, color: C.tm, textAlign: 'center', marginTop: 4 },
    planCard: {
      borderRadius: 18, borderWidth: 1.5,
      marginBottom: 14, overflow: 'hidden',
    },
    planHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    planName: { fontSize: 15, fontWeight: '700' },
    planPrice: { fontSize: 14, fontWeight: '600' },
    planBody: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    featureTxt: { fontSize: 12, color: C.t1 },
    planBtn: {
      marginHorizontal: 16, marginBottom: 14,
      paddingVertical: 11, borderRadius: 14, alignItems: 'center',
    },
    planBtnTxt: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
    note: { fontSize: 10, color: C.tm, textAlign: 'center', lineHeight: 16, marginTop: 4 },
    laterBtn: { paddingVertical: 12, alignItems: 'center' },
    laterTxt: { fontSize: 13, color: C.tm },
  });
}
