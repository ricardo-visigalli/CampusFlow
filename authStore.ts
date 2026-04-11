import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  darkMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  toggleDarkMode: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  darkMode: false,

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user } = response.data;
    await AsyncStorage.setItem('token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, token: access_token, isAuthenticated: true });
  },

  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    const { access_token, user } = response.data;
    await AsyncStorage.setItem('token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, token: access_token, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      const darkModeStr = await AsyncStorage.getItem('darkMode');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ 
          user, 
          token, 
          isAuthenticated: true, 
          isLoading: false,
          darkMode: darkModeStr === 'true'
        });
      } else {
        set({ isLoading: false, darkMode: darkModeStr === 'true' });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  updateUser: async (data: Partial<User>) => {
    const response = await api.put('/auth/me', data);
    const updatedUser = response.data;
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  toggleDarkMode: async () => {
    const newValue = !get().darkMode;
    await AsyncStorage.setItem('darkMode', newValue.toString());
    set({ darkMode: newValue });
  },
}));
