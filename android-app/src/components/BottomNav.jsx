import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import AppIcon from './AppIcon';
import { colors, spacing } from '../theme';

const TABS = [
  { name: 'Home',     icon: 'homeInactive',    label: 'Inicio' },
  { name: 'Catalogo', icon: 'catalogInactive',  label: 'Catálogo' },
  { name: 'Soporte',  icon: 'support',          label: 'Soporte' },
  { name: 'Perfil',   icon: 'profileInactive',  label: 'Perfil' },
];

export default function BottomNav({ navigation, active }) {
  return (
    <View style={styles.nav}>
      {TABS.map(t => {
        const isActive = active === t.name;
        return (
          <TouchableOpacity
            key={t.name}
            style={styles.item}
            onPress={() => {
              
              navigation.navigate('Main', { screen: t.name });
            }}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <AppIcon
                name={t.icon}
                size={24}
                tintColor={isActive ? colors.black : colors.gray600}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray200,
    height: 64, paddingBottom: 8, paddingTop: 4,
  },
  item: { alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.primary },
  label: { fontSize: 11, fontWeight: '600', color: colors.gray600 },
  labelActive: { color: colors.black },
});