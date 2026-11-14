import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { isAuthenticated, logout } from './api/auth';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(isAuthenticated());

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Публічний маршрут входу */}
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/deals" replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Захищені приватні маршрути CRM */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/deals" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
          </Route>
        </Route>

        {/* Редірект із кореневої адреси та невідомих URL */}
        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? '/deals' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;