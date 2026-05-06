import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme';
import { bffGet, getToken } from '../api/bff';
import BottomNav from '../components/BottomNav';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function badgeStyle(state) {
  if (state === 'active')  return { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7', label: 'Activo' };
  if (state === 'overdue') return { bg: '#ffebee', text: '#c62828', border: '#ef9a9a', label: 'Vencido' };
  return                          { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0', label: 'Completado' };
}

function LoanCard({ p, dimmed = false }) {
  const b = badgeStyle(p.loan_state);
  return (
    <View style={[styles.card, dimmed && styles.cardDimmed]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, dimmed && { color: colors.gray600 }]} numberOfLines={2}>
          {p.titulo || 'Sin título'}
        </Text>
        {p.barcode && <Text style={styles.cardSub}>Barcode: {p.barcode}</Text>}
        <Text style={styles.cardSub}>Prestado: {formatDate(p.initial_lent_at)}</Text>
        {p.returned_at && <Text style={styles.cardSub}>Devuelto: {formatDate(p.returned_at)}</Text>}
      </View>
      <View style={[styles.badge, { backgroundColor: b.bg, borderColor: b.border }]}>
        <Text style={[styles.badgeText, { color: b.text }]}>{b.label}</Text>
      </View>
    </View>
  );
}

function FineCard({ f }) {
  const unpaid = f.fine_status === 'unpaid';
  return (
    <View style={[styles.card, unpaid ? styles.cardUnpaid : styles.cardDimmed]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={2}>{f.reason_description || 'Multa'}</Text>
        {f.source_transaction_id && <Text style={styles.cardSub}>Ref: {f.source_transaction_id}</Text>}
        <Text style={styles.cardSub}>Fecha: {formatDate(f.created_at)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={[styles.fineAmount, { color: unpaid ? '#c62828' : colors.available }]}>
          ${Number(f.price || 0).toFixed(2)} MXN
        </Text>
        <View style={[styles.badge, {
          backgroundColor: unpaid ? '#ffebee' : '#e8f5e9',
          borderColor: unpaid ? '#ef9a9a' : '#a5d6a7',
        }]}>
          <Text style={[styles.badgeText, { color: unpaid ? '#c62828' : '#2e7d32' }]}>
            {unpaid ? 'Sin pagar' : 'Pagada'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ text }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export default function MisPrestamosScreen({ navigation }) {
  const [prestamos, setPrestamos] = useState([]);
  const [multas, setMultas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMultas, setLoadingMultas] = useState(false);
  const [multasError, setMultasError] = useState(false);

  useEffect(() => {
    fetchPrestamos();
    fetchMultas();
  }, []);

  const fetchPrestamos = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await bffGet('/api/loans', { token });
      setPrestamos(Array.isArray(data) ? data : []);
    } catch { setPrestamos([]); }
    finally { setLoading(false); }
  };

  const fetchMultas = async () => {
    setLoadingMultas(true);
    setMultasError(false);
    try {
      const token = await getToken();
      const data = await bffGet('/api/fines', { token });
      setMultas(Array.isArray(data) ? data : []);
    } catch (err) {
      setMultas([]);
      if (!err.message?.includes('500')) setMultasError(true);
    } finally { setLoadingMultas(false); }
  };

  const activos   = prestamos.filter(p => p.loan_state === 'active' || p.loan_state === 'overdue');
  const historial = prestamos.filter(p => p.loan_state === 'completed');

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>

        <Text style={styles.sectionTitle}>Préstamos activos</Text>
        {loading
          ? <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.lg }} />
          : activos.length === 0
            ? <EmptyState text="No tienes préstamos activos." />
            : activos.map(p => <LoanCard key={p.loan_id} p={p} />)
        }

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Historial</Text>
        {loading
          ? <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.lg }} />
          : historial.length === 0
            ? <EmptyState text="No hay historial de préstamos." />
            : historial.map(p => <LoanCard key={p.loan_id} p={p} dimmed />)
        }

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Mis Multas</Text>
        {loadingMultas
          ? <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.lg }} />
          : multas.length === 0
            ? <EmptyState text={multasError ? "Servicio de multas no disponible." : "No tienes multas pendientes."} />
            : multas.map(f => <FineCard key={f.fine_id || f.id} f={f} />)
        }

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <BottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.gray200,
    padding: spacing.md, flexDirection: 'row',
    alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm,
  },
  cardDimmed:  { backgroundColor: '#fafafa' },
  cardUnpaid:  { backgroundColor: '#fff8f8', borderColor: '#ef9a9a' },
  cardTitle:   { ...typography.body, fontWeight: '700', marginBottom: 4 },
  cardSub:     { ...typography.caption, marginBottom: 2 },
  badge: {
    paddingHorizontal: spacing.md, paddingVertical: 3,
    borderRadius: radius.pill, borderWidth: 1,
  },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  fineAmount: { fontSize: 15, fontWeight: '800' },
  empty: {
    padding: spacing.xl, backgroundColor: '#fafafa',
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.gray200, alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: { color: colors.gray400, fontSize: 13 },
});