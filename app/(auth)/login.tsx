import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { COLOR_THEMES } from '@/constants/theme';

const T = COLOR_THEMES[0]; // Spirit Purple default

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) Alert.alert('Sign in failed', error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) {
          Alert.alert('Sign up failed', error.message);
        } else {
          Alert.alert(
            'Check your email',
            'We sent a confirmation link. Click it to activate your account, then sign in.',
          );
          setMode('login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>InSync</Text>
          <Text style={styles.appSub}>ATHLETICS</Text>
          <Text style={styles.tagline}>Manage your team, track every skill.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.modeBtnText, mode === 'signup' && styles.modeBtnTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="coach@example.com"
            placeholderTextColor={T.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
            placeholderTextColor={T.muted}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={T.primary} />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot password — login only */}
          {mode === 'login' && (
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={async () => {
                if (!email.trim()) {
                  Alert.alert('Enter your email first', 'We\'ll send a reset link to that address.');
                  return;
                }
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
                if (error) Alert.alert('Error', error.message);
                else Alert.alert('Reset link sent', 'Check your email for a password reset link.');
              }}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <Text
            style={styles.footerLink}
            onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.primary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  appSub: {
    fontSize: 12,
    fontWeight: '700',
    color: T.accent,
    letterSpacing: 3,
    marginTop: 2,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 10,
  },
  card: {
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: T.bg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeBtnActive: {
    backgroundColor: T.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: T.muted,
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: T.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  input: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: T.primary,
  },
  submitBtn: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 22,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: T.primary,
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  forgotText: {
    fontSize: 13,
    color: T.muted,
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  footerLink: {
    color: T.accent,
    fontWeight: '700',
  },
});
