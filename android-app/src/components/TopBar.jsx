import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import AppIcon from './AppIcon';

export default function TopBar({ showBack = false, onBack }) {
  const navigation = useNavigation();

  const handleBack = onBack || (() => navigation.goBack());
  const handleBell = () => navigation.navigate('Notificaciones');

  return (
    <View style={styles.bar}>
      {showBack ? (
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <AppIcon name="back" size={20} tintColor={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.logoRow}>
          <Image
            source={require('../../assets/icon-duck.png')}
            resizeMode="contain"
            style={styles.duck}
          />
          <Text style={styles.ducky}>Ducky</Text>
        </View>
      )}
      <TouchableOpacity onPress={handleBell} style={styles.bell}>
        <AppIcon name="bellInactive" size={24} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  duck: { width: 28, height: 28 },
  ducky: { fontSize: 20, fontWeight: '800', color: colors.primary },
  backBtn: { padding: 4 },
  bell: { padding: 4 },
});