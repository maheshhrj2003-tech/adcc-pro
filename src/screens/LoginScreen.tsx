import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const role = await login(email.trim(), password);
      if (role === 'screener') {
        // Screener accounts get a distinct, isolated flow — no access to the
        // regular audience catalog/favorites, per the API reference's
        // screener-mode requirement.
        navigation.reset({ index: 0, routes: [{ name: 'Screenings' }] });
      } else {
        navigation.goBack();
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError('Invalid credentials.');
      } else {
        setError('Could not sign in. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ChromeHeader title="Sign In" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.label} nativeID="emailLabel">Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.textFaint}
            accessibilityLabelledBy="emailLabel"
          />
          <Text style={styles.label} nativeID="passwordLabel">Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            accessibilityLabelledBy="passwordLabel"
          />

          {error && (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          )}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={submit}
            disabled={loading || !email || !password}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: loading || !email || !password, busy: loading }}
          >
            {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.submitText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="button"
            accessibilityLabel="Don't have an account? Create one"
          >
            <Text style={styles.linkText}>Don't have an account? Create one</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  label: { ...type.caption, color: colors.textMuted, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    ...type.body,
  },
  error: { ...type.caption, color: colors.danger, marginTop: spacing.sm },
  submitBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitText: { ...type.h2, color: colors.bg },
  linkText: { ...type.body, color: colors.gold, textAlign: 'center', marginTop: spacing.lg },
});
