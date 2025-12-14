/**
 * Auth Module - Public API
 * Экспорт всех публичных функций модуля аутентификации
 */

export {
  register,
  login,
  logout,
  getCurrentUser,
  getAuthToken,
  isAuthenticated,
  hasRole,
  isGuide,
  isUser
} from './services/authService';

export { default as LoginPage } from './pages/LoginPage';
export { default as RegisterPage } from './pages/RegisterPage';
export { default as ProtectedRoute } from './components/ProtectedRoute';

