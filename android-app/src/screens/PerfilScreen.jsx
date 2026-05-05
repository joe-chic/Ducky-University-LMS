import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme';
import AppIcon from '../components/AppIcon';
import { clearSession, getRole, getToken, bffGet } from '../api/bff';

export default function PerfilScreen({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const rol = await getRole();

      // Decodifica el JWT para sacar el campus_id y buscar el usuario
      const payload = JSON.parse(atob(token.split('.')[1]));
      const campusId = payload.campus_id || payload.sub || payload.id;

      if (campusId) {
        const data = await bffGet('/api/users', { token, params: { search: '', page: 1, pageSize: 100 } });
        const items = data.items || data || [];
        const me = items.find(u => String(u.campus_id) === String(campusId) || String(u.id) === String(campusId));
        if (me) { setUsuario({ ...me, rol: me.rol || rol }); return; }
      }
      // Fallback
      setUsuario({ nombre: 'Usuario', rol, foto: null });
    } catch (err) {
      const rol = await getRole();
      setUsuario({ nombre: 'Usuario', rol, foto: null });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      {/* Avatar y nombre */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          {usuario?.foto ? (
            <Image source={{ uri: usuario.foto }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarDefault}>
              <AppIcon name="profileInactive" size={40} tintColor={colors.black} />
            </View>
          )}
        </View>
        <Text style={styles.nombre}>{usuario?.nombre || 'Usuario'}</Text>
        {usuario?.correo && <Text style={styles.correo}>{usuario.correo}</Text>}
        <View style={styles.rolBadge}>
          <Text style={styles.rolText}>{usuario?.rol || 'Alumno'}</Text>
        </View>
      </View>

      {/* Menú */}
      <View style={styles.menuSection}>
        <MenuItem iconName="bellInactive" label="Notificaciones" onPress={() => navigation.navigate('Notificaciones')} />
        <MenuItem iconName="catalogInactive" label="Mis Préstamos" onPress={() => navigation.navigate('MisPrestamos')} />
        <MenuItem iconName="support" label="Soporte" onPress={() => Alert.alert('Soporte', 'Próximamente')} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function MenuItem({ iconName, label, onPress }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <AppIcon name={iconName} size={20} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={{ color: colors.gray400, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  profileCard: {
    backgroundColor: colors.white, margin: spacing.lg,
    borderRadius: radius.lg, padding: spacing.xl,
    alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.gray200,
  },
  avatarWrap: { marginBottom: spacing.sm },
  avatarImg: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: colors.primary,
  },
  avatarDefault: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  nombre: { ...typography.h2, textAlign: 'center' },
  correo: { ...typography.caption, textAlign: 'center' },
  rolBadge: {
    backgroundColor: colors.gray100, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.gray200,
  },
  rolText: { fontSize: 13, fontWeight: '700', color: colors.gray800 },
  menuSection: {
    backgroundColor: colors.white, marginHorizontal: spacing.lg,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray200, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  menuLabel: { flex: 1, ...typography.body, fontWeight: '600' },
  logoutBtn: {
    margin: spacing.lg, backgroundColor: '#ffebee',
    borderRadius: radius.md, padding: spacing.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#ffcdd2',
  },
  logoutText: { color: colors.unavailable, fontWeight: '700', fontSize: 14 },
});