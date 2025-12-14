/**
 * Guide Profile Service
 * Service for managing guide profile data
 */

// Автоматическое определение API URL
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.PROD) {
    return 'https://fliptripbackend.vercel.app';
  }
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Получение токена авторизации
 */
function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Получение профиля гида
 * @returns {Promise<Object>} - Данные профиля гида
 */
export async function getGuideProfile() {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authorization required');
    }

    const response = await fetch(`${API_BASE_URL}/api/guide-profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        // Profile doesn't exist yet, return null
        return null;
      }
      throw new Error(data.message || 'Error loading profile');
    }

    return data.profile;
  } catch (error) {
    console.error('Get guide profile error:', error);
    throw error;
  }
}

/**
 * Обновление профиля гида
 * @param {Object} profileData - Данные профиля
 * @returns {Promise<Object>} - Обновленный профиль
 */
export async function updateGuideProfile(profileData) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authorization required');
    }

    const response = await fetch(`${API_BASE_URL}/api/guide-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error updating profile');
    }

    return data;
  } catch (error) {
    console.error('Update guide profile error:', error);
    throw error;
  }
}

