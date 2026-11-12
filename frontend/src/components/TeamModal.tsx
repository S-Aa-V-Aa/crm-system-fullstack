import { useState, useEffect, type SyntheticEvent } from 'react';
import axios from 'axios';
import { getUsers, createUser } from '../api/auth';
import type { User } from '../types';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamModal = ({ isOpen, onClose }: TeamModalProps) => {
  // Список активних працівників із бази даних
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  // Поля форми реєстрації нового працівника (CreateUserSerializer)
  const [username, setUsername] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isStaff, setIsStaff] = useState<boolean>(false);

  // Стан відправки та повідомлень
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Завантаження актуального списку працівників при відкритті вікна
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const fetchTeam = async () => {
      setIsLoadingUsers(true);
      setError(null);
      try {
        const data = await getUsers();
        if (isMounted) {
          setUsers(data);
        }
      } catch {
        if (isMounted) {
          setError('Не вдалося завантажити список працівників.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    };

    fetchTeam();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Закриття вікна клавішею Escape
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

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setError('Пароль повинен містити щонайменше 6 символів.');
      return;
    }

    setIsSubmitting(true);

    try {
      const createdUser = await createUser({
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
        is_staff: isStaff,
      });

      // Оновлюємо локальний список працівників без повторного запиту до сервера
      setUsers((prevUsers) => [...prevUsers, createdUser]);

      // Очищаємо поля форми для можливості додати ще одного працівника
      setUsername('');
      setFirstName('');
      setLastName('');
      setPassword('');
      setIsStaff(false);
      setSuccessMessage(`Працівника «${createdUser.username}» успішно зареєстровано.`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as Record<string, string[] | string>;
        if (Array.isArray(data.username)) {
          setError('Користувач із таким логіном уже існує.');
        } else if (Array.isArray(data.password)) {
          setError(data.password[0]);
        } else if (typeof data.detail === 'string') {
          setError(data.detail);
        } else {
          setError('Помилка валідації даних працівника.');
        }
      } else {
        setError('Помилка з\'єднання із сервером.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка вікна */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Команда та права доступу
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Реєстрація нових менеджерів і адміністраторів системи
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 text-sm font-medium px-1.5 py-0.5 rounded transition-colors"
            aria-label="Закрити"
          >
            Esc
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Форма створення працівника */}
          <form onSubmit={handleSubmit} className="p-4 bg-slate-50/75 border border-slate-200 rounded-lg space-y-4">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Новий обліковий запис
            </span>

            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                {successMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Логін для входу *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="manager_andriy"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Тимчасовий пароль *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Мінімум 6 символів"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ім'я
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Андрій"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Прізвище
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Мельник"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Роль у системі
                </label>
                <div className="relative">
                  <select
                    value={isStaff ? 'admin' : 'manager'}
                    onChange={(e) => setIsStaff(e.target.value === 'admin')}
                    className="w-full px-3 py-1.5 pr-8 text-sm bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:border-slate-400"
                  >
                    <option value="manager">Менеджер (тільки свої)</option>
                    <option value="admin">Адміністратор (повний доступ)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Реєстрація...' : 'Додати працівника'}
              </button>
            </div>
          </form>

          {/* Таблиця поточних працівників */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Активні працівники ({users.length})
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {isLoadingUsers ? (
                <div className="p-4 text-xs text-slate-500">Завантаження списку...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-4">Логін</th>
                      <th className="py-2.5 px-4">Ім'я та прізвище</th>
                      <th className="py-2.5 px-4 text-right">Роль</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {users.map((user) => {
                      const adminRole = user.is_staff || user.is_superuser;
                      const fullName = `${user.first_name} ${user.last_name}`.trim();

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {user.username}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            {fullName || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                adminRole
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {adminRole ? 'Адміністратор' : 'Менеджер'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};