import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SIZES } from '../../src/constants/theme';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import api from '../../src/services/api';
import { Faculdade, Campus, Curso } from '../../src/types';

type Step = 1 | 2 | 3 | 4;

interface FormData {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthDateStr: string;
  gender: string;
  marital_status: string;
  faculdade_id: string;
  campus_id: string;
  curso_id: string;
  ra: string;
  photo_url: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register, darkMode } = useAuthStore();
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [contactsGranted, setContactsGranted] = useState(false);
  const [contactsCount, setContactsCount] = useState(0);
  const progressAnim = useState(new Animated.Value(0.25))[0];

  const [formData, setFormData] = useState<FormData>({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDateStr: '',
    gender: '',
    marital_status: '',
    faculdade_id: '',
    campus_id: '',
    curso_id: '',
    ra: '',
    photo_url: '',
  });

  const [faculdades, setFaculdades] = useState<Faculdade[]>([]);
  const [campi, setCampi] = useState<Campus[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFaculdades();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step * 0.25,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const loadFaculdades = async () => {
    try {
      const response = await api.get('/faculdades');
      setFaculdades(response.data);
    } catch (error) {
      console.error('Error loading faculdades:', error);
    }
  };

  const loadCampi = async (faculdadeId: string) => {
    try {
      const response = await api.get(`/faculdades/${faculdadeId}/campi`);
      setCampi(response.data);
    } catch (error) {
      console.error('Error loading campi:', error);
    }
  };

  const loadCursos = async (campusId: string) => {
    try {
      const response = await api.get(`/campi/${campusId}/cursos`);
      setCursos(response.data);
    } catch (error) {
      console.error('Error loading cursos:', error);
    }
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }

    if (field === 'faculdade_id') {
      setFormData({ ...formData, faculdade_id: value, campus_id: '', curso_id: '' });
      setCampi([]);
      setCursos([]);
      loadCampi(value);
    } else if (field === 'campus_id') {
      setFormData({ ...formData, campus_id: value, curso_id: '' });
      setCursos([]);
      loadCursos(value);
    }
  };

  const handleDateInput = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
    let formatted = '';
    if (cleaned.length > 0) formatted = cleaned.slice(0, Math.min(2, cleaned.length));
    if (cleaned.length > 2) formatted += '/' + cleaned.slice(2, Math.min(4, cleaned.length));
    if (cleaned.length > 4) formatted += '/' + cleaned.slice(4, 8);
    setFormData({ ...formData, birthDateStr: formatted });
    if (errors.birthDateStr) setErrors({ ...errors, birthDateStr: '' });
  };

  const parseBirthDate = (): Date | null => {
    const parts = formData.birthDateStr.split('/');
    if (parts.length !== 3 || parts[2].length !== 4) return null;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const date = new Date(year, month, day);
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) return null;
    return date;
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name || formData.name.length < 2) newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
        if (!formData.username || formData.username.length < 3) newErrors.username = 'Username deve ter pelo menos 3 caracteres';
        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) newErrors.username = 'Username: apenas letras, numeros e _';
        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email invalido';
        if (!formData.password || formData.password.length < 8) newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Senhas nao conferem';
        break;
      case 2:
        if (!formData.faculdade_id) newErrors.faculdade_id = 'Selecione uma faculdade';
        if (!formData.campus_id) newErrors.campus_id = 'Selecione um campus';
        if (!formData.curso_id) newErrors.curso_id = 'Selecione um curso';
        break;
      case 3: {
        const birthDate = parseBirthDate();
        if (!formData.birthDateStr || formData.birthDateStr.length < 10) {
          newErrors.birthDateStr = 'Preencha a data completa (DD/MM/AAAA)';
        } else if (!birthDate) {
          newErrors.birthDateStr = 'Data invalida';
        } else {
          const age = calculateAge(birthDate);
          if (age < 16 || age > 100) newErrors.birthDateStr = 'Idade deve ser entre 16 e 100 anos';
        }
        if (!formData.gender) newErrors.gender = 'Selecione o sexo';
        if (!formData.marital_status) newErrors.marital_status = 'Selecione o estado civil';
        if (!formData.ra) newErrors.ra = 'RA obrigatorio';
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      if (step < 4) setStep((step + 1) as Step);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      updateField('photo_url', base64Image);
    }
  };

  const requestContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Name],
        });
        setContactsGranted(true);
        setContactsCount(data.length);
        // Salvar contatos no backend apos o registro
        return data.map(c => ({
          name: c.name || '',
          phones: c.phoneNumbers?.map(p => p.number) || [],
          emails: c.emails?.map(e => e.email) || [],
        }));
      }
    } catch (e) {
      console.error('Erro ao acessar contatos:', e);
    }
    return [];
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const birthDate = parseBirthDate();
      const age = birthDate ? calculateAge(birthDate) : 0;
      await register({
        name: formData.name,
        username: formData.username.toLowerCase(),
        email: formData.email,
        password: formData.password,
        age: age,
        gender: formData.gender,
        marital_status: formData.marital_status,
        faculdade_id: formData.faculdade_id,
        campus_id: formData.campus_id,
        curso_id: formData.curso_id,
        ra: formData.ra,
        photo_url: formData.photo_url || null,
      });
      // Enviar contatos em background se permissao foi concedida
      if (contactsGranted) {
        try {
          const contacts = await requestContacts();
          if (contacts.length > 0) {
            await api.post('/users/me/contacts', { contacts: contacts.slice(0, 500) });
          }
        } catch (e) { /* silencioso */ }
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  const renderDropdown = (items: { id: string; name: string }[], field: keyof FormData, placeholder: string) => {
    const selectedItem = items.find(i => i.id === formData[field]);

    return (
      <View>
        <TouchableOpacity
          style={[styles.dropdown, darkMode && styles.inputDark, errors[field] && styles.inputError]}
          onPress={() => setShowDropdown(showDropdown === field ? null : field)}
        >
          <Text style={[styles.dropdownText, !selectedItem && styles.placeholder, darkMode && styles.textDark]}>
            {selectedItem?.name || placeholder}
          </Text>
          <Ionicons name={showDropdown === field ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.darkGray} />
        </TouchableOpacity>

        {showDropdown === field && (
          <View style={[styles.dropdownList, darkMode && styles.dropdownListDark]}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.dropdownItem, formData[field] === item.id && styles.dropdownItemSelected]}
                  onPress={() => {
                    updateField(field, item.id);
                    setShowDropdown(null);
                  }}
                >
                  <Text style={[styles.dropdownItemText, darkMode && styles.textDark]}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  const renderStep1 = () => (
    <>
      <Text style={[styles.stepTitle, darkMode && styles.textDark]}>Dados de Acesso</Text>

      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark, errors.name && styles.inputError]}
          placeholder="Nome completo"
          placeholderTextColor={COLORS.darkGray}
          value={formData.name}
          onChangeText={(text) => updateField('name', text)}
        />
      </View>
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

      <View style={styles.inputContainer}>
        <Ionicons name="at" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark, errors.username && styles.inputError]}
          placeholder="Username (ex: joao_silva)"
          placeholderTextColor={COLORS.darkGray}
          value={formData.username}
          onChangeText={(text) => updateField('username', text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          autoCapitalize="none"
        />
      </View>
      {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark, errors.email && styles.inputError]}
          placeholder="Email"
          placeholderTextColor={COLORS.darkGray}
          value={formData.email}
          onChangeText={(text) => updateField('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark, errors.password && styles.inputError]}
          placeholder="Senha (min 8 caracteres)"
          placeholderTextColor={COLORS.darkGray}
          value={formData.password}
          onChangeText={(text) => updateField('password', text)}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.darkGray} />
        </TouchableOpacity>
      </View>
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark, errors.confirmPassword && styles.inputError]}
          placeholder="Confirme a senha"
          placeholderTextColor={COLORS.darkGray}
          value={formData.confirmPassword}
          onChangeText={(text) => updateField('confirmPassword', text)}
          secureTextEntry={!showPassword}
        />
      </View>
      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[styles.stepTitle, darkMode && styles.textDark]}>Dados Academicos</Text>
      {renderDropdown(faculdades, 'faculdade_id', 'Selecione a faculdade')}
      {formData.faculdade_id && renderDropdown(campi, 'campus_id', 'Selecione o campus')}
      {formData.campus_id && renderDropdown(cursos, 'curso_id', 'Selecione o curso')}
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={[styles.stepTitle, darkMode && styles.textDark]}>Dados Pessoais</Text>

      <View style={styles.inputContainer}>
        <Ionicons name="calendar-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark, errors.birthDateStr && styles.inputError]}
          placeholder="Data de Nascimento (DD/MM/AAAA)"
          placeholderTextColor={COLORS.darkGray}
          value={formData.birthDateStr}
          onChangeText={handleDateInput}
          keyboardType="number-pad"
          maxLength={10}
        />
      </View>
      {errors.birthDateStr && <Text style={styles.errorText}>{errors.birthDateStr}</Text>}
      {formData.birthDateStr.length === 10 && parseBirthDate() && (
        <Text style={[styles.ageText, darkMode && styles.textMuted]}>
          {calculateAge(parseBirthDate()!)} anos
        </Text>
      )}

      {renderDropdown(
        [{ id: 'masculino', name: 'Masculino' }, { id: 'feminino', name: 'Feminino' }, { id: 'outro', name: 'Outro' }],
        'gender',
        'Selecione o sexo'
      )}

      {renderDropdown(
        [{ id: 'solteiro', name: 'Solteiro(a)' }, { id: 'namorando', name: 'Namorando' }, { id: 'casado', name: 'Casado(a)' }],
        'marital_status',
        'Estado civil'
      )}

      <View style={styles.inputContainer}>
        <Ionicons name="card-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, darkMode && styles.inputDark, errors.ra && styles.inputError]}
          placeholder="RA (Registro Academico)"
          placeholderTextColor={COLORS.darkGray}
          value={formData.ra}
          onChangeText={(text) => updateField('ra', text)}
        />
      </View>
      {errors.ra && <Text style={styles.errorText}>{errors.ra}</Text>}
    </>
  );

  const renderStep4 = () => (
    <>
      <Text style={[styles.stepTitle, darkMode && styles.textDark]}>Foto e Contatos</Text>

      <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
        {formData.photo_url ? (
          <Image source={{ uri: formData.photo_url }} style={styles.photo} />
        ) : (
          <View style={[styles.photoPlaceholder, darkMode && styles.photoPlaceholderDark]}>
            <Ionicons name="camera" size={40} color={COLORS.darkGray} />
            <Text style={[styles.photoText, darkMode && styles.textMuted]}>Adicionar foto</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.contactsCard}>
        <View style={styles.contactsInfo}>
          <Ionicons name="people" size={24} color={COLORS.accent} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.contactsTitle, darkMode && styles.textDark]}>Sincronizar Contatos</Text>
            <Text style={[styles.contactsDesc, darkMode && styles.textMuted]}>
              Encontre colegas que ja usam o CampusFlow
            </Text>
          </View>
        </View>
        {contactsGranted ? (
          <View style={styles.contactsGrantedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.contactsGrantedText}>{contactsCount} contatos</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.contactsBtn} onPress={async () => {
            const contacts = await requestContacts();
            if (contacts.length > 0) {
              setContactsCount(contacts.length);
            }
          }}>
            <Text style={styles.contactsBtnText}>Permitir</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.skipButton} onPress={handleRegister}>
        <Text style={styles.skipText}>Pular esta etapa</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, darkMode && styles.containerDark]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {step > 1 && (
            <TouchableOpacity onPress={prevStep} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={darkMode ? COLORS.white : COLORS.primary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Cadastro</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, darkMode && styles.progressBarDark]}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
          <Text style={styles.progressText}>Etapa {step} de 4</Text>
        </View>

        <View style={styles.form}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </View>

        {step < 4 && (
          <TouchableOpacity style={styles.button} onPress={nextStep}>
            <Text style={styles.buttonText}>Proximo</Text>
          </TouchableOpacity>
        )}

        {step === 4 && (
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner /> : <Text style={styles.buttonText}>Criar Conta</Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.back()} style={styles.loginLink}>
          <Text style={[styles.loginText, darkMode && styles.textMuted]}>Ja tem uma conta? </Text>
          <Text style={styles.loginLinkText}>Entrar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  containerDark: {
    backgroundColor: COLORS.backgroundDark,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.padding * 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 40,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  textDark: {
    color: COLORS.white,
  },
  textMuted: {
    color: COLORS.darkGray,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarDark: {
    backgroundColor: COLORS.gray,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 48,
    fontSize: 16,
    color: COLORS.primary,
  },
  inputDark: {
    backgroundColor: COLORS.cardDark,
    color: COLORS.white,
  },
  inputError: {
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  ageText: {
    fontSize: 13,
    color: COLORS.accent,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '600',
  },
  dropdown: {
    height: 52,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  placeholder: {
    color: COLORS.darkGray,
  },
  dropdownList: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    marginTop: -4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  dropdownListDark: {
    backgroundColor: COLORS.cardDark,
    borderColor: COLORS.gray,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.accent + '20',
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderDark: {
    backgroundColor: COLORS.cardDark,
  },
  photoText: {
    marginTop: 8,
    color: COLORS.darkGray,
    fontSize: 14,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  skipText: {
    color: COLORS.darkGray,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: COLORS.accent,
    height: 52,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  loginText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  loginLinkText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  contactsCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  contactsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  contactsDesc: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  contactsBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  contactsBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  contactsGrantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  contactsGrantedText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '500',
  },
});
