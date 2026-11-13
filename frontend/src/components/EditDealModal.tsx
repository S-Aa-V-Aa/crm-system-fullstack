import { useState, useEffect, type SyntheticEvent } from 'react';
import axios from 'axios';
import { updateDeal, deleteDeal, reassignClientManager } from '../api/crm';
import { getUsers } from '../api/auth';
import type { Deal, DealStage, User } from '../types';

interface EditDealModalProps {
  deal: Deal;
  currentUser: User;
  onClose: () => void;
  onDealUpdated: (updatedDeal: Deal) => void;
  onDealDeleted: (deletedDealId: number) => void;
}

const STAGE_OPTIONS: { value: DealStage; label: string }[] = [
  { value: 'new', label: 'Нова' },
  { value: 'proposal', label: 'Пропозиція' },
  { value: 'negotiation', label: 'Переговори' },
  { value: 'won', label: 'Виграно' },
  { value: 'lost', label: 'Втрачено' },
];

export const EditDealModal = ({
  deal,
  currentUser,
  onClose,
  onDealUpdated,
  onDealDeleted,
}: EditDealModalProps) => {
  const isAdmin = currentUser.is_staff || currentUser.is_superuser;

  // Ініціалізуємо поля форми напряму з переданого об'єкта deal
  const [title, setTitle] = useState<string>(deal.title);
  const [amount, setAmount] = useState<string>(deal.amount);
  const [stage, setStage] = useState<DealStage>(deal.stage);
  const [selectedManagerId, setSelectedManagerId] = useState<string>(
    deal.responsible_manager ? String(deal.responsible_manager) : ''
  );

  // Список активних працівників для випадаючого списку адміністратора
  const [managers, setManagers] = useState<User[]>([]);

  // Стани відправки, видалення та помилок
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // У useEffect залишаємо виключно асинхронний запит до API за списком менеджерів
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
    Boolean(deal.responsible_manager) && deal.manager_is_active === false;

  // Збереження змін угоди та перепризначення менеджера
  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Вкажіть коректну суму угоди більшу за нуль.');
      return;
    }

    setIsSubmitting(true);

    try {
      const initialManagerId = deal.responsible_manager ? String(deal.responsible_manager) : '';
      if (isAdmin && selectedManagerId !== initialManagerId) {
        const nextManagerId = selectedManagerId ? Number(selectedManagerId) : null;
        await reassignClientManager(deal.client, nextManagerId);
      }

      const updatedDeal = await updateDeal(deal.id, {
        title: title.trim(),
        amount: parsedAmount.toFixed(2),
        stage,
      });

      onDealUpdated(updatedDeal);
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && typeof err.response?.data?.detail === 'string') {
        setError(err.response.data.detail);
      } else {
        setError('Не вдалося зберегти зміни. Перевірте введені дані.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Видалення угоди
  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);

    try {
      await deleteDeal(deal.id);
      onDealDeleted(deal.id);
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && typeof err.response?.data?.detail === 'string') {
        setError(err.response.data.detail);
      } else {
        setError('Не вдалося видалити угоду.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

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
              Редагування угоди #{deal.id}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Клієнт: {deal.client_name}
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

          {/* Блок перепризначення відповідального (тільки для адміністратора) */}
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
                  {currentManagerDeactivated && deal.responsible_manager && (
                    <option value={deal.responsible_manager} disabled>
                      {deal.manager_name} (звільнений — оберіть іншого)
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
              <p className="text-[11px] text-slate-500">
                Зміна менеджера передасть йому цього клієнта та всі пов'язані з ним угоди.
              </p>
            </div>
          )}

          {/* Основні параметри угоди */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Назва угоди *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Сума (USD) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-400 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Статус
                </label>
                <div className="relative">
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as DealStage)}
                    className="w-full px-3 py-1.5 pr-8 text-sm bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:border-slate-400"
                  >
                    {STAGE_OPTIONS.map((opt) => (
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
          </div>

          {/* Нижня панель: зліва видалення, справа скасування та збереження */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div>
              {confirmDelete ? (
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-xs text-slate-600">Видалити?</span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleDelete}
                    className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {isDeleting ? '...' : 'Так'}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    Ні
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  Видалити угоду
                </button>
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
                {isSubmitting ? 'Збереження...' : 'Зберегти зміни'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};