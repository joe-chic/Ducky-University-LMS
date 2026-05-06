import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme';
import BookCard from '../components/BookCard';
import { bffGet, getToken, clearSession } from '../api/bff';

export default function HomeScreen({ navigation }) {
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecursos();
  }, []);

  const fetchRecursos = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await bffGet('/api/resources', { token, params: { page: 1, pageSize: 6 } });
      setRecursos(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero con imagen landing */}
        <View style={styles.heroWrap}>
          <Image
            source={require('../../assets/image-landing.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <Text style={styles.heroTitle}>Biblioteca Ducky</Text>
        </View>

        {/* Catálogo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bienvenido</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Catalogo')}>
              <Text style={styles.seeAll}>Ver todo →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Cargando...</Text>
          ) : (
            <FlatList
              data={recursos}
              keyExtractor={(item) => String(item.id)}
              numColumns={2}
              columnWrapperStyle={{ gap: spacing.md }}
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={{ flex: 1 }}>
                  <BookCard
                    recurso={item}
                    onPress={() => navigation.navigate('LibroDetalle', { id: item.id })}
                  />
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  heroWrap: { height: 160, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroTitle: {
    position: 'absolute', bottom: 16, left: 16,
    color: colors.white, fontSize: 20, fontWeight: '800',
  },
  section: { padding: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h2 },
  seeAll: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  loadingText: { color: colors.gray600, textAlign: 'center', padding: spacing.xl },
});