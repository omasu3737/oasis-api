import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function EmptyCard({ icon, title, sub }) {
  const { colors: C } = useTheme();
  const s = useMemo(() => getStyles(C), [C]);

  return (
    <View style={s.card}>
      <Text style={s.icon}>{icon}</Text>
      {title && <Text style={s.title}>{title}</Text>}
      <Text style={s.sub}>{sub}</Text>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  card: {
    marginHorizontal: 24, marginBottom: 12,
    backgroundColor: C.bs, borderWidth: 1.5, borderColor: C.bm,
    borderStyle: 'dashed', borderRadius: 16, padding: 18,
    alignItems: 'center', gap: 6,
  },
  icon: { fontSize: 24 },
  title: { fontSize: 12, fontWeight: '500', color: C.t2 },
  sub: { fontSize: 11, color: C.tm, lineHeight: 18, textAlign: 'center' },
});
