/**
 * Auth Module - Service Layer
 * Управление аутентификацией и авторизацией
 */

// Автоматическое определение API URL
const getApiBaseUrl = () => {
  // Приоритет: переменные окружения > продакшн URL > локальный
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.replace('/api', '');
    console.log('[AuthService] Using VITE_API_URL:', url);
    return url;
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('[AuthService] Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.PROD) {
    const prodUrl = 'https://fliptripbackend.vercel.app';
    console.log('[AuthService] Using PROD URL:', prodUrl);
    return prodUrl;
  }
  const devUrl = 'http://localhost:3000';
  console.log('[AuthService] Using DEV URL:', devUrl);
  return devUrl;
};

const API_BASE_URL = getApiBaseUrl();
console.log('[AuthService] Final API_BASE_URL:', API_BASE_URL);

/**
 * Регистрация нового пользователя
 * @param {Object} userData - Данные пользователя
 * @param {string} userData.email - Email
 * @param {string} userData.password - Пароль
 * @param {string} userData.name - Имя
 * @param {string} userData.role - Роль (user/guide)
 * @returns {Promise<Object>} - Данные пользователя и токен
 */
export async function register(userData) {
  try {
    const url = `${API_BASE_URL}/api/auth-register`;
    console.log('[AuthService] Register URL:', url);
    console.log('[AuthService] API_BASE_URL:', API_BASE_URL);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Registration failed');
    }
    
    // Сохраняем токен в localStorage
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Вход пользователя
 * @param {string} email - Email
 * @param {string} password - Пароль
 * @returns {Promise<Object>} - Данные пользователя и токен
 */
export async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Сохраняем токен в localStorage
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Выход пользователя
 */
export function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

/**
 * Получение текущего пользователя из localStorage
 * @returns {Object|null} - Данные пользователя или null
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Получение текущего пользователя с сервера
 * @returns {Promise<Object|null>} - Данные пользователя или null
 */
export async function fetchCurrentUser() {
  try {
    const token = getAuthToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/api/auth-me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Токен невалиден, очищаем localStorage
      logout();
      return null;
    }

    // Обновляем данные пользователя в localStorage
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data.user;
  } catch (error) {
    console.error('Fetch current user error:', error);
    return null;
  }
}

/**
 * Получение токена авторизации
 * @returns {string|null} - Токен или null
 */
export function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Проверка авторизации
 * @returns {boolean} - true если пользователь авторизован
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Проверка роли пользователя
 * @param {string} role - Роль для проверки (user/guide)
 * @returns {boolean} - true если пользователь имеет эту роль
 */
export function hasRole(role) {
  const user = getCurrentUser();
  return user?.role === role;
}

/**
 * Проверка, является ли пользователь гидом
 * @returns {boolean}
 */
export function isGuide() {
  return hasRole('guide');
}

/**
 * Проверка, является ли пользователь обычным пользователем
 * @returns {boolean}
 */
export function isUser() {
  return hasRole('user');
}

