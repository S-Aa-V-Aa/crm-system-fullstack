import { useState, useEffect } from 'react';
import { getClients, updateClient } from '../api/crm';
import { useDebounce } from '../hooks/useDebounce';
import { useLayoutContext } from '../hooks/useLayoutContext';
import type { Client, ClientStatus } from '../types';
import { ClientModal } from '../components/ClientModal';

const CLIENT_STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  lead: {
    label: 'Лід',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  active: {
    label: 'Активний',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  inactive: {
    label: 'Неактивний',
    bg: 'bg-zinc-100',
    text: 'text-zinc-600',
    border: 'border-zinc-200',
  },
};

const CLIENT_ORDERING_OPTIONS = [
  { value: '-created_at', label: 'Спочатку нові' },
  { value: 'last_name', label: 'За прізвищем (А–Я)' },
  { value: '-won_amount', label: 'Виручка: за спаданням' },
  { value: '-deals_count', label: 'Кількість угод: за спаданням' },
];

// Допоміжна функція для правильного відмінювання слова «угода»
const formatDealsCount = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} угода`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} угоди`;
  return `${count} угод`;
};

export const ClientsPage = () => {
  const { currentUser } = useLayoutContext();

  const [clients, setClients] = useState<Client[]>([]);

  // Стани пошуку, фільтрації за статусом та сортування
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | ''>('');
  const [ordering, setOrdering] = useState<string>('-created_at');

  // Стани завантаження
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isFetchingClients, setIsFetchingClients] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Стан модального вікна (null = закрите; { mode: 'create' } або { mode: 'edit', client })
  const [modalState, setModalState] = useState<
    { mode: 'create' } | { mode: 'edit'; client: Client } | null
  >(null);

  // Завантаження списку клієнтів із урахуванням фільтрів та ORM-анотацій
  useEffect(() => {
    let isMounted = true;

    const fetchClients = async () => {
      setIsFetchingClients(true);
      try {
        const data = await getClients({
          search: debouncedSearch,
          status: statusFilter,
          ordering,
        });
        if (isMounted) {
          setClients(data);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('Не вдалося завантажити базу клієнтів.');
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
          setIsFetchingClients(false);
        }
      }
    };

    fetchClients();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, statusFilter, ordering]);

  // Швидка зміна статусу клієнта прямо в таблиці
  const handleStatusChange = async (clientId: number, nextStatus: ClientStatus) => {
    try {
      const updated = await updateClient(clientId, { status: nextStatus });
      setClients((prev) =>
        prev
          .map((item) =>
            item.id === clientId
              ? {
                  ...updated,
                  deals_count: updated.deals_count ?? item.deals_count,
                  won_amount: updated.won_amount ?? item.won_amount,
                }
              : item
          )
          .filter((item) => !statusFilter || item.status === statusFilter)
      );
    } catch {
      alert('Не вдалося оновити статус клієнта.');
    }
  };

  // Оновлення таблиці після створення або редагування у модальному вікні
  const handleClientSaved = (savedClient: Client, isNew: boolean) => {
    const matchesStatus = !statusFilter || savedClient.status === statusFilter;

    if (isNew) {
      if (matchesStatus) {
        setClients((prev) => [savedClient, ...prev]);
      }
      return;
    }

    setClients((prev) =>
      prev
        .map((item) =>
          item.id === savedClient.id
            ? {
                ...savedClient,
                deals_count: savedClient.deals_count ?? item.deals_count,
                won_amount: savedClient.won_amount ?? item.won_amount,
              }
            : item
        )
        .filter((item) => !statusFilter || item.status === statusFilter)
    );
  };

  const handleClientDeleted = (deletedClientId: number) => {
    setClients((prev) => prev.filter((item) => item.id !== deletedClientId));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setOrdering('-created_at');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || statusFilter || ordering !== '-created_at'
  );

  // Підрахунок зведених метрик по поточному списку клієнтів
  const activeClientsCount = clients.filter((c) => c.status === 'active').length;
  const totalClientsRevenue = clients.reduce(
    (sum, c) => sum + parseFloat(c.won_amount || '0'),
    0
  );

  return (
    <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Компактні KPI по базі контрагентів */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Контрагентів у вибірці</span>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {clients.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Активних клієнтів</span>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {activeClientsCount}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Закриті угоди клієнтів</span>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-emerald-700">
            ${totalClientsRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </section>

      {/* Заголовок розділу та кнопка додавання */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold text-slate-900">
            Клієнти
          </h1>
          <span className="text-xs text-slate-500">
            Знайдено записів: {clients.length}
          </span>
        </div>

        <button
          type="button"
          disabled={!currentUser}
          onClick={() => setModalState({ mode: 'create' })}
          className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          + Новий клієнт
        </button>
      </div>

      {/* Панель пошуку, фільтрації за статусом та сортування */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук за ім’ям, прізвищем, email або телефоном..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50/50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>

        <div className="relative sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ClientStatus | '')}
            className="w-full px-3 py-1.5 pr-8 text-sm bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:border-slate-400"
          >
            <option value="">Усі статуси</option>
            {Object.entries(CLIENT_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="relative sm:w-52">
          <select
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            className="w-full px-3 py-1.5 pr-8 text-sm bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:border-slate-400"
          >
            {CLIENT_ORDERING_OPTIONS.map((opt) => (
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

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-md transition-colors shrink-0"
          >
            Скинути
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Таблиця клієнтів */}
      {isInitialLoading ? (
        <div className="py-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-lg">
          Завантаження бази клієнтів...
        </div>
      ) : clients.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-lg">
          {hasActiveFilters
            ? 'За вказаними параметрами пошуку клієнтів не знайдено.'
            : 'База клієнтів порожня. Натисніть «+ Новий клієнт», щоб додати перший контакт.'}
        </div>
      ) : (
        <div
          className={`bg-white border border-slate-200 rounded-lg overflow-hidden transition-opacity duration-150 ${
            isFetchingClients ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Контрагент</th>
                <th className="py-3 px-4">Відповідальний</th>
                <th className="py-3 px-4">Угоди / Виручка</th>
                <th className="py-3 px-4 w-40 text-right">Статус</th>
                <th className="py-3 px-4 w-28 text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => {
                const statusCfg = CLIENT_STATUS_CONFIG[client.status] || CLIENT_STATUS_CONFIG.lead;
                const isOwnerDeactivated =
                  Boolean(client.responsible_manager) && client.manager_is_active === false;
                const dealsCount = client.deals_count ?? 0;
                const wonAmount = parseFloat(client.won_amount || '0');

                return (
                  <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {client.first_name} {client.last_name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>{client.email}</span>
                        {client.phone && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-[11px]">{client.phone}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs">
                      {client.manager_name ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-slate-700 font-medium">{client.manager_name}</span>
                          {isOwnerDeactivated && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded">
                              звільнений
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Не призначено</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono text-sm font-medium text-slate-900">
                        ${wonAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDealsCount(dealsCount)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-block relative">
                        <select
                          value={client.status}
                          onChange={(e) =>
                            handleStatusChange(client.id, e.target.value as ClientStatus)
                          }
                          className={`text-xs font-medium pl-2.5 pr-6 py-1 rounded border appearance-none cursor-pointer focus:outline-none focus:border-slate-400 transition-colors ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          {Object.entries(CLIENT_STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key} className="bg-white text-slate-800">
                              {config.label}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setModalState({ mode: 'edit', client })}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:border-slate-300 transition-colors"
                      >
                        Редагувати
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальне вікно створення або редагування клієнта */}
      {currentUser && modalState && (
        <ClientModal
          key={modalState.mode === 'edit' ? `edit-${modalState.client.id}` : 'create-client'}
          client={modalState.mode === 'edit' ? modalState.client : null}
          currentUser={currentUser}
          onClose={() => setModalState(null)}
          onClientSaved={handleClientSaved}
          onClientDeleted={handleClientDeleted}
        />
      )}
    </main>
  );
};