import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme';
import { bffGet, getToken } from '../api/bff';
import AppIcon from '../components/AppIcon';
import BottomNav from '../components/BottomNav';

const TIPO_LABEL = {
  book:                'Libro',
  e_book:              'E-Book',
  journal_magazine:    'Revista',
  thesis_dissertation: 'Tesis',
  digital_article:     'Artículo Digital',
  reference:           'Referencia',
  video:               'Video',
  audio_music:         'Audio / Música',
};

function parseArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); if (Array.isArray(p)) return p.filter(Boolean); } catch {}
    return [val];
  }
  return [];
}

export default function LibroDetalleScreen({ route, navigation }) {
  const { id } = route.params;
  const [recurso, setRecurso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDetalle(); }, [id]);

  const fetchDetalle = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await bffGet(`/api/resources/${id}`, { token });
      setRecurso(data);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el recurso.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!recurso) return null;

  const generos   = parseArray(recurso.generos || recurso.genero);
  const lenguajes = parseArray(recurso.lenguajes);
  const tags      = [...generos, ...lenguajes];

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.coverWrap}>
          <View style={styles.cover}>
            <Text style={{ fontSize: 52 }}>📚</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{recurso.titulo}</Text>
          <Text style={styles.author}>Autor: {recurso.autor || 'Desconocido'}</Text>

          {tags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {tags.map((t, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            {recurso.ubicacion      && <MetaItem label="Codigo"    value={recurso.ubicacion} full />}
            {recurso.isbn           && <MetaItem label="ISBN"      value={recurso.isbn} />}
            {recurso.editorial      && <MetaItem label="Editorial" value={recurso.editorial} />}
            {recurso.ano_publicacion && <MetaItem label="Año"      value={String(recurso.ano_publicacion)} />}
            {recurso.edicion        && <MetaItem label="Edición"   value={`${recurso.edicion}ra edición`} />}
            {recurso.tipo           && <MetaItem label="Tipo"      value={TIPO_LABEL[recurso.tipo] || recurso.tipo} />}
          </View>

          <View style={styles.divider} />

          {recurso.sinopsis && (
            <>
              <View style={styles.sinopsisBox}>
                <Text style={styles.sectionTitle}>Sinopsis</Text>
                <Text style={styles.sinopsisText}>{recurso.sinopsis}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {recurso.ubicacion && (
            <>
              <Text style={styles.sectionTitle}>Ubicación en biblioteca</Text>
              <View style={styles.locationCard}>
                <View style={styles.locationRow}>
                  <AppIcon name="location" size={20} />
                  <Text style={styles.locationMain}>{recurso.ubicacion}</Text>
                </View>
                {(recurso.ejemplares_disponibles != null || recurso.ejemplares_prestamo != null) && (
                  <View style={styles.locationBadges}>
                    {recurso.ejemplares_disponibles != null && (
                      <View style={styles.badgeGreen}>
                        <Text style={styles.badgeGreenText}>{recurso.ejemplares_disponibles} Disponibles</Text>
                      </View>
                    )}
                    {recurso.ejemplares_prestamo != null && (
                      <View style={styles.badgeAmber}>
                        <Text style={styles.badgeAmberText}>{recurso.ejemplares_prestamo} en Préstamo</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </>
          )}

          <View style={{ height: spacing.xxl }} />
        </View>
      </ScrollView>

      <BottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

function MetaItem({ label, value, full }) {
  return (
    <View style={[styles.metaItem, full && styles.metaItemFull]}>
      <Text style={styles.metaLabel}>{label}:</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  coverWrap: { alignItems: 'center', paddingVertical: spacing.xl },
  cover: {
    width: 130, height: 180, borderRadius: radius.md,
    backgroundColor: '#2c3e50', alignItems: 'center', justifyContent: 'center', elevation: 6,
  },
  body: { padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: colors.black, marginBottom: 4 },
  author: { fontSize: 14, color: colors.gray600, marginBottom: spacing.md },
  tagsRow: { marginBottom: spacing.md },
  tag: {
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.gray400,
  },
  tagText: { fontSize: 11, color: colors.gray600 },
  divider: { height: 1, backgroundColor: colors.gray200, marginVertical: spacing.md },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  metaItem: { minWidth: '28%' },
  metaItemFull: { width: '100%' },
  metaLabel: { fontSize: 10, color: colors.gray600, marginBottom: 2 },
  metaValue: { fontSize: 12, fontWeight: '700', color: colors.black },
  sinopsisBox: {
    borderWidth: 1, borderColor: '#90caf9', borderRadius: radius.md,
    padding: spacing.md, backgroundColor: '#f8fbff',
  },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  sinopsisText: { fontSize: 13, color: colors.gray800, lineHeight: 20 },
  locationCard: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md,
    padding: spacing.md, gap: spacing.sm, backgroundColor: colors.gray100,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationMain: { fontSize: 13, fontWeight: '700', color: colors.black, flex: 1 },
  locationBadges: { flexDirection: 'row', gap: spacing.sm },
  badgeGreen: {
    backgroundColor: colors.availableBg, borderWidth: 1, borderColor: '#a5d6a7',
    paddingHorizontal: spacing.md, paddingVertical: 2, borderRadius: radius.pill,
  },
  badgeGreenText: { color: colors.available, fontSize: 10, fontWeight: '700' },
  badgeAmber: {
    backgroundColor: colors.amberBg, borderWidth: 1, borderColor: '#ffe082',
    paddingHorizontal: spacing.md, paddingVertical: 2, borderRadius: radius.pill,
  },
  badgeAmberText: { color: colors.amber, fontSize: 10, fontWeight: '700' },
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray200,
    height: 64, paddingBottom: 8, paddingTop: 4,
  },
  navItem: { alignItems: 'center', flex: 1 },
  navIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 11, fontWeight: '600', color: colors.gray600 },
});