import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { getCurrentUser, getCurrentUsername } from '../api/auth';
import type { LayoutContext } from '../hooks/useLayoutContext';
import type { User } from '../types';
import { TeamModal } from './TeamModal';

interface LayoutProps {
  onLogout: () => void;
}

export const Layout = ({ onLogout }: LayoutProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        if (isMounted) {
          setCurrentUser(userData);
        }
      } catch {
        // Перехоплювач Axios автоматично виконає редірект при простроченому токені
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayUsername = currentUser?.username || getCurrentUsername();
  const isAdmin = Boolean(currentUser?.is_staff || currentUser?.is_superuser);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
      isActive
        ? 'bg-slate-100 text-slate-900'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
      {/* Спільна верхня панель навігації */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink
              to="/deals"
              className="font-semibold tracking-tight text-slate-900 text-base"
            >
              Workspace CRM
            </NavLink>

            <nav className="flex items-center gap-1">
              <NavLink to="/deals" className={navLinkClass}>
                Угоди
              </NavLink>
              <NavLink to="/clients" className={navLinkClass}>
                Клієнти
              </NavLink>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
                >
                  Команда
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isAdmin ? 'bg-indigo-600' : 'bg-emerald-500'
                }`}
              />
              <span className="text-xs font-semibold text-slate-800">
                {displayUsername}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {isAdmin ? 'Адміністратор' : 'Менеджер'}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={onLogout}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Вийти
            </button>
          </div>
        </div>
      </header>

      {/* Вміст поточної сторінки (/deals або /clients) */}
      <Outlet context={{ currentUser } satisfies LayoutContext} />

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