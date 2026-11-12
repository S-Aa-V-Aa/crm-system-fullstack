import apiClient from './client';
import type { AuthResponse, User, CreateUserPayload } from '../types';

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

// Отримання реального профілю поточного користувача (id, username, is_staff)
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/me/');
  return response.data;
};

// Отримання списку всіх активних працівників (доступно лише адміністратору)
export const getUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<User[]>('/users/');
  return response.data;
};

// Реєстрація нового працівника адміністратором
export const createUser = async (userData: CreateUserPayload): Promise<User> => {
  const response = await apiClient.post<User>('/users/', userData);
  return response.data;
};

// Зміна ролі працівника (менеджер <-> адміністратор)
export const updateUserRole = async (userId: number, isStaff: boolean): Promise<User> => {
  const response = await apiClient.patch<User>(`/users/${userId}/`, {
    is_staff: isStaff,
  });
  return response.data;
};

// Деактивація (звільнення) працівника
export const deactivateUser = async (userId: number): Promise<void> => {
  await apiClient.delete(`/users/${userId}/`);
};