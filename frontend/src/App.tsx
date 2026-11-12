import { useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { isAuthenticated, logout } from './api/auth';

function App() {
  // Перевіряємо при старті: чи є вже збережений токен у localStorage
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(isAuthenticated());

  // Обробник успішної авторизації
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // Обробник виходу з системи
  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
  };

  // Якщо користувач не авторизований — показуємо екран логіну
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Якщо користувач залогінений — показуємо робочу область CRM
  return <DashboardPage onLogout={handleLogout} />;
}

export default App;