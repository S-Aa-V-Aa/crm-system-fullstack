// 1. Модель користувача/менеджера (відповідає User у Django)
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
}

// Дані для реєстрації нового працівника адміністратором (CreateUserSerializer)
export interface CreateUserPayload {
  username: string;
  first_name: string;
  last_name: string;
  password: string;
  is_staff: boolean;
}

// 2. Можливі статуси клієнта (фіксований список значень)
export type ClientStatus = 'lead' | 'active' | 'inactive';

// 3. Інтерфейс клієнта (відповідає ClientSerializer)
export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  responsible_manager: number | null;
  manager_name?: string | null;
  manager_is_active?: boolean | null;
  created_at: string;
  updated_at: string;
}

// Дані для створення нового клієнта
export interface CreateClientPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status?: ClientStatus;
  responsible_manager?: number | null;
}

// 4. Етапи воронки угод (відповідає STAGE_CHOICES у Django)
export type DealStage = 'new' | 'proposal' | 'negotiation' | 'won' | 'lost';

// 5. Інтерфейс комерційної угоди (відповідає DealSerializer)
export interface Deal {
  id: number;
  title: string;
  amount: string; // DecimalField з Django серіалізується як точний рядок "25000.00"
  stage: DealStage;
  stage_display: string;
  client: number; // ID пов'язаного клієнта
  client_name: string; // Текстове ім'я, згенероване через select_related
  responsible_manager: number | null;
  manager_name: string | null;
  manager_is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

// Дані для створення нової угоди
export interface CreateDealPayload {
  title: string;
  amount: string;
  stage: DealStage;
  client: number;
}

// Дані для часткового оновлення угоди (PATCH)
export interface UpdateDealPayload {
  title?: string;
  amount?: string;
  stage?: DealStage;
  client?: number;
}

// 6. Формат відповіді SimpleJWT при авторизації
export interface AuthResponse {
  access: string;
  refresh: string;
}