import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// 単一のスケルトンブロック（shimmer effect）
function SkeletonBlock({ width, height, borderRadius = 8, style }) {
  const { colors: C } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[{
      width, height, borderRadius,
      backgroundColor: C.bm,
      opacity,
    }, style]} />
  );
}

// ユーザーカード型スケルトン（ResonanceScreen用）
export function UserCardSkeleton() {
  const { colors: C } = useTheme();
  return (
    <View style={{
      marginHorizontal: 16, marginBottom: 10,
      backgroundColor: C.card, borderRadius: 16,
      padding: 14, borderWidth: 1, borderColor: C.bd,
      flexDirection: 'row', alignItems: 'center', gap: 14,
    }}>
      <SkeletonBlock width={50} height={50} borderRadius={25} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock width="60%" height={14} />
        <SkeletonBlock width="40%" height={11} />
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
          {[1,2,3,4,5].map(i => (
            <SkeletonBlock key={i} width="18%" height={3} borderRadius={2} />
          ))}
        </View>
      </View>
      <SkeletonBlock width={52} height={52} borderRadius={26} />
    </View>
  );
}

// フレンドリスト行型スケルトン（TalkScreen用）
export function FriendItemSkeleton() {
  const { colors: C } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 18, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.bd,
    }}>
      <SkeletonBlock width={46} height={46} borderRadius={23} />
      <View style={{ flex: 1, gap: 7 }}>
        <SkeletonBlock width="45%" height={13} />
        <SkeletonBlock width="70%" height={11} />
      </View>
      <SkeletonBlock width={36} height={11} />
    </View>
  );
}

// MeScreen用スケルトン（分析カード）
export function AnalysisCardSkeleton() {
  const { colors: C } = useTheme();
  return (
    <View style={{
      marginHorizontal: 16, marginBottom: 12,
      backgroundColor: C.card, borderRadius: 16,
      padding: 18, borderWidth: 1, borderColor: C.bd, gap: 10,
    }}>
      <SkeletonBlock width="30%" height={11} />
      <SkeletonBlock width="55%" height={18} />
      <SkeletonBlock width="90%" height={11} />
      <SkeletonBlock width="75%" height={11} />
    </View>
  );
}

export default SkeletonBlock;
