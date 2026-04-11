import { create } from 'zustand';
import api from '../services/api';
import { Post, Comment, Notification, ProvaAnalysis, Simulado, UserStats } from '../types';

interface PostState {
  posts: Post[];
  currentPost: Post | null;
  comments: Comment[];
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  provaAnalysis: ProvaAnalysis | null;
  simulados: Simulado[];
  userStats: UserStats | null;
  userPosts: Post[];
  selectedCategory: string | null;
  
  fetchPosts: (category?: string, refresh?: boolean) => Promise<void>;
  fetchPost: (id: string) => Promise<void>;
  createPost: (post: any) => Promise<void>;
  votePost: (postId: string, voteType: string) => Promise<void>;
  fetchComments: (postId: string) => Promise<void>;
  createComment: (postId: string, content: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  analyzeProva: (content: string) => Promise<void>;
  saveSimulado: (data: any) => Promise<void>;
  fetchSimulados: () => Promise<void>;
  fetchUserStats: () => Promise<void>;
  fetchUserPosts: () => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  clearProvaAnalysis: () => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  currentPost: null,
  comments: [],
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  provaAnalysis: null,
  simulados: [],
  userStats: null,
  userPosts: [],
  selectedCategory: null,

  fetchPosts: async (category?: string, refresh = false) => {
    set({ isLoading: true });
    try {
      const params: any = {};
      if (category) params.category = category;
      const response = await api.get('/posts', { params });
      set({ posts: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchPost: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/posts/${id}`);
      set({ currentPost: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createPost: async (post: any) => {
    const response = await api.post('/posts', post);
    const newPost = response.data;
    set((state) => ({ posts: [newPost, ...state.posts] }));
  },

  votePost: async (postId: string, voteType: string) => {
    const response = await api.post(`/posts/${postId}/vote`, { vote_type: voteType });
    const action = response.data.action;
    
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          let upvotes = p.upvotes;
          let downvotes = p.downvotes;
          let user_vote = p.user_vote;
          
          if (action === 'added') {
            if (voteType === 'up') upvotes++;
            else downvotes++;
            user_vote = voteType;
          } else if (action === 'removed') {
            if (voteType === 'up') upvotes--;
            else downvotes--;
            user_vote = undefined;
          } else if (action === 'changed') {
            if (voteType === 'up') {
              upvotes++;
              downvotes--;
            } else {
              upvotes--;
              downvotes++;
            }
            user_vote = voteType;
          }
          
          return { ...p, upvotes, downvotes, user_vote };
        }
        return p;
      }),
      currentPost: state.currentPost?.id === postId ? {
        ...state.currentPost,
        upvotes: action === 'added' && voteType === 'up' ? state.currentPost.upvotes + 1 : 
                 action === 'removed' && voteType === 'up' ? state.currentPost.upvotes - 1 : state.currentPost.upvotes,
        downvotes: action === 'added' && voteType === 'down' ? state.currentPost.downvotes + 1 :
                   action === 'removed' && voteType === 'down' ? state.currentPost.downvotes - 1 : state.currentPost.downvotes,
        user_vote: action === 'removed' ? undefined : voteType
      } : state.currentPost
    }));
  },

  fetchComments: async (postId: string) => {
    const response = await api.get(`/posts/${postId}/comments`);
    set({ comments: response.data });
  },

  createComment: async (postId: string, content: string) => {
    const response = await api.post(`/posts/${postId}/comments`, { content });
    set((state) => ({ comments: [...state.comments, response.data] }));
  },

  fetchNotifications: async () => {
    const response = await api.get('/notifications');
    set({ notifications: response.data });
  },

  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      set({ unreadCount: response.data.count });
    } catch {
      set({ unreadCount: 0 });
    }
  },

  markNotificationRead: async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));
  },

  markAllRead: async () => {
    await api.put('/notifications/read-all');
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0
    }));
  },

  analyzeProva: async (content: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/prova/analyze', { content, content_type: 'text' });
      set({ provaAnalysis: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  saveSimulado: async (data: any) => {
    const response = await api.post('/simulados', data);
    set((state) => ({ simulados: [response.data, ...state.simulados] }));
  },

  fetchSimulados: async () => {
    const response = await api.get('/simulados');
    set({ simulados: response.data });
  },

  fetchUserStats: async () => {
    const response = await api.get('/users/me/stats');
    set({ userStats: response.data });
  },

  fetchUserPosts: async () => {
    const response = await api.get('/users/me/posts');
    set({ userPosts: response.data });
  },

  setSelectedCategory: (category: string | null) => {
    set({ selectedCategory: category });
  },

  clearProvaAnalysis: () => {
    set({ provaAnalysis: null });
  },
}));
