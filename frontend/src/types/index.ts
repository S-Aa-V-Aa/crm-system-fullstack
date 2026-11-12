// 1. Модель користувача/менеджера (відповідає User у Django)
export interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
}

// 2. Можливі статуси клієнта (фіксований список значень)
export type ClientStatus = 'lead' | 'in_progress' | 'active' | 'closed';

// 3. Інтерфейс клієнта (відповідає ClientSerializer)
export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  status_display?: string;
  responsible_manager: number | null;
  manager_name?: string;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

// 6. Формат відповіді SimpleJWT при авторизації
export interface AuthResponse {
  access: string;
  refresh: string;
}