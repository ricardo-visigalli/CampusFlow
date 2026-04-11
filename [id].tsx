import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
  Clipboard, Alert, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS } from '../../src/constants/theme';
import api from '../../src/services/api';
import { supabaseClient } from '../../src/services/supabase';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  content?: string;
  message_type: string;
  file_url?: string;
  read: boolean;
  created_at: string;
}

interface MessageGroup {
  type: 'date' | 'message';
  key: string;
  date?: string;
  message?: Message;
  isFirst?: boolean;
  isLast?: boolean;
  isMine?: boolean;
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, darkMode } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<any>(null);
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;
  const prevMessageCount = useRef(0);

  useEffect(() => {
    loadChat();
    // Fallback polling every 8s (in case Realtime is not enabled)
    pollRef.current = setInterval(loadMessages, 8000);
    // Subscribe to Supabase Realtime
    subscribeRealtime();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
      }
    };
  }, [id]);

  const subscribeRealtime = () => {
    try {
      const uid = user?.id;
      if (!uid || !id) return;
      const channel = supabaseClient
        .channel(`chat-${uid}-${id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${uid}`,
        }, (payload: any) => {
          const newMsg = payload.new;
          if (newMsg && (newMsg.sender_id === id || newMsg.receiver_id === id)) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (!showScrollBtn) {
              setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }
            // Mark as read via API
            api.get(`/chat/${id}/messages`).catch(() => {});
          }
        })
        .subscribe();
      channelRef.current = channel;
    } catch (e) {
      console.log('Realtime subscription fallback to polling');
    }
  };

  useEffect(() => {
    if (showScrollBtn) {
      Animated.timing(scrollBtnOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(scrollBtnOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [showScrollBtn]);

  const loadChat = async () => {
    try {
      const [msgsRes, profileRes] = await Promise.all([
        api.get(`/chat/${id}/messages`),
        api.get(`/users/${id}/profile`).catch(() => null),
      ]);
      setMessages(msgsRes.data);
      if (profileRes?.data) setOtherUser(profileRes.data);
      prevMessageCount.current = msgsRes.data.length;
    } catch (e) {
      console.error('Erro ao carregar chat:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await api.get(`/chat/${id}/messages`);
      const newMsgs = res.data;
      if (newMsgs.length !== prevMessageCount.current) {
        setMessages(newMsgs);
        prevMessageCount.current = newMsgs.length;
        if (!showScrollBtn) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    } catch (e) {}
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      sender_id: user?.id || '',
      receiver_id: id || '',
      sender_name: user?.name || '',
      content: text,
      message_type: 'text',
      read: false,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);
    setInputText('');
    setSending(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await api.post('/chat/send', {
        receiver_id: id,
        content: text,
        message_type: 'text',
      });
      setMessages(prev => prev.map(m => m.id === tempId ? res.data : m));
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(text);
      Alert.alert('Erro', 'Nao foi possivel enviar a mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const copyMessage = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copiado', 'Mensagem copiada');
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollBtn(false);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowScrollBtn(distFromBottom > 150);
  };

  // Group messages by date and consecutive sender
  const groupMessages = useCallback((): MessageGroup[] => {
    if (messages.length === 0) return [];

    const groups: MessageGroup[] = [];
    let lastDate = '';

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const msgDate = formatDate(msg.created_at);
      const isMine = msg.sender_id === user?.id;

      if (msgDate !== lastDate) {
        groups.push({ type: 'date', key: `date-${msgDate}-${i}`, date: msgDate });
        lastDate = msgDate;
      }

      const prev = i > 0 ? messages[i - 1] : null;
      const next = i < messages.length - 1 ? messages[i + 1] : null;
      const sameSenderPrev = prev && prev.sender_id === msg.sender_id && formatDate(prev.created_at) === msgDate;
      const sameSenderNext = next && next.sender_id === msg.sender_id && formatDate(next.created_at) === msgDate;

      groups.push({
        type: 'message',
        key: msg.id,
        message: msg,
        isFirst: !sameSenderPrev,
        isLast: !sameSenderNext,
        isMine,
      });
    }
    return groups;
  }, [messages, user?.id]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diff = today.getTime() - msgDay.getTime();
      const days = Math.floor(diff / 86400000);

      if (days === 0) return 'Hoje';
      if (days === 1) return 'Ontem';
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return ''; }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return ''; }
  };

  const renderItem = ({ item }: { item: MessageGroup }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={[styles.datePill, darkMode && styles.datePillDark]}>
            <Text style={[styles.dateText, darkMode && { color: '#CCC' }]}>{item.date}</Text>
          </View>
        </View>
      );
    }

    const msg = item.message!;
    const isMine = item.isMine!;
    const isTemp = msg.id.startsWith('temp-');

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => msg.content && copyMessage(msg.content)}
        delayLongPress={400}
      >
        <View style={[
          styles.msgRow,
          isMine ? styles.msgRowMine : styles.msgRowOther,
          !item.isLast && { marginBottom: 2 },
          item.isLast && { marginBottom: 10 },
        ]}>
          {/* Avatar for other user - only on last message in group */}
          {!isMine && item.isLast && (
            <View style={styles.msgAvatarWrap}>
              {otherUser?.photo_url ? (
                <Image source={{ uri: otherUser.photo_url }} style={styles.msgAvatar} />
              ) : (
                <View style={[styles.msgAvatarPH, darkMode && { backgroundColor: COLORS.accent + '25' }]}>
                  <Text style={styles.msgAvatarLetter}>
                    {(otherUser?.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
          {!isMine && !item.isLast && <View style={{ width: 36 }} />}

          <View style={[
            styles.bubble,
            isMine ? styles.bubbleMine : [styles.bubbleOther, darkMode && styles.bubbleOtherDark],
            item.isFirst && !isMine && styles.bubbleFirstOther,
            item.isFirst && isMine && styles.bubbleFirstMine,
            item.isLast && !isMine && styles.bubbleLastOther,
            item.isLast && isMine && styles.bubbleLastMine,
            isTemp && { opacity: 0.6 },
          ]}>
            {/* Image message */}
            {msg.message_type === 'image' && msg.file_url ? (
              <Image source={{ uri: msg.file_url }} style={styles.msgImage} resizeMode="cover" />
            ) : null}

            {/* Text content */}
            {msg.content ? (
              <Text style={[styles.msgText, isMine ? styles.msgTextMine : (darkMode ? styles.textDark : {})]}>
                {msg.content}
              </Text>
            ) : null}

            {/* Time + read status */}
            <View style={styles.msgMeta}>
              <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
                {formatTime(msg.created_at)}
              </Text>
              {isMine && !isTemp && (
                <Ionicons
                  name={msg.read ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={msg.read ? '#4FC3F7' : 'rgba(255,255,255,0.5)'}
                  style={{ marginLeft: 4 }}
                />
              )}
              {isTemp && (
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" style={{ marginLeft: 4 }} />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const grouped = groupMessages();
  const displayName = otherUser?.name || 'Carregando...';
  const displayPhoto = otherUser?.photo_url;

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={darkMode ? COLORS.white : COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerUserInfo}
          onPress={() => router.push(`/user/${id}`)}
          activeOpacity={0.7}
        >
          {displayPhoto ? (
            <Image source={{ uri: displayPhoto }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatarPH, darkMode && { backgroundColor: COLORS.accent + '25' }]}>
              <Text style={styles.headerAvatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerName, darkMode && styles.textDark]} numberOfLines={1}>
              {displayName}
            </Text>
            {otherUser?.curso_name ? (
              <Text style={styles.headerSub} numberOfLines={1}>{otherUser.curso_name}</Text>
            ) : otherUser?.username ? (
              <Text style={styles.headerSub}>@{otherUser.username}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push(`/user/${id}`)}
        >
          <Ionicons name="person-circle-outline" size={26} color={darkMode ? COLORS.white : COLORS.darkGray} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={grouped}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={[
              styles.msgList,
              grouped.length === 0 && { flex: 1 },
            ]}
            onContentSizeChange={() => {
              if (!showScrollBtn) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <View style={[styles.emptyChatIcon, darkMode && { backgroundColor: COLORS.accent + '15' }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color={COLORS.accent} />
                </View>
                <Text style={[styles.emptyChatTitle, darkMode && styles.textDark]}>
                  Inicie a conversa
                </Text>
                <Text style={[styles.emptyChatSub, darkMode && { color: '#888' }]}>
                  Envie a primeira mensagem para {otherUser?.name || 'este usuario'}
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Scroll to bottom button */}
        <Animated.View
          style={[styles.scrollBtnWrap, { opacity: scrollBtnOpacity }]}
          pointerEvents={showScrollBtn ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.scrollBtn, darkMode && styles.scrollBtnDark]}
            onPress={scrollToBottom}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-down" size={22} color={darkMode ? COLORS.white : COLORS.primary} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.inputBar, darkMode && styles.inputBarDark]}>
          <View style={[styles.inputWrap, darkMode && styles.inputWrapDark]}>
            <TextInput
              style={[styles.input, darkMode && { color: COLORS.white }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Mensagem..."
              placeholderTextColor="#999"
              multiline
              maxLength={2000}
              onFocus={() => {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
              }}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim()) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={18} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EDE8' },
  containerDark: { backgroundColor: '#0B141A' },
  textDark: { color: COLORS.white },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingVertical: 8,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  headerDark: { backgroundColor: COLORS.cardDark, borderBottomColor: '#2A2A2A' },
  headerBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerUserInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarPH: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarLetter: { fontSize: 17, fontWeight: '700', color: COLORS.accent },
  headerName: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  headerSub: { fontSize: 12, color: COLORS.darkGray, marginTop: 1 },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Messages
  msgList: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },

  // Date separator
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  datePill: {
    backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8,
  },
  datePillDark: { backgroundColor: 'rgba(30,30,30,0.85)' },
  dateText: { fontSize: 12, fontWeight: '600', color: COLORS.darkGray },

  // Message rows
  msgRow: { flexDirection: 'row', marginBottom: 2 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },

  // Avatar in messages
  msgAvatarWrap: { marginRight: 6, alignSelf: 'flex-end' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15 },
  msgAvatarPH: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accent + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  msgAvatarLetter: { fontSize: 12, fontWeight: '700', color: COLORS.accent },

  // Bubbles
  bubble: {
    maxWidth: '76%', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMine: { backgroundColor: COLORS.accent },
  bubbleOther: { backgroundColor: COLORS.white },
  bubbleOtherDark: { backgroundColor: '#1E2C34' },

  // Rounded corners for grouped messages
  bubbleFirstOther: { borderTopLeftRadius: 18 },
  bubbleFirstMine: { borderTopRightRadius: 18 },
  bubbleLastOther: { borderBottomLeftRadius: 4 },
  bubbleLastMine: { borderBottomRightRadius: 4 },

  // Image in message
  msgImage: { width: 220, height: 180, borderRadius: 12, marginBottom: 4 },

  // Text
  msgText: { fontSize: 15, color: COLORS.primary, lineHeight: 21 },
  msgTextMine: { color: COLORS.white },

  // Meta (time + read)
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3 },
  msgTime: { fontSize: 11, color: 'rgba(0,0,0,0.4)' },
  msgTimeMine: { color: 'rgba(255,255,255,0.65)' },

  // Empty
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyChatIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accent + '10',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyChatTitle: { fontSize: 18, fontWeight: '600', color: COLORS.primary, marginBottom: 6 },
  emptyChatSub: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },

  // Scroll to bottom
  scrollBtnWrap: {
    position: 'absolute', bottom: 12, right: 16,
  },
  scrollBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  scrollBtnDark: { backgroundColor: COLORS.cardDark },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 8, gap: 8,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#EBEBEB',
  },
  inputBarDark: { backgroundColor: COLORS.cardDark, borderTopColor: '#2A2A2A' },
  inputWrap: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 4,
    minHeight: 44, maxHeight: 120,
    justifyContent: 'center',
  },
  inputWrapDark: { backgroundColor: '#1E2C34' },
  input: {
    fontSize: 15, color: COLORS.primary, paddingVertical: 8,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
});
