import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { usePostStore } from '../../src/store/postStore';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { Toast } from '../../src/components/Toast';
import api from '../../src/services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, darkMode, toggleDarkMode, logout, updateUser } = useAuthStore();
  const { userStats, userPosts, fetchUserStats, fetchUserPosts, fetchSimulados, simulados } = usePostStore();
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [followStats, setFollowStats] = useState({ followers_count: 0, following_count: 0 });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as const });
  const [statusModal, setStatusModal] = useState(false);

  const MARITAL_OPTIONS = [
    { value: 'solteiro', label: 'Solteiro(a)' },
    { value: 'namorando', label: 'Namorando' },
    { value: 'casado', label: 'Casado(a)' },
  ];

  const updateMaritalStatus = async (newStatus: string) => {
    setStatusModal(false);
    try {
      await api.put('/auth/me', { marital_status: newStatus });
      updateUser({ ...user, marital_status: newStatus } as any);
      // Auto-post no feed
      await api.post('/posts', {
        category: 'momentos',
        content: `Atualizou o status para: ${newStatus}`,
        file_urls: [],
        anonimo: false,
      });
      setToast({ visible: true, message: 'Status atualizado e publicado!', type: 'success' });
    } catch (e) {
      setToast({ visible: true, message: 'Erro ao atualizar status', type: 'error' });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (user) {
      setNotificationsEnabled(user.notifications_enabled !== false);
    }
  }, [user]);

  const loadData = async () => {
    try {
      await Promise.all([fetchUserStats(), fetchUserPosts(), fetchSimulados()]);
      try {
        const res = await api.get('/users/me/follow-stats');
        setFollowStats(res.data);
      } catch (e) {}
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await updateUser({ photo_url: base64Image } as any);
        setToast({ visible: true, message: 'Foto atualizada!', type: 'success' });
      } catch (error) {
        setToast({ visible: true, message: 'Erro ao atualizar foto', type: 'error' });
      }
    }
  };

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      await updateUser({ notifications_enabled: value } as any);
      setToast({ visible: true, message: value ? 'Notificacoes ativadas' : 'Notificacoes desativadas', type: 'success' });
    } catch (error) {
      setNotificationsEnabled(!value);
      setToast({ visible: true, message: 'Erro ao alterar notificacoes', type: 'error' });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen darkMode={darkMode} message="Carregando perfil..." />;
  }

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, darkMode && styles.headerDark]}>
          <TouchableOpacity onPress={changePhoto} activeOpacity={0.7}>
            {user?.photo_url ? (
              <View>
                <Image source={{ uri: user.photo_url }} style={styles.avatar} />
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={14} color={COLORS.white} />
                </View>
              </View>
            ) : (
              <View>
                <View style={[styles.avatarPlaceholder, darkMode && styles.avatarPlaceholderDark]}>
                  <Ionicons name="person" size={50} color={darkMode ? COLORS.white : COLORS.gray} />
                </View>
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={14} color={COLORS.white} />
                </View>
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.userName, darkMode && styles.textDark]}>{user?.name}</Text>
          {user?.username ? (
            <Text style={styles.usernameText}>@{user.username}</Text>
          ) : null}
          {user?.age ? (
            <Text style={[styles.userInfo, darkMode && styles.textMuted]}>{user.age} anos</Text>
          ) : null}
          <Text style={[styles.academicTextSimple, darkMode && styles.textMuted]}>
            {user?.curso_name || 'Curso nao informado'}
          </Text>
          {user?.marital_status ? (
            <TouchableOpacity onPress={() => setStatusModal(true)} activeOpacity={0.7}>
              <Text style={[styles.academicTextSimple, styles.editableText, darkMode && styles.textMuted]}>
                {user.marital_status}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setStatusModal(true)} activeOpacity={0.7}>
              <Text style={[styles.academicTextSimple, styles.editableText, darkMode && styles.textMuted]}>
                Definir estado civil
              </Text>
            </TouchableOpacity>
          )}
          {user?.star_rating != null && (
            <View style={styles.starRow}>
              <Ionicons name="star" size={16} color={COLORS.warning} />
              <Text style={styles.starText}>{(user.star_rating || 5).toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Follow Stats */}
        <View style={styles.followStatsRow}>
          <View style={[styles.followStatCard, darkMode && styles.statCardDark]}>
            <Text style={[styles.statNumber, darkMode && styles.textDark]}>{followStats.followers_count}</Text>
            <Text style={[styles.statLabel, darkMode && styles.textMuted]}>Seguidores</Text>
          </View>
          <View style={[styles.followStatCard, darkMode && styles.statCardDark]}>
            <Text style={[styles.statNumber, darkMode && styles.textDark]}>{followStats.following_count}</Text>
            <Text style={[styles.statLabel, darkMode && styles.textMuted]}>Seguindo</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, darkMode && styles.statCardDark]}>
            <Ionicons name="document-text" size={28} color={COLORS.accent} />
            <Text style={[styles.statNumber, darkMode && styles.textDark]}>
              {userStats?.total_simulados || 0}
            </Text>
            <Text style={[styles.statLabel, darkMode && styles.textMuted]}>Simulados</Text>
          </View>
          
          <View style={[styles.statCard, darkMode && styles.statCardDark]}>
            <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
            <Text style={[styles.statNumber, darkMode && styles.textDark]}>
              {(userStats?.taxa_acerto || 0).toFixed(0)}%
            </Text>
            <Text style={[styles.statLabel, darkMode && styles.textMuted]}>Taxa Acerto</Text>
          </View>
          
          <View style={[styles.statCard, darkMode && styles.statCardDark]}>
            <Ionicons name="create" size={28} color={COLORS.primary} />
            <Text style={[styles.statNumber, darkMode && styles.textDark]}>
              {userStats?.total_posts || 0}
            </Text>
            <Text style={[styles.statLabel, darkMode && styles.textMuted]}>Posts</Text>
          </View>
          
          <View style={[styles.statCard, darkMode && styles.statCardDark]}>
            <Ionicons name="arrow-up" size={28} color={COLORS.accent} />
            <Text style={[styles.statNumber, darkMode && styles.textDark]}>
              {userStats?.total_upvotes_received || 0}
            </Text>
            <Text style={[styles.statLabel, darkMode && styles.textMuted]}>Upvotes</Text>
          </View>
        </View>

        {/* Settings Section */}
        <View style={[styles.section, darkMode && styles.sectionDark]}>
          <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Configuracoes</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={22} color={darkMode ? COLORS.white : COLORS.gray} />
              <Text style={[styles.settingText, darkMode && styles.textDark]}>Modo Escuro</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: COLORS.lightGray, true: COLORS.accent + '50' }}
              thumbColor={darkMode ? COLORS.accent : COLORS.darkGray}
            />
          </View>

          <View style={[styles.settingDivider, darkMode && styles.settingDividerDark]} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={22} color={darkMode ? COLORS.white : COLORS.gray} />
              <Text style={[styles.settingText, darkMode && styles.textDark]}>Notificacoes Push</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: COLORS.lightGray, true: COLORS.accent + '50' }}
              thumbColor={notificationsEnabled ? COLORS.accent : COLORS.darkGray}
            />
          </View>
        </View>

        {/* Recent Posts */}
        {userPosts.length > 0 && (
          <View style={[styles.section, darkMode && styles.sectionDark]}>
            <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Meus Posts Recentes</Text>
            {userPosts.slice(0, 3).map((post) => (
              <TouchableOpacity
                key={post.id}
                style={[styles.postItem, darkMode && styles.postItemDark]}
                onPress={() => router.push(`/post/${post.id}`)}
              >
                <View style={styles.postContent}>
                  <Text style={[styles.postTitle, darkMode && styles.textDark]} numberOfLines={1}>
                    {post.title || post.category}
                  </Text>
                  <Text style={[styles.postCategory, darkMode && styles.textMuted]}>
                    {post.category} - {post.upvotes} upvotes
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.darkGray} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Estado Civil */}
      <Modal visible={statusModal} transparent animationType="slide" onRequestClose={() => setStatusModal(false)}>
        <View style={styles.statusOverlay}>
          <View style={[styles.statusSheet, darkMode && { backgroundColor: COLORS.cardDark }]}>
            <Text style={[styles.statusTitle, darkMode && styles.textDark]}>Estado Civil</Text>
            {MARITAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.statusOption, user?.marital_status === opt.value && styles.statusOptionActive]}
                onPress={() => updateMaritalStatus(opt.value)}
              >
                <Text style={[styles.statusOptionText, darkMode && styles.textDark]}>{opt.label}</Text>
                {user?.marital_status === opt.value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.statusCancel} onPress={() => setStatusModal(false)}>
              <Text style={styles.statusCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  containerDark: {
    backgroundColor: COLORS.backgroundDark,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: SIZES.padding,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.medium,
  },
  headerDark: {
    backgroundColor: COLORS.cardDark,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholderDark: {
    backgroundColor: COLORS.gray,
  },
  editBadge: {
    position: 'absolute',
    bottom: 16,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  usernameText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
    marginBottom: 4,
  },
  userInfo: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  academicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  academicText: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginLeft: 6,
  },
  academicTextSimple: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  editableText: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  statusOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  statusSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
  },
  statusOptionActive: {
    backgroundColor: COLORS.accent + '15',
  },
  statusOptionText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  statusCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  statusCancelText: {
    fontSize: 15,
    color: COLORS.darkGray,
    fontWeight: '500',
  },
  raText: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 6,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  starText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warning,
    marginLeft: 4,
  },
  textDark: {
    color: COLORS.white,
  },
  textMuted: {
    color: COLORS.darkGray,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SIZES.padding,
    paddingTop: 0,
    justifyContent: 'space-between',
  },
  followStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    paddingBottom: 4,
    gap: 12,
  },
  followStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.small,
  },
  statCardDark: {
    backgroundColor: COLORS.cardDark,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding,
    marginBottom: 16,
    borderRadius: SIZES.borderRadius,
    padding: 16,
    ...SHADOWS.small,
  },
  sectionDark: {
    backgroundColor: COLORS.cardDark,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 15,
    color: COLORS.primary,
    marginLeft: 12,
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 4,
  },
  settingDividerDark: {
    backgroundColor: COLORS.gray,
  },
  postItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  postItemDark: {
    borderBottomColor: COLORS.gray,
  },
  postContent: {
    flex: 1,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  postCategory: {
    fontSize: 12,
    color: COLORS.darkGray,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SIZES.padding,
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    backgroundColor: COLORS.error + '15',
    borderRadius: SIZES.borderRadius,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
