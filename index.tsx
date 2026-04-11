import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { usePostStore } from '../../src/store/postStore';
import { COLORS, SIZES, CATEGORIES } from '../../src/constants/theme';
import { PostCard } from '../../src/components/PostCard';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { Toast } from '../../src/components/Toast';
import api from '../../src/services/api';

const REPORT_REASONS = [
  'Conteudo ofensivo',
  'Spam ou propaganda',
  'Informacao falsa',
  'Assedio',
  'Conteudo inapropriado',
  'Outro',
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, darkMode } = useAuthStore();
  const { posts, isLoading, fetchPosts, votePost, selectedCategory, setSelectedCategory, fetchUnreadCount, unreadCount } = usePostStore();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as const });
  const [reportModal, setReportModal] = useState(false);
  const [reportPostId, setReportPostId] = useState('');
  const [reportUserId, setReportUserId] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  const openReport = (postId: string, userId: string) => {
    setReportPostId(postId);
    setReportUserId(userId);
    setReportReason('');
    setReportDesc('');
    setReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason) {
      setToast({ visible: true, message: 'Selecione um motivo', type: 'error' });
      return;
    }
    try {
      await api.post('/report', {
        post_id: reportPostId,
        user_id: reportUserId,
        reason: reportReason,
        description: reportDesc,
      });
      setReportModal(false);
      setToast({ visible: true, message: 'Denuncia enviada!', type: 'success' });
    } catch (e) {
      setToast({ visible: true, message: 'Erro ao enviar denuncia', type: 'error' });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedCategory])
  );

  const loadData = async () => {
    try {
      await fetchPosts(selectedCategory || undefined);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
    await fetchUnreadCount();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleVote = async (postId: string, type: 'up' | 'down') => {
    try {
      await votePost(postId, type);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setToast({ visible: true, message: 'Faca login para votar', type: 'error' });
      }
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, darkMode && styles.headerDark]}>
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, darkMode && styles.textDark]}>Ola, {user?.name?.split(' ')[0]}!</Text>
          <Text style={[styles.subGreeting, darkMode && styles.textMuted]}>
            {user?.curso_name || 'Bem-vindo ao CampusFlow'}
          </Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/chat')} activeOpacity={0.7}>
          <Ionicons name="chatbubbles-outline" size={24} color={darkMode ? COLORS.white : COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/(tabs)/notifications')} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={24} color={darkMode ? COLORS.white : COLORS.primary} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoSmall}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Ionicons
            name="apps"
            size={14}
            color={!selectedCategory ? COLORS.white : (darkMode ? COLORS.white : COLORS.gray)}
          />
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive, darkMode && !selectedCategory && styles.categoryTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={14}
              color={selectedCategory === cat.id ? COLORS.white : (darkMode ? COLORS.white : COLORS.gray)}
            />
            <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive, darkMode && selectedCategory !== cat.id && styles.textMuted]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="newspaper-outline" size={60} color={COLORS.darkGray} />
      <Text style={[styles.emptyText, darkMode && styles.textDark]}>Nenhum post encontrado</Text>
      <Text style={[styles.emptySubtext, darkMode && styles.textMuted]}>
        Seja o primeiro a compartilhar algo!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]} edges={['top']}>
      {renderHeader()}
      
      {isLoading && posts.length === 0 ? (
        <LoadingSpinner fullScreen darkMode={darkMode} message="Carregando posts..." />
      ) : (
        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              darkMode={darkMode}
              onPress={() => router.push(`/post/${item.id}`)}
              onVote={(type) => handleVote(item.id, type)}
              onReport={openReport}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Report Modal */}
      <Modal visible={reportModal} transparent animationType="slide" onRequestClose={() => setReportModal(false)}>
        <View style={styles.reportOverlay}>
          <View style={[styles.reportSheet, darkMode && styles.reportSheetDark]}>
            <View style={styles.reportHeader}>
              <Text style={[styles.reportTitle, darkMode && styles.textDark]}>Denunciar Post</Text>
              <TouchableOpacity onPress={() => setReportModal(false)}>
                <Ionicons name="close" size={24} color={darkMode ? COLORS.white : COLORS.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.reportSubtitle, darkMode && styles.textMuted]}>Selecione o motivo:</Text>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[styles.reportOption, reportReason === reason && styles.reportOptionActive]}
                onPress={() => setReportReason(reason)}
              >
                <Ionicons
                  name={reportReason === reason ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={reportReason === reason ? COLORS.accent : COLORS.darkGray}
                />
                <Text style={[styles.reportOptionText, darkMode && styles.textDark]}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[styles.reportInput, darkMode && styles.reportInputDark]}
              placeholder="Descricao adicional (opcional)"
              placeholderTextColor={COLORS.darkGray}
              value={reportDesc}
              onChangeText={setReportDesc}
              multiline
              maxLength={300}
            />
            <TouchableOpacity style={styles.reportSubmit} onPress={submitReport}>
              <Text style={styles.reportSubmitText}>Enviar Denuncia</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
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
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerDark: {
    backgroundColor: COLORS.cardDark,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  subGreeting: {
    fontSize: 13,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  logoSmall: {
    width: 40,
    height: 40,
  },
  textDark: {
    color: COLORS.white,
  },
  textMuted: {
    color: COLORS.darkGray,
  },
  categoriesContainer: {
    marginTop: 4,
  },
  categoriesContent: {
    paddingRight: SIZES.padding,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.accent,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray,
    marginLeft: 6,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 8,
    textAlign: 'center',
  },
  bellBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  reportOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  reportSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40, maxHeight: '80%',
  },
  reportSheetDark: { backgroundColor: COLORS.cardDark },
  reportHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  reportTitle: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  reportSubtitle: { fontSize: 14, color: COLORS.darkGray, marginBottom: 12 },
  reportOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10,
  },
  reportOptionActive: { opacity: 1 },
  reportOptionText: { fontSize: 15, color: COLORS.primary },
  reportInput: {
    borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 10,
    padding: 12, fontSize: 14, marginTop: 12, color: COLORS.primary, minHeight: 60,
  },
  reportInputDark: { borderColor: '#444', color: COLORS.white, backgroundColor: '#2A2A2A' },
  reportSubmit: {
    backgroundColor: COLORS.error, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  reportSubmitText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
