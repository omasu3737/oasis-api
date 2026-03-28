import { useState } from 'react';
import { Image, Text, View, Modal, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function UserIcon({ name = '?', size = 72, imageUrl = null }) {
  const { colors: C } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleLongPress = () => {
    if (imageUrl) setExpanded(true);
  };

  const avatar = imageUrl ? (
    <Image
      source={{ uri: imageUrl }}
      style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: C.bm,
        backgroundColor: C.pp, flexShrink: 0,
      }}
    />
  ) : (
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

  return (
    <>
      <TouchableOpacity
        onLongPress={handleLongPress}
        delayLongPress={400}
        activeOpacity={0.85}
        style={{ flexShrink: 0 }}
      >
        {avatar}
      </TouchableOpacity>

      {/* 長押し拡大モーダル */}
      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <TouchableWithoutFeedback onPress={() => setExpanded(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.largeImage}
                  resizeMode="cover"
                />
                <Text style={styles.nameLabel}>{name}</Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    alignItems: 'center',
    gap: 16,
  },
  largeImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  nameLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
