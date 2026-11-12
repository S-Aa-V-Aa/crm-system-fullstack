import apiClient from './client';
import type { AuthResponse } from '../types';

// Облікові дані, які передаються з форми входу
export interface LoginCredentials {
  username: string;
  password: string;
}

// Функція авторизації користувача
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/token/', credentials);
  
  localStorage.setItem('access_token', response.data.access);
  localStorage.setItem('refresh_token', response.data.refresh);
  // Зберігаємо логін користувача, який успішно пройшов валідацію
  localStorage.setItem('username', credentials.username);
  
  return response.data;
};

export const logout = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('username');
  window.location.href = '/';
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

// Функція отримання імені поточного користувача
export const getCurrentUsername = (): string => {
  return localStorage.getItem('username') || 'Користувач';
};