import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { Post } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PostCardProps {
  post: Post;
  onPress: () => void;
  onVote: (type: 'up' | 'down') => void;
  onReport?: (postId: string, userId: string) => void;
  darkMode?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPress, onVote, onReport, darkMode }) => {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'avisos': return 'megaphone';
      case 'momentos': return 'camera';
      case 'estagios': return 'briefcase';
      case 'paquera': return 'heart';
      case 'resumos': return 'book';
      case 'memes': return 'happy';
      default: return 'chatbubbles';
    }
  };

  const getUrgenciaColor = (urg?: string) => {
    if (urg === 'alta') return COLORS.error;
    if (urg === 'media') return COLORS.warning;
    return COLORS.success;
  };

  const displayTitle = post.title || post.assunto || post.titulo_vaga || post.materia || '';
  const displayContent = post.content || post.legenda || post.descricao_vaga || '';

  return (
    <TouchableOpacity
      style={[styles.container, darkMode && styles.containerDark]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={styles.authorContainer}>
          {post.author_photo ? (
            <Image source={{ uri: post.author_photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, darkMode && styles.avatarPlaceholderDark]}>
              <Ionicons name="person" size={20} color={darkMode ? COLORS.white : COLORS.gray} />
            </View>
          )}
          <View>
            <Text style={[styles.authorName, darkMode && styles.textDark]}>
              {post.anonimo ? 'Anonimo' : post.author_name || 'Usuario'}
            </Text>
            {post.author_username && !post.anonimo && (
              <Text style={styles.authorUsername}>@{post.author_username}</Text>
            )}
            <Text style={styles.timestamp}>{timeAgo}</Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          {post.urgencia && post.category === 'avisos' && (
            <View style={[styles.urgBadge, { backgroundColor: getUrgenciaColor(post.urgencia) }]}>
              <Text style={styles.urgText}>{post.urgencia}</Text>
            </View>
          )}
          <View style={styles.categoryBadge}>
            <Ionicons name={getCategoryIcon(post.category) as any} size={12} color={COLORS.white} />
            <Text style={styles.categoryText}>{post.category}</Text>
          </View>
          {onReport && (
            <TouchableOpacity style={styles.moreBtn} onPress={() => onReport(post.id, post.user_id)}>
              <Ionicons name="ellipsis-vertical" size={18} color={darkMode ? COLORS.white : COLORS.darkGray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {displayTitle ? (
        <Text style={[styles.title, darkMode && styles.textDark]} numberOfLines={2}>
          {displayTitle}
        </Text>
      ) : null}
      {displayContent ? (
        <Text style={[styles.content, darkMode && styles.contentDark]} numberOfLines={3}>
          {displayContent}
        </Text>
      ) : null}

      {post.category === 'estagios' && post.empresa && (
        <View style={styles.metaRow}>
          <Ionicons name="business" size={14} color={COLORS.darkGray} />
          <Text style={[styles.metaText, darkMode && styles.textMuted]}>{post.empresa}</Text>
          {post.salario && (
            <>
              <Ionicons name="cash" size={14} color={COLORS.darkGray} style={{ marginLeft: 12 }} />
              <Text style={[styles.metaText, darkMode && styles.textMuted]}>{post.salario}</Text>
            </>
          )}
        </View>
      )}

      {post.category === 'resumos' && post.curso && (
        <View style={styles.metaRow}>
          <Ionicons name="school" size={14} color={COLORS.darkGray} />
          <Text style={[styles.metaText, darkMode && styles.textMuted]}>{post.curso} - {post.materia}</Text>
        </View>
      )}

      {post.file_urls && post.file_urls.length > 0 && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: post.file_urls[0] }} style={styles.previewImg} />
          {post.file_urls.length > 1 && (
            <View style={styles.moreImgs}>
              <Text style={styles.moreImgsText}>+{post.file_urls.length - 1}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, post.user_vote === 'up' && styles.activeVote]}
            onPress={() => onVote('up')}
          >
            <Ionicons
              name={post.user_vote === 'up' ? 'arrow-up' : 'arrow-up-outline'}
              size={18}
              color={post.user_vote === 'up' ? COLORS.accent : (darkMode ? COLORS.white : COLORS.gray)}
            />
            <Text style={[styles.actionText, post.user_vote === 'up' && styles.activeVoteText, darkMode && styles.textDark]}>
              {post.upvotes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, post.user_vote === 'down' && styles.activeVote]}
            onPress={() => onVote('down')}
          >
            <Ionicons
              name={post.user_vote === 'down' ? 'arrow-down' : 'arrow-down-outline'}
              size={18}
              color={post.user_vote === 'down' ? COLORS.error : (darkMode ? COLORS.white : COLORS.gray)}
            />
            <Text style={[styles.actionText, post.user_vote === 'down' && styles.activeVoteTextDown, darkMode && styles.textDark]}>
              {post.downvotes}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={16} color={darkMode ? COLORS.white : COLORS.gray} />
            <Text style={[styles.actionText, darkMode && styles.textDark]}>{post.comment_count}</Text>
          </View>
        </View>

        {post.author_star != null && post.author_star > 0 && !post.anonimo && (
          <View style={styles.starBadge}>
            <Ionicons name="star" size={12} color={COLORS.warning} />
            <Text style={styles.starText}>{post.author_star.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white, borderRadius: SIZES.borderRadius,
    padding: SIZES.padding, marginHorizontal: SIZES.margin, marginVertical: 8,
    ...SHADOWS.small,
  },
  containerDark: { backgroundColor: COLORS.cardDark },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12,
  },
  authorContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarPlaceholderDark: { backgroundColor: COLORS.gray },
  authorName: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  authorUsername: { fontSize: 12, color: COLORS.darkGray },
  timestamp: { fontSize: 11, color: COLORS.darkGray, marginTop: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  urgBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 6,
  },
  urgText: { color: COLORS.white, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  categoryText: {
    color: COLORS.white, fontSize: 11, fontWeight: '600', marginLeft: 4, textTransform: 'capitalize',
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  content: { fontSize: 14, color: COLORS.gray, lineHeight: 20, marginBottom: 10 },
  contentDark: { color: '#AAAAAA' },
  textDark: { color: COLORS.white },
  textMuted: { color: COLORS.darkGray },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  metaText: { fontSize: 12, color: COLORS.darkGray, marginLeft: 4 },
  imagePreview: {
    borderRadius: 10, overflow: 'hidden', marginBottom: 10, height: 180,
  },
  previewImg: { width: '100%', height: '100%' },
  moreImgs: {
    position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  moreImgsText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  footer: {
    borderTopWidth: 1, borderTopColor: COLORS.lightGray, paddingTop: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 20, paddingVertical: 4 },
  activeVote: { opacity: 1 },
  actionText: { marginLeft: 4, fontSize: 14, color: COLORS.gray, fontWeight: '500' },
  activeVoteText: { color: COLORS.accent },
  activeVoteTextDown: { color: COLORS.error },
  starBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warning + '20',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  starText: { fontSize: 11, fontWeight: '700', color: COLORS.warning, marginLeft: 3 },
  moreBtn: { marginLeft: 8, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
});
