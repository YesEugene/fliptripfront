/**
 * ProtectedRoute - Компонент для защиты маршрутов
 * Проверяет авторизацию и роль пользователя
 */

import { Navigate } from 'react-router-dom';
import { isAuthenticated, hasRole } from '../services/authService';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - Дочерние компоненты
 * @param {string|string[]} props.requiredRole - Требуемая роль (user/guide/admin) или массив ролей
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
  if (requiredRole) {
    // Если requiredRole - массив, проверяем, есть ли хотя бы одна роль
    if (Array.isArray(requiredRole)) {
      const hasAnyRole = requiredRole.some(role => hasRole(role));
      if (!hasAnyRole) {
        return <Navigate to="/" replace />;
      }
    } else {
      // Если requiredRole - строка, проверяем как раньше
      if (!hasRole(requiredRole)) {
        return <Navigate to="/" replace />;
      }
    }
  }

  return children;
}

