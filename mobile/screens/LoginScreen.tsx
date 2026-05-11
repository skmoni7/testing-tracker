// ======================================================
// LOGIN SCREEN
// Email/password login + Forgot Password
// ======================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ----- Login handler -----
  async function handleLogin() {
    if (!email || !password) return Alert.alert('Error', 'Please enter email and password.');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  // ----- Forgot password handler -----
  async function handleForgotPassword() {
    if (!email) return Alert.alert('Enter your email first', 'Type your email above then tap Forgot Password.');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Logo */}
        <Text style={styles.logo}>ProTrack</Text>
        <Text style={styles.subtitle}>Free Testing Tracker</Text>

        {/* Email input */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor="#555"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Password input */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#555"
          secureTextEntry
        />

        {/* Login button */}
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>

        {/* Forgot password */}
        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: '#1a1a2e' },
  logo: { fontSize: 38, fontWeight: 'bold', color: '#6366f1', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 40 },
  label: { color: '#ccc', fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#16213e', color: '#fff', borderRadius: 10,
    padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#2a2a4a',
  },
  button: {
    backgroundColor: '#6366f1', borderRadius: 10, padding: 15,
    alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  forgotBtn: { alignItems: 'center', marginTop: 16 },
  forgotText: { color: '#6366f1', fontSize: 14 },
});
