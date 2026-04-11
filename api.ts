import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  'https://study-hub-ai-16.preview.emergentagent.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to safely get token
const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (error) {
    console.log('AsyncStorage not available yet');
    return null;
  }
};

// Helper function to safely remove items
const clearAuth = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  } catch (error) {
    console.log('AsyncStorage not available for clearing');
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Silently fail for public endpoints
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAuth();
    }
    return Promise.reject(error);
  }
);

export default api;
