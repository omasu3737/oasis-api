import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function TraitBar({ label, value }) {
  const { colors: C } = useTheme();
  const s = useMemo(() => getStyles(C), [C]);

  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <View style={s.bar}>
        <View style={[s.fill, { width: `${value}%` }]} />
      </View>
      <Text style={s.val}>{value > 0 ? value : '-'}</Text>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  label: { fontSize: 11, color: C.t2, width: 34 },
  bar: { flex: 1, height: 4, backgroundColor: C.pp, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: C.p, borderRadius: 2 },
  val: { fontSize: 11, color: C.tm, width: 24, textAlign: 'right' },
});
