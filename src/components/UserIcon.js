import { Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function UserIcon({ name = 'ユ', size = 72 }) {
  const { colors: C } = useTheme();

  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.pp, borderWidth: 2, borderColor: C.bm,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Text style={{ fontSize: size * 0.32, color: C.p, fontWeight: '500' }}>
        {name?.[0] || '?'}
      </Text>
    </View>
  );
}
