import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, confirm);
      navigation.goBack();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && e.body?.errors) {
        setFieldErrors(e.body.errors);
      } else {
        setFormError('Could not create your account. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (field: string) => fieldErrors[field]?.[0];

  return (
    <View style={styles.screen}>
      <ChromeHeader title="Create Account" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label} nativeID="nameLabel">Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Jane Doe"
            placeholderTextColor={colors.textFaint}
            accessibilityLabelledBy="nameLabel"
          />
          {fieldError('name') && (
            <Text style={styles.fieldError} accessibilityRole="alert">{fieldError('name')}</Text>
          )}

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
          {fieldError('email') && (
            <Text style={styles.fieldError} accessibilityRole="alert">{fieldError('email')}</Text>
          )}

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
          {fieldError('password') && (
            <Text style={styles.fieldError} accessibilityRole="alert">{fieldError('password')}</Text>
          )}

          <Text style={styles.label} nativeID="confirmLabel">Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            accessibilityLabelledBy="confirmLabel"
          />

          {formError && (
            <Text style={styles.formError} accessibilityRole="alert">{formError}</Text>
          )}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={submit}
            disabled={loading || !name || !email || !password || !confirm}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled: loading || !name || !email || !password || !confirm, busy: loading }}
          >
            {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.submitText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Already have an account? Sign in"
          >
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
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
  fieldError: { ...type.caption, color: colors.danger, marginTop: 4 },
  formError: { ...type.caption, color: colors.danger, marginTop: spacing.sm },
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
