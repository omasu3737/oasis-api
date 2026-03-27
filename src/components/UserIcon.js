import { Image, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function UserIcon({ name = '?', size = 72, imageUrl = null }) {
  const { colors: C } = useTheme();

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: size, height: size, borderRadius: size / 2,
          borderWidth: 2, borderColor: C.bm,
          backgroundColor: C.pp, flexShrink: 0,
        }}
      />
    );
  }

  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.pp, borderWidth: 2, borderColor: C.bm,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Text style={{ fontSize: size * 0.32, color: C.p, fontWeight: '500' }}>
        {name?.[0]?.toUpperCase() || '?'}
      </Text>
    </View>
  );
}
