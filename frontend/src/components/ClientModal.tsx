import { useState, useEffect, type SyntheticEvent } from 'react';
import axios from 'axios';
import { createClient, updateClient, deleteClient } from '../api/crm';
import { getUsers } from '../api/auth';
import type { Client, ClientStatus, User } from '../types';

interface ClientModalProps {
  client: Client | null;
  currentUser: User;
  onClose: () => void;
  onClientSaved: (savedClient: Client, isNew: boolean) => void;
  onClientDeleted: (deletedClientId: number) => void;
}

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'lead', label: 'Потенційний (Лід)' },
  { value: 'active', label: 'Активний клієнт' },
  { value: 'inactive', label: 'Неактивний' },
];

export const ClientModal = ({
  client,
  currentUser,
  onClose,
  onClientSaved,
  onClientDeleted,
}: ClientModalProps) => {
  const isEditMode = Boolean(client);
  const isAdmin = currentUser.is_staff || currentUser.is_superuser;

  // Ініціалізуємо поля напряму з пропса client (без каскадних рендерів у useEffect)
  const [firstName, setFirstName] = useState<string>(client?.first_name ?? '');
  const [lastName, setLastName] = useState<string>(client?.last_name ?? '');
  const [email, setEmail] = useState<string>(client?.email ?? '');
  const [phone, setPhone] = useState<string>(client?.phone ?? '');
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? 'lead');
  const [selectedManagerId, setSelectedManagerId] = useState<string>(() => {
    if (client) {
      return client.responsible_manager ? String(client.responsible_manager) : '';
    }
    return String(currentUser.id);
  });

  // Список активних працівників (завантажується лише для адміністратора)
  const [managers, setManagers] = useState<User[]>([]);

  // Стани відправки, видалення та помилок
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Асинхронне завантаження списку активних менеджерів для адміністратора
  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;
    const loadManagers = async () => {
      try {
        const usersData = await getUsers();
        if (isMounted) {
          setManagers(usersData);
        }
      } catch {
        if (isMounted) {
          setError('Не вдалося завантажити список працівників.');
        }
      }
    };

    loadManagers();
    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  // Закриття модального вікна клавішею Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, isDeleting, onClose]);

  const isBusy = isSubmitting || isDeleting;
  const currentManagerDeactivated =
    Boolean(client?.responsible_manager) && client?.manager_is_active === false;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status,
      ...(isAdmin && {
        responsible_manager: selectedManagerId ? Number(selectedManagerId) : null,
      }),
    };

    try {
      if (client) {
        const updated = await updateClient(client.id, payload);
        onClientSaved(updated, false);
      } else {
        const created = await createClient(payload);
        onClientSaved(created, true);
      }
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as Record<string, string[] | string>;
        if (Array.isArray(data.email)) {
          setError('Клієнт із таким email уже зареєстрований у системі.');
        } else if (typeof data.detail === 'string') {
          setError(data.detail);
        } else {
          setError('Перевірте правильність заповнення обов’язкових полів.');
        }
      } else {
        setError('Помилка з’єднання із сервером.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    setError(null);
    setIsDeleting(true);

    try {
      await deleteClient(client.id);
      onClientDeleted(client.id);
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && typeof err.response?.data?.detail === 'string') {
        setError(err.response.data.detail);
      } else {
        setError('Не вдалося видалити картку клієнта.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const linkedDealsCount = client?.deals_count ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      onClick={() => !isBusy && onClose()}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка вікна */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEditMode ? `Редагування клієнта #${client?.id}` : 'Новий клієнт'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditMode
                ? 'Оновлення контактних даних, статусу та відповідального менеджера'
                : 'Додавання нового контрагента до бази CRM'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Закрити вікно"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Блок відповідального менеджера (тільки для адміністратора) */}
          {isAdmin && (
            <div className="p-3.5 bg-slate-50/75 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Відповідальний менеджер
                </label>
                {currentManagerDeactivated && (
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    Поточний менеджер звільнений
                  </span>
                )}
              </div>

              <div className="relative">
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full px-3 py-1.5 pr-8 text-sm bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:border-slate-400"
                >
                  <option value="">Не призначено</option>
                  {currentManagerDeactivated && client?.responsible_manager && (
                    <option value={client.responsible_manager} disabled>
                      {client.manager_name} (звільнений — оберіть іншого)
                    </option>
                  )}
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.username} {m.is_staff ? '(Адміністратор)' : '(Менеджер)'}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Контактні поля клієнта */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ім’я *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Тарас"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Прізвище *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Шевченко"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@company.ua"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380671234567"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Статус співпраці
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClientStatus)}
                  className="w-full px-3 py-1.5 pr-8 text-sm bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:border-slate-400"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Нижня панель дій */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div>
              {isEditMode && (
                confirmDelete ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="text-xs text-slate-700 font-medium">Видалити клієнта?</span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={handleDelete}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {isDeleting ? '...' : 'Так'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDelete(false)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                      >
                        Ні
                      </button>
                    </div>
                    {linkedDealsCount > 0 && (
                      <span className="text-[11px] text-amber-700">
                        Увага: також видаляться пов’язані угоди ({linkedDealsCount}).
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Видалити клієнта
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isSubmitting
                  ? 'Збереження...'
                  : isEditMode
                    ? 'Зберегти зміни'
                    : 'Створити клієнта'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};