import { useColorScheme } from '@/hooks/use-color-scheme';
import { resetPassword, validateEmail } from '@/services/fastapi-auth-service';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LostPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    background: isDark ? '#000000' : '#FFFFFF',
    card: isDark ? '#1C1C1E' : '#F2F2F7',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#6E6E73',
    primary: '#007AFF',
    error: '#FF3B30',
    border: isDark ? '#38383A' : '#C6C6C8',
    successBg: isDark ? '#1C3A27' : '#E8F8EE',
    successText: isDark ? '#4CD964' : '#1E7E34',
    errorBg: isDark ? '#3A1C1C' : '#FDE8E8',
  };

  async function handleResetPassword() {
    setServerError(null);

    if (!email.trim()) {
      Alert.alert('Campo richiesto', 'Inserisci il tuo indirizzo email.');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Email non valida', 'Inserisci un indirizzo email valido.');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(email.trim());

      if (result.success) {
        setSent(true);
      } else {
        setServerError(
          result.error ||
            'Impossibile inviare la richiesta. Riprova più tardi.'
        );
      }
    } catch (error) {
      setServerError('Si è verificato un errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  function goToLogin() {
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>🔑</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Recupero Password
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {sent
              ? 'Richiesta inviata con successo'
              : "Inserisci l'email associata al tuo account per ripristinare la password"}
          </Text>
        </View>

        {sent ? (
          /* Stato di Successo */
          <View
            style={[
              styles.statusCard,
              { backgroundColor: colors.successBg, borderColor: colors.successText },
            ]}>
            <Text style={[styles.statusTitle, { color: colors.successText }]}>
              📧 Controlla la tua casella di posta
            </Text>
            <Text style={[styles.statusText, { color: colors.text }]}>
              Abbiamo inviato le istruzioni per reimpostare la password all'indirizzo{' '}
              <Text style={{ fontWeight: 'bold' }}>{email}</Text>.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary, marginTop: 20 }]}
              onPress={goToLogin}>
              <Text style={styles.buttonText}>Torna al Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Form Richiesta Reset */
          <View style={styles.form}>
            {serverError && (
              <View
                style={[
                  styles.statusCard,
                  { backgroundColor: colors.errorBg, borderColor: colors.error },
                ]}>
                <Text style={[styles.statusTitle, { color: colors.error }]}>
                  ⚠️ Info
                </Text>
                <Text style={[styles.statusText, { color: colors.text }]}>
                  {serverError}
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="tuo@email.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Invia Link di Reset</Text>
              )}
            </TouchableOpacity>

          
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 20,
    padding: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
  },
});