import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function DuckyLogo({ size = 'md' }) {
  const scale = size === 'lg' ? 1.5 : size === 'sm' ? 0.75 : 1;
  const iconSize = 28 * scale;

  return (
    <View style={styles.row}>
      <Image
        source={require('../../assets/icon-duck.png')}
        resizeMode="contain"
        style={{ width: iconSize, height: iconSize }}
      />
      <View>
        <Text style={[styles.ducky, { fontSize: 20 * scale }]}>Ducky</Text>
        {size !== 'sm' && (
          <Text style={[styles.uni, { fontSize: 10 * scale }]}>University</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ducky: { fontWeight: '800', color: colors.primary, lineHeight: 22 },
  uni: { color: colors.gray600, letterSpacing: 0.5, lineHeight: 12 },
});