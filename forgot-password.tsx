import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';
import { Toast } from '../../src/components/Toast';
import api from '../../src/services/api';

type Step = 'email' | 'code' | 'done';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as const });

  const requestCode = async () => {
    if (!email.includes('@')) {
      setToast({ visible: true, message: 'Informe um email valido', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setToast({ visible: true, message: 'Codigo enviado! Verifique seu email.', type: 'success' });
      setStep('code');
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Erro ao enviar codigo';
      setToast({ visible: true, message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (code.length < 6) {
      setToast({ visible: true, message: 'Informe o codigo de 6 digitos', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setToast({ visible: true, message: 'Senha deve ter pelo menos 6 caracteres', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ visible: true, message: 'Senhas nao conferem', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, new_password: newPassword });
      setToast({ visible: true, message: 'Senha alterada com sucesso!', type: 'success' });
      setStep('done');
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Erro ao redefinir senha';
      setToast({ visible: true, message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Ionicons name="lock-closed-outline" size={60} color={COLORS.accent} style={{ alignSelf: 'center' }} />
            <Text style={styles.title}>
              {step === 'email' ? 'Recuperar Senha' : step === 'code' ? 'Verificar Codigo' : 'Senha Alterada!'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email' 
                ? 'Informe seu email cadastrado para receber o codigo de recuperacao.' 
                : step === 'code' 
                  ? 'Digite o codigo de 6 digitos enviado para seu email e sua nova senha.'
                  : 'Sua senha foi alterada com sucesso. Voce ja pode fazer login.'}
            </Text>

            {step === 'email' && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="seu@email.com"
                      placeholderTextColor={COLORS.darkGray}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
                <TouchableOpacity style={[styles.mainBtn, loading && { opacity: 0.5 }]} onPress={requestCode} disabled={loading}>
                  {loading ? <ActivityIndicator color={COLORS.white} /> : (
                    <Text style={styles.mainBtnText}>Enviar Codigo</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {step === 'code' && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Codigo de Verificacao</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="key-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="000000"
                      placeholderTextColor={COLORS.darkGray}
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nova Senha</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Min. 6 caracteres"
                      placeholderTextColor={COLORS.darkGray}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.darkGray} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirmar Senha</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Repita a senha"
                      placeholderTextColor={COLORS.darkGray}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                </View>
                <TouchableOpacity style={[styles.mainBtn, loading && { opacity: 0.5 }]} onPress={resetPassword} disabled={loading}>
                  {loading ? <ActivityIndicator color={COLORS.white} /> : (
                    <Text style={styles.mainBtnText}>Redefinir Senha</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.resendBtn} onPress={requestCode} disabled={loading}>
                  <Text style={styles.resendBtnText}>Reenviar codigo</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'done' && (
              <TouchableOpacity style={styles.mainBtn} onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.mainBtnText}>Ir para Login</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { flexGrow: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.primary, textAlign: 'center', marginTop: 16 },
  subtitle: { fontSize: 14, color: COLORS.darkGray, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  form: { marginTop: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray,
    borderRadius: 12, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, paddingVertical: 14, color: COLORS.primary },
  mainBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  mainBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  resendBtn: { alignItems: 'center', marginTop: 16, padding: 8 },
  resendBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '500' },
});
