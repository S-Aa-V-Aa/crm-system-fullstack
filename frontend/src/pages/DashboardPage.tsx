import { useState, useEffect, useCallback } from 'react';
import { getDeals, getDealStats, updateDealStage } from '../api/crm';
import { getCurrentUser, getCurrentUsername } from '../api/auth';
import { useDebounce } from '../hooks/useDebounce';
import type { Deal, DealStage, DealStats, User } from '../types';
import { CreateDealModal } from '../components/CreateDealModal';
import { EditDealModal } from '../components/EditDealModal';
import { TeamModal } from '../components/TeamModal';

interface DashboardPageProps {
  onLogout: () => void;
}

const STAGE_CONFIG: Record<DealStage, { label: string; bg: string; text: string; border: string }> = {
  new: { label: 'Нова', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  proposal: { label: 'Пропозиція', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  negotiation: { label: 'Переговори', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  won: { label: 'Виграно', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  lost: { label: 'Втрачено', bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200' },
};

const ORDERING_OPTIONS = [
  { value: '-created_at', label: 'Спочатку нові' },
  { value: 'created_at', label: 'Спочатку старі' },
  { value: '-amount', label: 'Сума: за спаданням' },
  { value: 'amount', label: 'Сума: за зростанням' },
];

export const DashboardPage = ({ onLogout }: DashboardPageProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<DealStats>({
    active_count: 0,
    pipeline_sum: '0.00',
    won_sum: '0.00',
  });

  // Стани пошуку, фільтрації та сортування
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [stageFilter, setStageFilter] = useState<DealStage | ''>('');
  const [ordering, setOrdering] = useState<string>('-created_at');

  // Стани завантаження: первинний і фонове оновлення при фільтрації
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isFetchingDeals, setIsFetchingDeals] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Стани модальних вікон
  const [isCreateDealOpen, setIsCreateDealOpen] = useState<boolean>(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);

  // Функція для оновлення серверних KPI після будь-якої зміни угод
  const refreshStats = useCallback(async () => {
    try {
      const freshStats = await getDealStats();
      setStats(freshStats);
    } catch {
      // Ігноруємо фонову помилку оновлення статистики, якщо основні дані завантажені
    }
  }, []);

  // 1. Завантаження профілю та початкової статистики
  useEffect(() => {
    let isMounted = true;

    const loadProfileAndStats = async () => {
      try {
        const [userData, statsData] = await Promise.all([
          getCurrentUser(),
          getDealStats(),
        ]);
        if (isMounted) {
          setCurrentUser(userData);
          setStats(statsData);
        }
      } catch {
        if (isMounted) {
          setError('Не вдалося завантажити дані профілю. Перевірте з\'єднання із сервером.');
        }
      }
    };

    loadProfileAndStats();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Завантаження списку угод при першому відкритті та при зміні фільтрів/пошуку
  useEffect(() => {
    let isMounted = true;

    const fetchFilteredDeals = async () => {
      setIsFetchingDeals(true);
      try {
        const dealsData = await getDeals({
          search: debouncedSearch,
          stage: stageFilter,
          ordering,
        });
        if (isMounted) {
          setDeals(dealsData);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('Не вдалося завантажити список угод.');
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
          setIsFetchingDeals(false);
        }
      }
    };

    fetchFilteredDeals();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, stageFilter, ordering]);

  const handleStageChange = async (dealId: number, nextStage: DealStage) => {
    try {
      const updated = await updateDealStage(dealId, nextStage);
      setDeals((prev) =>
        prev
          .map((item) => (item.id === dealId ? updated : item))
          // Якщо увімкнено фільтр за конкретним етапом і статус змінився — прибираємо рядок зі списку
          .filter((item) => !stageFilter || item.stage === stageFilter)
      );
      await refreshStats();
    } catch {
      alert('Не вдалося зберегти зміни. Спробуйте пізніше.');
    }
  };

  const handleDealCreated = async (newDeal: Deal) => {
    const matchesStage = !stageFilter || newDeal.stage === stageFilter;
    if (matchesStage) {
      setDeals((prev) => [newDeal, ...prev]);
    }
    await refreshStats();
  };

  const handleDealUpdated = async (updatedDeal: Deal) => {
    setDeals((prev) =>
      prev
        .map((item) => {
          if (item.id === updatedDeal.id) {
            return updatedDeal;
          }
          if (item.client === updatedDeal.client) {
            return {
              ...item,
              responsible_manager: updatedDeal.responsible_manager,
              manager_name: updatedDeal.manager_name,
              manager_is_active: updatedDeal.manager_is_active,
            };
          }
          return item;
        })
        .filter((item) => !stageFilter || item.stage === stageFilter)
    );
    await refreshStats();
  };

  const handleDealDeleted = async (deletedDealId: number) => {
    setDeals((prev) => prev.filter((item) => item.id !== deletedDealId));
    await refreshStats();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStageFilter('');
    setOrdering('-created_at');
  };

  const hasActiveFilters = Boolean(searchQuery.trim() || stageFilter || ordering !== '-created_at');
  const displayUsername = currentUser?.username || getCurrentUsername();
  const isAdmin = Boolean(currentUser?.is_staff || currentUser?.is_superuser);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
      {/* 1. Верхня панель (Topbar) */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold tracking-tight text-slate-900 text-base">
              Workspace CRM
            </span>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(true)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                Команда
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-indigo-600' : 'bg-emerald-500'}`} />
              <span className="text-xs font-semibold text-slate-800">
                {displayUsername}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {isAdmin ? 'Адміністратор' : 'Менеджер'}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <button
              onClick={onLogout}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Вийти
            </button>
          </div>
        </div>
      </header>

      {/* 2. Основна робоча область */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Блок ключових показників (KPI з серверної агрегації) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-500">Угоди в роботі</span>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {stats.active_count}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-500">Сума в роботі</span>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              ${parseFloat(stats.pipeline_sum).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-500">Успішно закрито</span>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-emerald-700">
              ${parseFloat(stats.won_sum).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </section>

        {/* Заголовок розділу таблиці та кнопка створення */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold text-slate-900">
              Угоди
            </h1>
            <span className="text-xs text-slate-500">
              Знайдено позицій: {deals.length}
            </span>
          </div>

          <button
            type="button"
            disabled={!currentUser}
            onClick={() => setIsCreateDealOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            + Нова угода
          </button>
        </div>

        {/* Панель пошуку, фільтрації за етапом та сортування */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Поле пошуку */}
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
              placeholder="Пошук за назвою угоди, клієнтом або email..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50/50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          {/* Фільтр за етапом воронки */}
          <div className="relative sm:w-44">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as DealStage | '')}
              className="w-full px-3 py-1.5 pr-8 text-sm bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:border-slate-400"
            >
              <option value="">Усі етапи</option>
              {Object.entries(STAGE_CONFIG).map(([key, config]) => (
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

          {/* Сортування */}
          <div className="relative sm:w-48">
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="w-full px-3 py-1.5 pr-8 text-sm bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:border-slate-400"
            >
              {ORDERING_OPTIONS.map((opt) => (
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

          {/* Кнопка скидання активних фільтрів */}
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

        {/* Таблиця угод */}
        {isInitialLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-lg">
            Оновлення даних...
          </div>
        ) : deals.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-lg">
            {hasActiveFilters
              ? 'За вказаними параметрами пошуку угод не знайдено.'
              : 'Список порожній. Натисніть «+ Нова угода», щоб додати перший запис.'}
          </div>
        ) : (
          <div
            className={`bg-white border border-slate-200 rounded-lg overflow-hidden transition-opacity duration-150 ${
              isFetchingDeals ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Назва</th>
                  <th className="py-3 px-4">Клієнт</th>
                  <th className="py-3 px-4">Відповідальний</th>
                  <th className="py-3 px-4">Сума</th>
                  <th className="py-3 px-4 w-44 text-right">Статус</th>
                  <th className="py-3 px-4 w-28 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.map((deal) => {
                  const stage = STAGE_CONFIG[deal.stage] || STAGE_CONFIG.new;
                  const isOwnerDeactivated =
                    Boolean(deal.responsible_manager) && deal.manager_is_active === false;

                  return (
                    <tr key={deal.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {deal.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {deal.client_name || `Клієнт #${deal.client}`}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {deal.manager_name ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-slate-700 font-medium">{deal.manager_name}</span>
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
                      <td className="py-3 px-4 font-mono text-slate-900 font-medium">
                        ${parseFloat(deal.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-block relative">
                          <select
                            value={deal.stage}
                            onChange={(e) => handleStageChange(deal.id, e.target.value as DealStage)}
                            className={`text-xs font-medium pl-2.5 pr-6 py-1 rounded border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors ${stage.bg} ${stage.text} ${stage.border}`}
                          >
                            {Object.entries(STAGE_CONFIG).map(([key, config]) => (
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
                          onClick={() => setEditingDeal(deal)}
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
      </main>

      {/* Модальне вікно створення угоди */}
      {currentUser && (
        <CreateDealModal
          isOpen={isCreateDealOpen}
          currentUser={currentUser}
          onClose={() => setIsCreateDealOpen(false)}
          onDealCreated={handleDealCreated}
        />
      )}

      {/* Модальне вікно редагування, перепризначення та видалення угоди */}
      {currentUser && editingDeal && (
        <EditDealModal
          key={editingDeal.id}
          deal={editingDeal}
          currentUser={currentUser}
          onClose={() => setEditingDeal(null)}
          onDealUpdated={handleDealUpdated}
          onDealDeleted={handleDealDeleted}
        />
      )}

      {/* Модальне вікно управління командою */}
      {isAdmin && currentUser && (
        <TeamModal
          isOpen={isTeamModalOpen}
          currentUser={currentUser}
          onClose={() => setIsTeamModalOpen(false)}
        />
      )}
    </div>
  );
};