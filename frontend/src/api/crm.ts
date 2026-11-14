import apiClient from './client';
import type {
  Client,
  Deal,
  DealStats,
  DealFilters,
  ClientFilters,
  CreateClientPayload,
  UpdateClientPayload,
  CreateDealPayload,
  UpdateDealPayload,
} from '../types';

// ==================== КЛІЄНТИ ====================

export const getClients = async (filters?: ClientFilters): Promise<Client[]> => {
  const params: Record<string, string> = {};

  if (filters?.search?.trim()) {
    params.search = filters.search.trim();
  }
  if (filters?.status) {
    params.status = filters.status;
  }
  if (filters?.ordering) {
    params.ordering = filters.ordering;
  }

  const response = await apiClient.get<Client[]>('/clients/', { params });
  return response.data;
};

export const createClient = async (clientData: CreateClientPayload): Promise<Client> => {
  const response = await apiClient.post<Client>('/clients/', clientData);
  return response.data;
};

export const updateClient = async(
  clientId: number,
  clientData: UpdateClientPayload
): Promise<Client> => {
  const response = await apiClient.patch<Client>(`/clients/${clientId}/`, clientData);
  return response.data;
};

export const deleteClient = async (clientId: number): Promise<void> => {
  await apiClient.delete(`/clients/${clientId}/`);
}

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

// Отримання списку угод з урахуванням пошуку, фільтра за етапом та сортування
export const getDeals = async (filters?: DealFilters): Promise<Deal[]> => {
  const params: Record<string, string> = {};

  if (filters?.search?.trim()) {
    params.search = filters.search.trim();
  }
  if (filters?.stage) {
    params.stage = filters.stage;
  }
  if (filters?.ordering) {
    params.ordering = filters.ordering;
  }

  const response = await apiClient.get<Deal[]>('/deals/', { params });
  return response.data;
};

// Отримання загальних KPI-показників компанії/менеджера з бекенду
export const getDealStats = async (): Promise<DealStats> => {
  const response = await apiClient.get<DealStats>('/deals/stats/');
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

export const updateDeal = async (dealId: number, dealData: UpdateDealPayload): Promise<Deal> => {
  const response = await apiClient.patch<Deal>(`/deals/${dealId}/`, dealData);
  return response.data;
};

export const deleteDeal = async (dealId: number): Promise<void> => {
  await apiClient.delete(`/deals/${dealId}/`);
};