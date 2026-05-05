import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme';
import BookCard from '../components/BookCard';
import AppIcon from '../components/AppIcon';
import { bffGet, getToken } from '../api/bff';

export default function CatalogoScreen({ navigation }) {
  const [busqueda, setBusqueda] = useState('');
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFiltros, setShowFiltros] = useState(false);
  const [metadata, setMetadata] = useState({ categories: [], languages: [] });

  // Filtros pendientes (dentro del modal)
  const [pendingCats, setPendingCats] = useState([]);
  const [pendingLangs, setPendingLangs] = useState([]);

  // Filtros aplicados (los que realmente se usan en el fetch)
  const [appliedCats, setAppliedCats] = useState([]);
  const [appliedLangs, setAppliedLangs] = useState([]);

  const pageSize = 15;

  useEffect(() => { loadMetadata(); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchRecursos(1, busqueda, appliedCats, appliedLangs);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda, appliedCats, appliedLangs]);

  const loadMetadata = async () => {
    try {
      const token = await getToken();
      const data = await bffGet('/api/library-metadata', { token });
      if (data) setMetadata(data);
    } catch (e) { console.error(e); }
  };

  const fetchRecursos = async (p = 1, search = busqueda, cats = appliedCats, langs = appliedLangs) => {
    setLoading(true);
    try {
      const token = await getToken();
      const params = { page: p, pageSize };
      if (search)        params.search    = search;
      if (cats.length)   params.categoria = cats[0]; // backend acepta 1 categoría por nombre
      if (langs.length)  params.lenguaje  = langs[0]; // backend acepta 1 idioma por nombre
      const data = await bffGet('/api/resources', { token, params });
      const items = data.items || [];
      setRecursos(p === 1 ? items : prev => [...prev, ...items]);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (recursos.length < total && !loading) {
      const next = page + 1;
      setPage(next);
      fetchRecursos(next);
    }
  };

  const abrirFiltros = () => {
    setPendingCats([...appliedCats]);
    setPendingLangs([...appliedLangs]);
    setShowFiltros(true);
  };

  const aplicarFiltros = () => {
    setAppliedCats([...pendingCats]);
    setAppliedLangs([...pendingLangs]);
    setShowFiltros(false);
  };

  const limpiarFiltros = () => {
    setPendingCats([]);
    setPendingLangs([]);
  };

  const toggleCat = (name) => {
    setPendingCats(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const toggleLang = (name) => {
    setPendingLangs(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const filtrosActivos = appliedCats.length + appliedLangs.length;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <AppIcon name="searchInactive" size={16} style={{ marginRight: spacing.sm }} />
          <TextInput
            style={styles.searchInput}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar libros, autores o editoriales..."
            placeholderTextColor={colors.gray400}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Text style={{ color: colors.gray400, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[styles.filterBtn, filtrosActivos > 0 && styles.filterBtnActive]} onPress={abrirFiltros}>
          <AppIcon name="filter" size={16} tintColor={colors.black} />
          {filtrosActivos > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filtrosActivos}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Chips de filtros activos */}
      {filtrosActivos > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.activeChipsRow}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 6 }}
        >
          {[...appliedCats, ...appliedLangs].map((f, i) => (
            <TouchableOpacity
              key={i}
              style={styles.activeChip}
              onPress={() => {
                if (appliedCats.includes(f)) setAppliedCats(prev => prev.filter(x => x !== f));
                else setAppliedLangs(prev => prev.filter(x => x !== f));
              }}
            >
              <Text style={styles.activeChipText}>{f} ✕</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Contador */}
      {total > 0 && (
        <Text style={styles.counter}>{total} resultado{total !== 1 ? 's' : ''}</Text>
      )}

      {/* Lista */}
      <FlatList
        data={recursos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        renderItem={({ item }) => (
          <BookCard
            recurso={item}
            compact
            onPress={() => navigation.navigate('LibroDetalle', { id: item.id })}
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading
          ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} />
          : null
        }
        ListEmptyComponent={!loading
          ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No se encontraron recursos.</Text>
              {filtrosActivos > 0 && (
                <TouchableOpacity onPress={() => { setAppliedCats([]); setAppliedLangs([]); }}>
                  <Text style={styles.emptyLink}>Limpiar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          )
          : null
        }
      />

      {/* Modal Filtros */}
      <Modal visible={showFiltros} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
          <View style={styles.modalHeader}>
            <Text style={typography.h2}>Filtrar</Text>
            <TouchableOpacity onPress={() => setShowFiltros(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: spacing.lg }}>
            <Text style={styles.filterGroupTitle}>Categoría</Text>
            <Text style={styles.filterHint}>Selecciona una categoría</Text>
            {metadata.categories.map(c => (
              <TouchableOpacity key={c.id} style={styles.filterOption} onPress={() => toggleCat(c.name)}>
                <View style={[styles.checkbox, pendingCats.includes(c.name) && styles.checkboxActive]}>
                  {pendingCats.includes(c.name) && <Text style={{ color: '#000', fontSize: 10 }}>✓</Text>}
                </View>
                <Text style={styles.filterOptionText}>{c.name}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.filterGroupTitle, { marginTop: spacing.lg }]}>Idioma</Text>
            <Text style={styles.filterHint}>Selecciona un idioma</Text>
            {metadata.languages.map(l => (
              <TouchableOpacity key={l.id} style={styles.filterOption} onPress={() => toggleLang(l.name)}>
                <View style={[styles.checkbox, pendingLangs.includes(l.name) && styles.checkboxActive]}>
                  {pendingLangs.includes(l.name) && <Text style={{ color: '#000', fontSize: 10 }}>✓</Text>}
                </View>
                <Text style={styles.filterOptionText}>{l.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ padding: spacing.lg, flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity
              style={[styles.filterApplyBtn, { backgroundColor: colors.gray200, flex: 1 }]}
              onPress={limpiarFiltros}
            >
              <Text style={{ color: colors.gray800, fontWeight: '700' }}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterApplyBtn, { backgroundColor: colors.primary, flex: 2 }]}
              onPress={aplicarFiltros}
            >
              <Text style={{ color: colors.black, fontWeight: '700' }}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  searchWrap: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  searchRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 40,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.black },
  filterBtn: {
    backgroundColor: colors.gray200, paddingHorizontal: spacing.md,
    height: 40, borderRadius: radius.pill, justifyContent: 'center',
    alignItems: 'center', position: 'relative', minWidth: 44,
  },
  filterBtnActive: { backgroundColor: colors.primary },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: 'red', borderRadius: 10,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  activeChipsRow: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200, maxHeight: 44 },
  activeChip: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    paddingVertical: 4, borderRadius: radius.pill,
  },
  activeChipText: { fontSize: 12, fontWeight: '600', color: colors.black },
  counter: { fontSize: 11, color: colors.gray600, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: colors.gray600, fontSize: 14 },
  emptyLink: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  modalClose: { fontSize: 18, color: colors.gray600 },
  filterGroupTitle: { ...typography.h3, marginBottom: 2 },
  filterHint: { fontSize: 11, color: colors.gray400, marginBottom: spacing.sm },
  filterOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
    borderColor: colors.gray400, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterOptionText: { ...typography.body },
  filterApplyBtn: { height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});