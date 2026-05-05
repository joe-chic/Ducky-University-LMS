import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export default function BookCard({ recurso, onPress, compact = false }) {
  if (compact) {
    return (
      <TouchableOpacity style={styles.listCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.listCover}>
          <Text style={{ fontSize: 28 }}>📚</Text>
        </View>
        <View style={styles.listInfo}>
          <Text style={styles.listTitle} numberOfLines={1}>{recurso.titulo}</Text>
          <Text style={styles.listAuthor} numberOfLines={1}>{recurso.autor || 'Autor Desconocido'}</Text>
          <Text style={styles.listPub} numberOfLines={1}>{recurso.editorial || ''}</Text>
          <Text style={styles.listGenre} numberOfLines={1}>{recurso.genero || ''}</Text>
        </View>
        <View style={styles.listRight}>
          <View style={[styles.badge, { backgroundColor: recurso.disponible ? colors.available : colors.unavailable }]}>
            <Text style={styles.badgeText}>{recurso.disponible ? 'Disponible' : 'No disponible'}</Text>
          </View>
          {recurso.ubicacion && <Text style={styles.listCode}>{recurso.ubicacion}</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.gridCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.badge, { backgroundColor: recurso.disponible ? colors.available : colors.unavailable, alignSelf: 'flex-start', marginBottom: spacing.sm }]}>
        <Text style={styles.badgeText}>{recurso.disponible ? 'Disponible' : 'No disponible'}</Text>
      </View>
      <View style={styles.gridCover}>
        <Text style={{ fontSize: 36 }}>📚</Text>
      </View>
      <Text style={styles.gridTitle} numberOfLines={2}>{recurso.titulo}</Text>
      <Text style={styles.gridAuthor} numberOfLines={1}>{recurso.autor || 'Autor Desconocido'}</Text>
      {recurso.ubicacion && <Text style={styles.gridCode}>{recurso.ubicacion}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    flex: 1,
  },
  gridCover: {
    height: 80, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.gray100, borderRadius: radius.md, marginBottom: spacing.sm,
  },
  gridTitle: { ...typography.body, fontWeight: '700', marginBottom: 2 },
  gridAuthor: { ...typography.caption, marginBottom: 2 },
  gridCode: { ...typography.tiny },

  listCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.gray200,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  listCover: {
    width: 48, height: 64, borderRadius: radius.sm,
    backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center',
  },
  listInfo: { flex: 1, gap: 2 },
  listTitle: { ...typography.body, fontWeight: '700' },
  listAuthor: { ...typography.caption },
  listPub: { ...typography.caption },
  listGenre: { ...typography.tiny },
  listRight: { alignItems: 'flex-end', gap: spacing.xs },
  listCode: { ...typography.tiny },

  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
});