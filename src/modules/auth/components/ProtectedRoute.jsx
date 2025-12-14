/**
 * ProtectedRoute - Компонент для защиты маршрутов
 * Проверяет авторизацию и роль пользователя
 */

import { Navigate } from 'react-router-dom';
import { isAuthenticated, hasRole } from '../services/authService';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - Дочерние компоненты
 * @param {string} props.requiredRole - Требуемая роль (user/guide)
 * @param {string} props.redirectTo - Путь для редиректа при отсутствии доступа
 */
export default function ProtectedRoute({ 
  children, 
  requiredRole = null,
  redirectTo = '/login' 
}) {
  // Проверка авторизации
  if (!isAuthenticated()) {
    return <Navigate to={redirectTo} replace />;
  }

  // Проверка роли, если требуется
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

