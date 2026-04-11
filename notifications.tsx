import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { usePostStore } from '../../src/store/postStore';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationsScreen() {
  const { darkMode } = useAuthStore();
  const { notifications, fetchNotifications, markNotificationRead, markAllRead, fetchUnreadCount } = usePostStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  };

  const renderNotification = ({ item }: { item: any }) => {
    const timeAgo = formatDistanceToNow(new Date(item.created_at), {
      addSuffix: true,
      locale: ptBR,
    });

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          darkMode && styles.notificationCardDark,
          !item.read && styles.notificationUnread,
        ]}
        onPress={() => handleMarkRead(item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, !item.read && styles.iconContainerUnread]}>
          <Ionicons
            name={item.title.includes('comentario') ? 'chatbubble' : 'megaphone'}
            size={20}
            color={!item.read ? COLORS.white : COLORS.darkGray}
          />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.notificationTitle, darkMode && styles.textDark]}>
            {item.title}
          </Text>
          <Text style={[styles.notificationMessage, darkMode && styles.textMuted]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>{timeAgo}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={60} color={COLORS.darkGray} />
      <Text style={[styles.emptyText, darkMode && styles.textDark]}>Nenhuma notificacao</Text>
      <Text style={[styles.emptySubtext, darkMode && styles.textMuted]}>
        Voce sera notificado sobre novidades
      </Text>
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner fullScreen darkMode={darkMode} message="Carregando notificacoes..." />;
  }

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]} edges={['top']}>
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Notificacoes</Text>
        {notifications.some((n) => !n.read) && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Marcar todas como lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
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
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerDark: {
    backgroundColor: COLORS.cardDark,
    borderBottomColor: COLORS.gray,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  textDark: {
    color: COLORS.white,
  },
  textMuted: {
    color: COLORS.darkGray,
  },
  markAllText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: SIZES.padding,
    paddingBottom: 100,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  notificationCardDark: {
    backgroundColor: COLORS.cardDark,
  },
  notificationUnread: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerUnread: {
    backgroundColor: COLORS.accent,
  },
  contentContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.darkGray,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginLeft: 8,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
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
});
