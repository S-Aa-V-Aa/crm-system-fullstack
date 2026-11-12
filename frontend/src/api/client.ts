import axios from 'axios';

// Базова адреса нашого Django REST Framework API
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Створення єдиного екземпляра Axios (Singleton Instance)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд на відповідь, після чого запит переривається
});

// 1. Request Interceptor: виконується ПЕРЕД відправкою запиту на сервер
apiClient.interceptors.request.use(
  (config) => {
    // Шукаємо збережений access-токен у сховищі браузера
    const accessToken = localStorage.getItem('access_token');
    
    // Якщо токен є, прикріплюємо його в стандартизований заголовок Authorization
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response Interceptor: перехоплює відповіді ПЕРЕД тим, як вони потраплять у компоненти
apiClient.interceptors.response.use(
  (response) => {
    // Якщо відповідь успішна (статус 200-299), просто повертаємо її далі
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Перевіряємо: якщо сервер відповів 401 Unauthorized і цей запит ще не повторювався
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Ставимо прапорець, щоб не зациклити спроби

      const refreshToken = localStorage.getItem('refresh_token');

      // Якщо рефреш-токен є в браузері, спробуємо оновити сесію
      if (refreshToken) {
        try {
          // Робимо запит через "чистий" axios, щоб не зачепити інтерцептори клієнта
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;

          // Зберігаємо новий токен у браузері
          localStorage.setItem('access_token', newAccessToken);

          // Оновлюємо заголовок у початковому запиті та виконуємо його повторно
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Якщо refresh-токен прострочений або недійсний — сесія повністю вичерпана
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // Рефреш-токена взагалі немає — перенаправляємо на авторизацію
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;