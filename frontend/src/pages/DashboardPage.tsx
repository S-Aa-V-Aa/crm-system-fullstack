import { useState, useEffect } from 'react';
import { getDeals, updateDealStage } from '../api/crm';
import { getCurrentUser, getCurrentUsername } from '../api/auth';
import type { Deal, DealStage, User } from '../types';
import { CreateDealModal } from '../components/CreateDealModal';
import { TeamModal } from '../components/TeamModal';

interface DashboardPageProps {
  onLogout: () => void;
}

// Конфігурація бізнес-статусів без кислотних кольорів
const STAGE_CONFIG: Record<DealStage, { label: string; bg: string; text: string; border: string }> = {
  new: { label: 'Нова', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  proposal: { label: 'Пропозиція', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  negotiation: { label: 'Переговори', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  won: { label: 'Виграно', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  lost: { label: 'Втрачено', bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200' },
};

export const DashboardPage = ({ onLogout }: DashboardPageProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Стани відкриття модальних вікон
  const [isCreateDealOpen, setIsCreateDealOpen] = useState<boolean>(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);

  // Паралельне завантаження профілю користувача та списку угод
  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const [dealsData, userData] = await Promise.all([
          getDeals(),
          getCurrentUser(),
        ]);

        if (isMounted) {
          setDeals(dealsData);
          setCurrentUser(userData);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('Не вдалося завантажити дані. Перевірте з\'єднання із сервером.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Оновлення статусу угоди прямо в таблиці
  const handleStageChange = async (dealId: number, nextStage: DealStage) => {
    try {
      const updated = await updateDealStage(dealId, nextStage);
      setDeals((prev) => prev.map((item) => (item.id === dealId ? updated : item)));
    } catch {
      alert('Не вдалося зберегти зміни. Спробуйте пізніше.');
    }
  };

  // Додавання нової угоди на початок списку без перезавантаження сторінки
  const handleDealCreated = (newDeal: Deal) => {
    setDeals((prev) => [newDeal, ...prev]);
  };

  // Визначення ролі на основі реальних прав із бекенду (/api/me/)
  const displayUsername = currentUser?.username || getCurrentUsername();
  const isAdmin = Boolean(currentUser?.is_staff || currentUser?.is_superuser);

  // Розрахунок реальних бізнес-метрик
  const activeDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
  const pipelineSum = activeDeals.reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0);
  const wonSum = deals
    .filter((d) => d.stage === 'won')
    .reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
      {/* 1. Верхня панель (Topbar) */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold tracking-tight text-slate-900 text-base">
              Workspace CRM
            </span>

            {/* Кнопка управління командою відображається лише адміністратору */}
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
        {/* Блок ключових показників (KPI) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-500">Угоди в роботі</span>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {activeDeals.length}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-500">Сума в роботі</span>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              ${pipelineSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-500">Успішно закрито</span>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-emerald-700">
              ${wonSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
              Всього позицій: {deals.length}
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

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Таблиця угод */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-lg">
            Оновлення даних...
          </div>
        ) : deals.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-lg">
            Список порожній. Натисніть «+ Нова угода», щоб додати перший запис.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Назва</th>
                  <th className="py-3 px-4">Клієнт</th>
                  <th className="py-3 px-4">Сума</th>
                  <th className="py-3 px-4 w-48 text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.map((deal) => {
                  const stage = STAGE_CONFIG[deal.stage] || STAGE_CONFIG.new;
                  return (
                    <tr key={deal.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {deal.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {deal.client_name || `Клієнт #${deal.client}`}
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

      {/* Модальне вікно управління командою (тільки для адміністратора) */}
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