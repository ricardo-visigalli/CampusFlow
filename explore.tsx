import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';
import { Toast } from '../../src/components/Toast';
import api from '../../src/services/api';

interface UserResult {
  id: string;
  name: string;
  username: string;
  photo_url?: string;
  star_rating: number;
  curso_name?: string;
  is_following: boolean;
  followers_count: number;
  following_count?: number;
  is_contact?: boolean;
}

export default function ExploreScreen() {
  const { darkMode } = useAuthStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as const });

  useFocusEffect(
    useCallback(() => {
      loadSuggestions();
    }, [])
  );

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/users/explore');
      setSuggestedUsers(response.data);
    } catch (error) {
      console.error('Erro ao carregar sugestoes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUsers([]);
      return;
    }
    setIsSearching(true);
    try {
      const cleanQuery = query.startsWith('@') ? query.substring(1) : query;
      const response = await api.get(`/users/search?q=${encodeURIComponent(cleanQuery)}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFollow = async (userId: string, currentlyFollowing: boolean) => {
    try {
      if (currentlyFollowing) {
        await api.delete(`/users/${userId}/follow`);
        setFollowingMap(prev => ({ ...prev, [userId]: false }));
        setToast({ visible: true, message: 'Deixou de seguir', type: 'info' });
      } else {
        await api.post(`/users/${userId}/follow`);
        setFollowingMap(prev => ({ ...prev, [userId]: true }));
        setToast({ visible: true, message: 'Seguindo!', type: 'success' });
      }
      // Update both lists
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_following: !currentlyFollowing } : u));
      setSuggestedUsers(prev => prev.map(u => u.id === userId ? { ...u, is_following: !currentlyFollowing } : u));
    } catch (error: any) {
      setToast({ visible: true, message: 'Erro ao atualizar follow', type: 'error' });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSuggestions();
    setRefreshing(false);
  };

  const isFollowing = (user: UserResult) => {
    if (followingMap[user.id] !== undefined) return followingMap[user.id];
    return user.is_following;
  };

  const renderUser = ({ item }: { item: UserResult }) => {
    const following = isFollowing(item);
    return (
      <TouchableOpacity
        style={[styles.userCard, darkMode && styles.userCardDark]}
        onPress={() => router.push(`/user/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, darkMode && styles.avatarPlaceholderDark]}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, darkMode && styles.textDark]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.is_contact && (
            <View style={styles.contactBadge}>
              <Ionicons name="call-outline" size={10} color={COLORS.white} />
              <Text style={styles.contactBadgeText}>Contato</Text>
            </View>
          )}
          <Text style={[styles.userHandle, darkMode && styles.textMuted]} numberOfLines={1}>
            @{item.username}
          </Text>
          {item.curso_name ? (
            <Text style={[styles.userCurso, darkMode && styles.textMuted]} numberOfLines={1}>
              {item.curso_name}
            </Text>
          ) : null}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={12} color={COLORS.darkGray} />
              <Text style={styles.statText}>{item.followers_count} seguidores</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star" size={12} color={COLORS.accent} />
              <Text style={styles.statText}>{item.star_rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.followBtn, following && styles.followingBtn]}
          onPress={() => handleFollow(item.id, following)}
          activeOpacity={0.7}
        >
          <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
            {following ? 'Seguindo' : 'Seguir'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={60} color={COLORS.darkGray} />
      <Text style={[styles.emptyText, darkMode && styles.textDark]}>
        {searchQuery.length > 0 ? 'Nenhum usuario encontrado' : 'Busque usuarios pelo @'}
      </Text>
      <Text style={[styles.emptySubtext, darkMode && styles.textMuted]}>
        {searchQuery.length > 0 ? 'Tente outro termo de busca' : 'Encontre colegas e siga-os para ficar conectado'}
      </Text>
    </View>
  );

  const displayList = searchQuery.length >= 2 ? users : suggestedUsers;

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]} edges={['top']}>
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Explorar</Text>
        <Text style={[styles.headerSubtitle, darkMode && styles.textMuted]}>Encontre colegas e conecte-se</Text>
      </View>

      <View style={[styles.searchContainer, darkMode && styles.searchContainerDark]}>
        <Ionicons name="search" size={20} color={COLORS.darkGray} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, darkMode && styles.searchInputDark]}
          placeholder="Buscar por @usuario ou nome..."
          placeholderTextColor={COLORS.darkGray}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchUsers(text);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setUsers([]); }} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={COLORS.darkGray} />
          </TouchableOpacity>
        )}
      </View>

      {isSearching && (
        <View style={styles.searchingIndicator}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={[styles.searchingText, darkMode && styles.textMuted]}>Buscando...</Text>
        </View>
      )}

      {searchQuery.length < 2 && suggestedUsers.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>
            {suggestedUsers.some(u => u.is_contact) ? 'Seus contatos e sugestoes' : 'Sugestoes para voce'}
          </Text>
        </View>
      )}

      {isLoading && searchQuery.length < 2 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={[styles.searchingText, darkMode && styles.textMuted]}>Carregando...</Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          renderItem={renderUser}
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
          ListEmptyComponent={!isSearching ? renderEmpty : null}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  containerDark: { backgroundColor: COLORS.backgroundDark },
  header: {
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
  },
  headerDark: { backgroundColor: COLORS.cardDark },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  headerSubtitle: { fontSize: 13, color: COLORS.darkGray, marginTop: 2 },
  textDark: { color: COLORS.white },
  textMuted: { color: COLORS.darkGray },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    ...SHADOWS.small,
  },
  searchContainerDark: { backgroundColor: COLORS.cardDark },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
    color: COLORS.primary,
  },
  searchInputDark: { color: COLORS.white },
  clearBtn: { padding: 4 },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  searchingText: { fontSize: 13, color: COLORS.darkGray, marginLeft: 8 },
  sectionHeader: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  listContent: { paddingHorizontal: SIZES.padding, paddingBottom: 100 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  userCardDark: { backgroundColor: COLORS.cardDark },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarPlaceholderDark: { backgroundColor: COLORS.accent + '30' },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.accent },
  userInfo: { flex: 1, marginRight: 8 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  userHandle: { fontSize: 13, color: COLORS.darkGray, marginTop: 1 },
  userCurso: { fontSize: 11, color: COLORS.darkGray, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 11, color: COLORS.darkGray },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    minWidth: 80,
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  followBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  followingBtnText: { color: COLORS.accent },
  contactBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#4CAF50', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2,
  },
  contactBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.white },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 40, marginTop: 40,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.primary, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.darkGray, marginTop: 8, textAlign: 'center' },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40,
  },
});
