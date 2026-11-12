import apiClient from './client';
import type { Client, Deal } from '../types';

// ==================== КЛІЄНТИ ====================

// Отримання списку клієнтів (з можливістю фільтрації через пошуковий рядок)
export const getClients = async (searchTerm?: string): Promise<Client[]> => {
  const params = searchTerm ? { search: searchTerm } : {};
  const response = await apiClient.get<Client[]>('/clients/', { params });
  return response.data;
};

// Створення нового клієнта в базі через модальне вікно
export const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> => {
  const response = await apiClient.post<Client>('/clients/', clientData);
  return response.data;
};

// ==================== УГОДИ ====================

// Отримання списку всіх комерційних угод
export const getDeals = async (): Promise<Deal[]> => {
  const response = await apiClient.get<Deal[]>('/deals/');
  return response.data;
};

// Оновлення етапу угоди (коли менеджер перетягує картку по воронці)
export const updateDealStage = async (dealId: number, stage: Deal['stage']): Promise<Deal> => {
  const response = await apiClient.patch<Deal>(`/deals/${dealId}/`, { stage });
  return response.data;
};