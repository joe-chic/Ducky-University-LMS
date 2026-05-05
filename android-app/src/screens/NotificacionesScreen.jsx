import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme';
import TopBar from '../components/TopBar';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';
import { Alert } from 'react-native';

// Mock data — reemplazar con fetch a /api/notifications cuando esté listo
const MOCK_NOTIFICACIONES = [
  // { id: '1', tipo: 'prestamo_vencido', titulo: 'Préstamo vencido', mensaje: '"Hamlet" venció hace 3 días', fecha: new Date(Date.now() - 2 * 3600000), leida: false },
  // { id: '2', tipo: 'multa_pendiente', titulo: 'Multa pendiente', mensaje: 'Tienes $50.00 MXN sin pagar', fecha: new Date(Date.now() - 86400000), leida: false },
  // { id: '3', tipo: 'devolucion', titulo: 'Préstamo devuelto', mensaje: '"The Alchemist" fue devuelto exitosamente', fecha: new Date(Date.now() - 3 * 86400000), leida: true },
];

const TIPO_CONFIG = {
  prestamo_vencido: { icon: '📚', color: '#c62828', bg: '#ffebee' },
  multa_pendiente:  { icon: '💰', color: '#e65100', bg: '#fff3e0' },
  devolucion:       { icon: '✅', color: '#2e7d32', bg: '#e8f5e9' },
  prestamo_nuevo:   { icon: '📖', color: '#1565c0', bg: '#e3f2fd' },
  default:          { icon: '🔔', color: colors.gray600, bg: colors.gray100 },
};

function timeAgo(fecha) {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
}

function NotifCard({ notif, onPress }) {
  const cfg = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.default;
  return (
    <TouchableOpacity
      style={[styles.card, !notif.leida && styles.cardUnread]}
      onPress={() => onPress(notif)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        <Text style={styles.iconText}>{cfg.icon}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, !notif.leida && { color: colors.black }]}>
            {notif.titulo}
          </Text>
          {!notif.leida && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.cardMsg} numberOfLines={2}>{notif.mensaje}</Text>
        <Text style={styles.cardTime}>{timeAgo(notif.fecha)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificacionesScreen({ navigation }) {
  const [filtro, setFiltro] = useState('todas'); // 'todas' | 'sin_leer'
  const [notificaciones, setNotificaciones] = useState(MOCK_NOTIFICACIONES);

  // TODO: reemplazar con fetch cuando el servicio de notificaciones esté listo
  // useEffect(() => {
  //   const fetchNotifs = async () => {
  //     const token = await getToken();
  //     const data = await bffGet('/api/notifications', { token });
  //     setNotificaciones(Array.isArray(data) ? data : []);
  //   };
  //   fetchNotifs();
  // }, []);

  const marcarLeida = (notif) => {
    setNotificaciones(prev =>
      prev.map(n => n.id === notif.id ? { ...n, leida: true } : n)
    );
  };

  const marcarTodasLeidas = () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const sinLeer = notificaciones.filter(n => !n.leida);
  const mostrar = filtro === 'sin_leer' ? sinLeer : notificaciones;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      {/* Filtros */}
      <View style={styles.filtros}>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'todas' && styles.filtroBtnActive]}
          onPress={() => setFiltro('todas')}
        >
          <Text style={[styles.filtroText, filtro === 'todas' && styles.filtroTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'sin_leer' && styles.filtroBtnActive]}
          onPress={() => setFiltro('sin_leer')}
        >
          <Text style={[styles.filtroText, filtro === 'sin_leer' && styles.filtroTextActive]}>
            Sin leer {sinLeer.length > 0 && `(${sinLeer.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <ScrollView contentContainerStyle={styles.list}>
        {mostrar.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No hay notificaciones</Text>
            <Text style={styles.emptyMsg}>
              {filtro === 'sin_leer'
                ? 'No tienes notificaciones sin leer.'
                : 'Cuando tengas notificaciones aparecerán aquí.'}
            </Text>
          </View>
        ) : (
          mostrar.map(n => (
            <NotifCard key={n.id} notif={n} onPress={marcarLeida} />
          ))
        )}
      </ScrollView>

      <BottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  subHeader: {
    backgroundColor: colors.white, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  subHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.h2 },
  markAll: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  filtros: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  filtroBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xs,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.gray400,
  },
  filtroBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filtroText: { fontSize: 12, color: colors.gray600, fontWeight: '600' },
  filtroTextActive: { color: colors.black },

  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },

  card: {
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.gray200,
    padding: spacing.md, flexDirection: 'row', gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconText: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  cardTitle: { ...typography.body, fontWeight: '700', color: colors.gray800, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: spacing.sm },
  cardMsg: { ...typography.caption, marginBottom: 4, lineHeight: 16 },
  cardTime: { ...typography.tiny },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.h3, color: colors.gray600 },
  emptyMsg: { ...typography.caption, textAlign: 'center', paddingHorizontal: spacing.xl },

  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.gray200,
    height: 64, paddingBottom: 8, paddingTop: 4,
  },
  navItem: { alignItems: 'center', flex: 1 },
  navIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  navLabel: { fontSize: 11, fontWeight: '600', color: colors.gray600 },
});