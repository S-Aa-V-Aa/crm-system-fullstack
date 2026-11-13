import apiClient from './client';
import type {
  Client,
  Deal,
  CreateClientPayload,
  CreateDealPayload,
  UpdateDealPayload,
} from '../types';

// ==================== КЛІЄНТИ ====================

export const getClients = async (searchTerm?: string): Promise<Client[]> => {
  const params = searchTerm ? { search: searchTerm } : {};
  const response = await apiClient.get<Client[]>('/clients/', { params });
  return response.data;
};

export const createClient = async (clientData: CreateClientPayload): Promise<Client> => {
  const response = await apiClient.post<Client>('/clients/', clientData);
  return response.data;
};

// Перепризначення відповідального менеджера для клієнта (доступно адміністратору)
export const reassignClientManager = async (
  clientId: number,
  managerId: number | null
): Promise<Client> => {
  const response = await apiClient.patch<Client>(`/clients/${clientId}/`, {
    responsible_manager: managerId,
  });
  return response.data;
};

// ==================== УГОДИ ====================

export const getDeals = async (): Promise<Deal[]> => {
  const response = await apiClient.get<Deal[]>('/deals/');
  return response.data;
};

export const createDeal = async (dealData: CreateDealPayload): Promise<Deal> => {
  const response = await apiClient.post<Deal>('/deals/', dealData);
  return response.data;
};

export const updateDealStage = async (dealId: number, stage: Deal['stage']): Promise<Deal> => {
  const response = await apiClient.patch<Deal>(`/deals/${dealId}/`, { stage });
  return response.data;
};

// Повне або часткове редагування параметрів угоди
export const updateDeal = async (dealId: number, dealData: UpdateDealPayload): Promise<Deal> => {
  const response = await apiClient.patch<Deal>(`/deals/${dealId}/`, dealData);
  return response.data;
};

// Видалення угоди з бази даних
export const deleteDeal = async (dealId: number): Promise<void> => {
  await apiClient.delete(`/deals/${dealId}/`);
};