import { useState, useEffect, type SyntheticEvent } from 'react';
import axios from 'axios';
import { getClients, createClient, createDeal } from '../api/crm';
import { getUsers } from '../api/auth';
import type { Client, Deal, DealStage, User } from '../types';

interface CreateDealModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onDealCreated: (newDeal: Deal) => void;
}

const STAGE_OPTIONS: { value: DealStage; label: string }[] = [
  { value: 'new', label: 'Нова' },
  { value: 'proposal', label: 'Пропозиція' },
  { value: 'negotiation', label: 'Переговори' },
  { value: 'won', label: 'Виграно' },
  { value: 'lost', label: 'Втрачено' },
];

export const CreateDealModal = ({
  isOpen,
  currentUser,
  onClose,
  onDealCreated,
}: CreateDealModalProps) => {
  const isAdmin = currentUser.is_staff || currentUser.is_superuser;

  // Режим вибору клієнта: новий контрагент або існуючий із бази
  const [clientMode, setClientMode] = useState<'new' | 'existing'>('new');

  // Списки даних із сервера
  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState<boolean>(false);

  // Поля нового клієнта (відповідають моделі Client)
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');

  // Поле існуючого клієнта
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Поля комерційної угоди (відповідають моделі Deal)
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [stage, setStage] = useState<DealStage>('new');

  // Стан відправки форми та помилок
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Завантаження клієнтів (і менеджерів для адміна) при відкритті вікна
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadFormData = async () => {
      setIsLoadingLists(true);
      try {
        const clientsData = await getClients();
        if (isMounted) {
          setClients(clientsData);
          if (clientsData.length > 0) {
            setSelectedClientId(String(clientsData[0].id));
          }
        }

        if (isAdmin) {
          const usersData = await getUsers();
          if (isMounted) {
            setManagers(usersData);
            setSelectedManagerId(String(currentUser.id));
          }
        }
      } catch {
        if (isMounted) {
          setError('Не вдалося завантажити довідники клієнтів.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingLists(false);
        }
      }
    };

    loadFormData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isAdmin, currentUser.id]);

  // Закриття модального вікна клавішею Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setTitle('');
    setAmount('');
    setStage('new');
    setError(null);
  };

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
      let targetClientId: number;

      if (clientMode === 'new') {
        // 1. Створюємо нового клієнта в базі
        const createdClient = await createClient({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          status: 'lead',
          ...(isAdmin && {
            responsible_manager: selectedManagerId ? Number(selectedManagerId) : null,
          }),
        });
        targetClientId = createdClient.id;
      } else {
        if (!selectedClientId) {
          setError('Оберіть клієнта зі списку або створіть нового.');
          setIsSubmitting(false);
          return;
        }
        targetClientId = Number(selectedClientId);
      }

      // 2. Створюємо угоду, прив'язану до отриманого ID клієнта
      const createdDeal = await createDeal({
        title: title.trim(),
        amount: parsedAmount.toFixed(2),
        stage,
        client: targetClientId,
      });

      resetForm();
      onDealCreated(createdDeal);
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as Record<string, string[] | string>;
        if (Array.isArray(data.email)) {
          setError('Клієнт із таким email уже зареєстрований. Оберіть його у вкладці «Існуючий клієнт».');
        } else if (typeof data.detail === 'string') {
          setError(data.detail);
        } else {
          setError('Перевірте правильність заповнення всіх полів.');
        }
      } else {
        setError('Помилка з\'єднання із сервером.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedExistingClient = clients.find((c) => String(c.id) === selectedClientId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      onClick={() => !isSubmitting && onClose()}
    >
      {/* Зупиняємо спливання кліку (stopPropagation), щоб клік усередині форми не закривав вікно */}
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального вікна */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Нова комерційна угода
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
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
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Блок 1: Вибір або створення клієнта */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                1. Контрагент
              </span>
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setClientMode('new');
                    setError(null);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    clientMode === 'new'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Новий клієнт
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClientMode('existing');
                    setError(null);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    clientMode === 'existing'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Існуючий ({clients.length})
                </button>
              </div>
            </div>

            {clientMode === 'new' ? (
              <div className="p-3.5 bg-slate-50/75 border border-slate-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ім'я *
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Іван"
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
                      placeholder="Петренко"
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

                {/* Вибір відповідального менеджера (відображається виключно адміністратору) */}
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Відповідальний менеджер
                    </label>
                    <div className="relative">
                      <select
                        value={selectedManagerId}
                        onChange={(e) => setSelectedManagerId(e.target.value)}
                        className="w-full px-3 py-1.5 pr-8 text-sm bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:border-slate-400"
                      >
                        <option value="">Не призначено</option>
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
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50/75 border border-slate-200 rounded-lg space-y-2">
                {isLoadingLists ? (
                  <p className="text-xs text-slate-500">Завантаження списку клієнтів...</p>
                ) : clients.length === 0 ? (
                  <p className="text-xs text-slate-600">
                    У базі ще немає доступних клієнтів. Перемкніться на вкладку «Новий клієнт».
                  </p>
                ) : (
                  <>
                    <label className="block text-xs font-medium text-slate-700">
                      Оберіть клієнта з бази *
                    </label>
                    <div className="relative">
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full px-3 py-1.5 pr-8 text-sm bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:border-slate-400"
                      >
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.first_name} {client.last_name} ({client.email})
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {selectedExistingClient && (
                      <p className="text-[11px] text-slate-500">
                        Відповідальний: {selectedExistingClient.manager_name || 'Не призначено'}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Блок 2: Параметри угоди */}
          <div className="space-y-3">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              2. Деталі угоди
            </span>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Назва угоди *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Розробка корпоративного порталу"
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
                    placeholder="2500.00"
                    className="w-full pl-7 pr-3 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Початковий статус
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

          {/* Кнопки дій */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Збереження...' : 'Створити угоду'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};