import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert, ActivityIndicator, ImageBackground,
} from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import DuckyLogo from '../components/DuckyLogo';
import { bffPost, saveSession } from '../api/bff';

export default function LoginScreen({ navigation }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!usuario || !password) {
      Alert.alert('Campos requeridos', 'Por favor ingresa usuario y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const data = await bffPost('/api/auth/login', { email: usuario, password });
      await saveSession(data.token, data.user.rol);
      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Error', 'Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.bgOverlay} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <DuckyLogo size="lg" />

            <Text style={styles.title}>Inicio de sesión</Text>

            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              value={usuario}
              onChangeText={setUsuario}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder=""
              placeholderTextColor={colors.gray400}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder=""
              placeholderTextColor={colors.gray400}
            />

            <TouchableOpacity onPress={() => Alert.alert('Próximamente', 'Recuperación de contraseña.')}>
              <Text style={styles.forgot}>Recuperar contraseña</Text>
            </TouchableOpacity>

            <View style={styles.btns}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => Alert.alert('Próximamente', 'Registro de cuenta.')}
              >
                <Text style={styles.btnText}>Crear Cuenta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.btnText}>Iniciar sesión</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2c3e50' },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  kav: { flex: 1 },
  scroll: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { ...typography.h2, marginTop: spacing.md, marginBottom: spacing.sm },
  label: { ...typography.body, alignSelf: 'flex-start', color: colors.gray800 },
  input: {
    width: '100%', height: 44,
    borderWidth: 1.5, borderColor: colors.gray200,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    fontSize: 14, color: colors.black,
    marginBottom: spacing.sm,
  },
  forgot: { color: colors.primary, fontSize: 12, alignSelf: 'flex-end', marginBottom: spacing.lg },
  btns: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  btn: { flex: 1, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.black },
  btnSecondary: { backgroundColor: colors.black },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});